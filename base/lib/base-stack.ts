import { Stack, StackProps, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as efs from 'aws-cdk-lib/aws-efs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as logs from 'aws-cdk-lib/aws-logs'

import { Construct } from 'constructs';

export class BaseStack extends Stack {
  public readonly vpc: ec2.Vpc;

  public readonly efs: efs.FileSystem;
  
  public readonly efsSg: ec2.SecurityGroup;
  public readonly ciSg: ec2.SecurityGroup;
  
  public readonly cracCheckpointsS3: s3.Bucket;
  
  constructor(scope: Construct, id: string, props: StackProps) { 
    super(scope, id, props);
    
    //create VPC
    this.vpc = new ec2.Vpc(this, 'EksCracVpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16')
    });
    new CfnOutput(this, 'VpcId', { value: this.vpc.vpcId});
    new CfnOutput(this, 'VpcPrivateSubnetIds', { value: this.vpc.selectSubnets({subnetType:ec2.SubnetType.PRIVATE_WITH_EGRESS}).subnetIds.toString()});
    
    //enable VPC flow logs
    const logGroup = new logs.LogGroup(this, 'VpcFlowLogsGroup');
    const role = new iam.Role(this, 'MyCustomRole', {
        assumedBy: new iam.ServicePrincipal('vpc-flow-logs.amazonaws.com')
      });

    new ec2.FlowLog(this, 'FlowLog', {
      resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
      destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup, role)
    });
    
    //create EFS security group
    this.efsSg = new ec2.SecurityGroup(this, 'EfsSg', {
      vpc: this.vpc,
    });
    this.efsSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(2049), ''); //to be narrowed down later to allow CI and EKS only
    
    //create EFS file system
    this.efs = new efs.FileSystem(this, 'crac-checkpoints-efs', {
      fileSystemName: 'crac-checkpoints',
      vpc: this.vpc,
      securityGroup: this.efsSg,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      removalPolicy: RemovalPolicy.DESTROY,
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS, // files are not transitioned to infrequent access (IA) storage by default
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE, // default
      outOfInfrequentAccessPolicy: efs.OutOfInfrequentAccessPolicy.AFTER_1_ACCESS, // files are not transitioned back from (infrequent access) IA to primary storage by default
      fileSystemPolicy: new iam.PolicyDocument()
    });
    this.efs.addToResourcePolicy(new iam.PolicyStatement({
        principals: [new iam.AnyPrincipal()],
        actions: ['elasticfilesystem:ClientRootAccess', 'elasticfilesystem:ClientWrite', 'elasticfilesystem:ClientMount'],
        resources: ['*'],
        conditions: {
          "Bool": {
            "elasticfilesystem:AccessedViaMountTarget": "true"
          }
        }
      }));

    new CfnOutput(this, 'CracCheckpointsFileSystemId', { value: this.efs.fileSystemId});
    new CfnOutput(this, 'CracCheckpointsFileSystemDns', { value: this.efs.fileSystemId + '.efs.' + process.env.CDK_DEFAULT_REGION + '.amazonaws.com'});
    
    //create CI security group
    this.ciSg = new ec2.SecurityGroup(this, 'CiSg', {
      vpc: this.vpc,
    });
    new CfnOutput(this, 'CiSgId', { value: this.ciSg.securityGroupId});
    
    //create S3 bucket for access logs
    const accessLogsS3 = new s3.Bucket(this, 'access-logs-s3bucket', {
      bucketName: 'crac-accesslogs-' + process.env.CDK_DEFAULT_ACCOUNT,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true

    });
    
  }
}
