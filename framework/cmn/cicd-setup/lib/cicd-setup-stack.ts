import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineactions from 'aws-cdk-lib/aws-codepipeline-actions';

export class CicdSetupStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // get service name for this cicd setup
    const serviceName = this.node.tryGetContext('service-name');

    // get vpc ids, used to configure build image  
    const vpcId = this.node.tryGetContext('vpc-id');

    // get subnet ids , used to configure build image  
    const subnetIds = this.node.tryGetContext('subnet-ids').split(',');

    // get security group id
    const securityGroupId = this.node.tryGetContext('security-group-id');

    // Creates a CodeCommit repository for serviceName 
    const serviceNameCodeRepo = new codecommit.Repository(this, serviceName + "-codecommit", {      
      repositoryName: serviceName
    });

    // Create an ECR repository to store docker image from build 
    const ecrRepo = new ecr.Repository(this, serviceName + "-ecr", {
      repositoryName: serviceName,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    // Create an S3 bucket to store artifacts
    const artifactBucket = new s3.Bucket(this, serviceName + '-artifacts-' + props?.env?.account, {
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // S3 Bucket policy to deny unencrypted uploads
    artifactBucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.DENY,
      actions: ['s3:PutObject'],
      principals: [new iam.AnyPrincipal()],
      resources: [
        artifactBucket.bucketArn,
        artifactBucket.arnForObjects('*')
      ],
      conditions: {
        StringNotEquals: {
          's3:x-amz-server-side-encryption': 'aws:kms'
        }
      }
    }));

    // S3 Bucket policy to deny insecure connections
    artifactBucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.DENY,
      actions: ['s3:*'],
      principals: [new iam.AnyPrincipal()],
      resources: [
        artifactBucket.bucketArn,
        artifactBucket.arnForObjects('*')
      ],
      conditions: {
        Bool: {
          'aws:SecureTransport': 'false'
        }
      }
    }));

    // Create S3 bucket for access logs, to track access on CRaC files
    const accessLogsS3 = new s3.Bucket(this, 'access-logs-s3bucket-' + props?.env?.account, {
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    
    // Create an S3 bucket to store CRaC files
    const cracCheckpointsS3 = new s3.Bucket(this, serviceName + 'crac-checkpoints-' + props?.env?.account, {
      serverAccessLogsBucket: accessLogsS3,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    
    // codebuild role
    const codeBuildRole = new iam.Role(this, serviceName + '-ci-codebuild-role"', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
    });

    // IAM policy for codebuild role to allow CreateLogGroup
    codeBuildRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'],
      resources: [
        `arn:aws:logs:${props?.env?.region}:${props?.env?.account}:log-group:/aws/codebuild/${serviceName.valueAsString}-Ci`,
        `arn:aws:logs:${props?.env?.region}:${props?.env?.account}:log-group:/aws/codebuild/${serviceName.valueAsString}-Ci:*`
      ]
    }));
    // IAM policy for codebuild role to GetAuthorizationToken for ECR
    codeBuildRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecr:GetAuthorizationToken'
      ],
      resources: [`*`]
    }));
    // IAM policy for codebuild role to update images on ECR
    codeBuildRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecr:DescribeRepositories',
        'ecr:InitiateLayerUpload',
        'ecr:UploadLayerPart',
        'ecr:CompleteLayerUpload',
        'ecr:BatchCheckLayerAvailability',
        'ecr:PutImage'],
      resources: [ecrRepo.repositoryArn]
    }));
    // IAM policy for codebuild role to allow access to S3 bucket
    codeBuildRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:DeleteObject',
        's3:GetBucketLocation',
        's3:GetObject',
        's3:ListBucket',
        's3:PutObject'
      ],
      resources: [
        cracCheckpointsS3.bucketArn,
        cracCheckpointsS3.arnForObjects('*'),
        artifactBucket.bucketArn,
        artifactBucket.arnForObjects('*')
      ]
    }));

    // resolve vpc from vpc-id, used to run codebuild image in order to access efs endpoints
    const vpcForCi = ec2.Vpc.fromLookup(this, 'vpc-for-ci',{
      vpcId: vpcId,
      isDefault: false
    });

    // resolve subnets from subnet-ids provided, used to run codebuild image in order to access efs endpoints
    const subnetsForCi = subnetIds.map((subnet: string, index: number) => {
      return ec2.Subnet.fromSubnetId(this, 'ci-subnet-' + index, subnet);
    })

    // resolve security group
    const securityGroupForCi = ec2.SecurityGroup.fromSecurityGroupId(this, 'ci-security-group', securityGroupId);

    // CodeBuild project to build serviceName  
    const codeBuildProjectForService = new codebuild.Project(this, serviceName + '-ci', {
      role: codeBuildRole,
      source: codebuild.Source.codeCommit({ repository: serviceNameCodeRepo }),
      logging: {
        cloudWatch: {
          logGroup: new cdk.aws_logs.LogGroup(this, serviceName + '-ci-log-group', {
            logGroupName: serviceName + '-ci-log-group',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            retention: cdk.aws_logs.RetentionDays.ONE_WEEK
          }),
          enabled: true,
        }
      },
      vpc: vpcForCi,
      subnetSelection: {
        subnets: subnetsForCi
      },
      securityGroups: [securityGroupForCi],
      // fileSystemLocations: [
      //   codebuild.FileSystemLocation.efs({
      //     identifier: 'efs',
      //     location: cracCheckpointsS3.fileSystemArn,
      //     mountPoint: '/mnt/efs',
      //   })
      // ],
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
        computeType: codebuild.ComputeType.SMALL,
        environmentVariables: {
          SRVC_NAME: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: serviceName
          },
          AWS_ACCOUNT_ID: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: props?.env?.account
          },
          CRAC_CHECKPOINTS_BUCKET: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: cracCheckpointsS3.bucketName
          },
        },
      }
    });

    // create iam role for codepipeline to start build
    const codePipelineRole = new iam.Role(this, serviceName + '-codepipeline-role', {
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com')
    });

    //IAM Policy for codePipelineRole to allow access to codecommit repo
    codePipelineRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'codecommit:GetBranch',
        'codecommit:GetCommit',
        'codecommit:UploadArchive',
        'codecommit:GetUploadArchiveStatus',
        'codecommit:CancelUploadArchive'
      ],
      resources: [serviceNameCodeRepo.repositoryArn]
    }));

    // IAM Policy for codePipelineRole to allow access to codebuild project
    codePipelineRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'codebuild:BatchGetBuilds',
        'codebuild:StartBuild'
      ],
      resources: [codeBuildProjectForService.projectArn]
    }));

    //IAM Policy for codePipelineRole to allow access to artifact bucket
    codePipelineRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:GetObjectVersion',
        's3:GetBucketVersioning',
        's3:PutObject'
      ],
      resources: [artifactBucket.bucketArn, artifactBucket.arnForObjects('*')]
    }));    
    
    // Create codepipeline to build codeBuildProjectForService when a new commit is pushed to main
    const codePipeline = new codepipeline.Pipeline(this, serviceName + '-codepipeline', {
      pipelineName: serviceName,
      role: codePipelineRole,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipelineactions.CodeCommitSourceAction({
              actionName: 'SourceAction',
              repository: serviceNameCodeRepo,
              branch: 'main',
              output: new codepipeline.Artifact(serviceName + '-source-output'),
              runOrder: 1,
              trigger: codepipelineactions.CodeCommitTrigger.EVENTS,
            })
          ]
        },
        {
          stageName: 'Build',
          actions: [
            new codepipelineactions.CodeBuildAction({
              actionName: 'BuildAction',
              project: codeBuildProjectForService,
              input: new codepipeline.Artifact(serviceName + '-source-output'),
              runOrder: 1
            })
          ]
        }
      ],
      artifactBucket: artifactBucket
    });

    // CloudFormation Output of codebuild role ARN.
    // This role must be allowed to assume another IAM role specifying the services required by your application. It is used to inject credentials to the docker image.
    new cdk.CfnOutput(this, serviceName + 'CodeBuildRoleArn', {
      value: codeBuildRole.roleArn,
    });

  }
}