import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class SpringDemoInfra extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // get CodeBuild roleArn to grant access to required infra during build
    const codeBuildRoleArn = this.node.tryGetContext('code-build-role-arn');

    // Create DynamoDB Table Customer
    const customerTable = new dynamodb.Table(this, 'Customer', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.DEFAULT,
      pointInTimeRecovery: true,
      readCapacity: 5,
      writeCapacity: 5
    });


    // Role to allow docker image running inside codebuild to access dynamodb table needed by the demo service
    // TODO: Provide a better name for this role. This can create confusion between the role created for CodeBuild, and that is needed by docker inside codebuild.
    const springdemoIntegrationRole = new iam.Role(this,  'springdemo-integration-role"', {
      // need to provide codebuild role name here.
      assumedBy: new iam.ArnPrincipal(codeBuildRoleArn)
    });

    // IAM policy for springdemo-integration-role role to allow PutItem, GetItem and Scan on DynamoDB table Customer
    springdemoIntegrationRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:PutItem',
        'dynamodb:GetItem',
        'dynamodb:Scan'],
      resources: [customerTable.tableArn]
    }));

    new cdk.CfnOutput(this, 'SpringDemoIntegrationBuildRole', {
      value: springdemoIntegrationRole.roleArn,
    });

  }
}
