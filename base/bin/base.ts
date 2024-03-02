#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as iam from 'aws-cdk-lib/aws-iam';
import { AwsSolutionsChecks } from 'cdk-nag';
import { Aspects } from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';

import { BaseStack } from '../lib/base-stack';

const app = new cdk.App();
// Add the cdk-nag AwsSolutions Pack with extra verbose logging enabled.
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))

const account = process.env.CDK_DEFAULT_ACCOUNT!;
const region = process.env.CDK_DEFAULT_REGION;
const env = {account, region}

//Base creation
const baseStack = new BaseStack(app, 'BaseStack', {
  env: env
});

//EKS cluster creation
const clusterName = "eks-crac-cluster";
const addOns: Array<blueprints.ClusterAddOn> = [
  new blueprints.KarpenterAddOn({
    values: {
      replicas: 1
    }
  }),
  new blueprints.AwsLoadBalancerControllerAddOn(),
  new blueprints.EfsCsiDriverAddOn()
];

const blueprintVpcProvider = new blueprints.DirectVpcProvider(baseStack.vpc)
const blueprint = blueprints.EksBlueprint.builder()
  .resourceProvider(blueprints.GlobalResources.Vpc, blueprintVpcProvider)
  .resourceProvider(blueprints.GlobalResources.KmsKey, new blueprints.CreateKmsKeyProvider('eks-cluster-key', {
      enableKeyRotation: true
    }))
  .account(account)
  .region(region)
  .version("auto")
  .addOns(...addOns)
  .name(clusterName)
  .build(app, clusterName + '-stack');
  
const springdemoServiceAccountName = 'springdemo';
const springdemoServiceAccount = blueprint.getClusterInfo().cluster.addServiceAccount(springdemoServiceAccountName, {
  name: springdemoServiceAccountName,
  namespace: "default"
});
springdemoServiceAccount.role.addToPrincipalPolicy(new iam.PolicyStatement(
    {
      actions: ['dynamodb:PutItem', 'dynamodb:GetItem', 'dynamodb:Scan'],
      resources: ['arn:aws:dynamodb:' + process.env.CDK_DEFAULT_REGION + ':' + process.env.CDK_DEFAULT_ACCOUNT + ':table/springdemo-prod-customer'],
    }
  ));
springdemoServiceAccount.role.addToPrincipalPolicy(new iam.PolicyStatement(
    {
      actions: ['s3:GetBucketLocation', 's3:GetObject', 's3:ListBucket'],
      resources: [baseStack.cracCheckpointsS3.bucketArn, baseStack.cracCheckpointsS3.bucketArn + '/*'],
    }
  ));
  
const springdemoNativeIntServiceAccountName = 'springdemo-native-int';
const springdemoNativeIntServiceAccount = blueprint.getClusterInfo().cluster.addServiceAccount(springdemoNativeIntServiceAccountName, {
  name: springdemoNativeIntServiceAccountName,
  namespace: "default"
});
springdemoNativeIntServiceAccount.role.addToPrincipalPolicy(new iam.PolicyStatement(
    {
      actions: ['dynamodb:PutItem', 'dynamodb:GetItem', 'dynamodb:Scan'],
      resources: ['arn:aws:dynamodb:' + process.env.CDK_DEFAULT_REGION + ':' + process.env.CDK_DEFAULT_ACCOUNT + ':table/springdemo-native-int-prod-customer'],
    }
  ));
springdemoNativeIntServiceAccount.role.addToPrincipalPolicy(new iam.PolicyStatement(
    {
      actions: ['s3:GetBucketLocation', 's3:GetObject', 's3:ListBucket'],
      resources: [baseStack.cracCheckpointsS3.bucketArn, baseStack.cracCheckpointsS3.bucketArn + '/*'],
    }
  ));


//configure cdk-nag suppressions
const globalSuppressions = [
    {
      id: 'AwsSolutions-IAM4',
      reason: 'Suppress errors related to the usage of IAM managed policies.'
    }
  ]

const eksBlueprintsSuppressions = [
    {
      id: 'AwsSolutions-EKS2',
      reason: 'Suppress errors related to EKS control plane logging to reduce charges given it is a demo cluster'
    },
    {
      id: 'AwsSolutions-EKS1',
      reason: 'Suppress errors related to EKS API server allowing accessing it through public network to facilitate experimentation (authN/authZ is configured)'
    },
    {
      id: 'AwsSolutions-IAM5',
      reason: 'Suppress errors related to IAM produced by EKS CDK construct'
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'Suppress errors related to EKS blueprints Lambda functions that are not using latest runtime version'
    }
  ]
NagSuppressions.addStackSuppressions(blueprint, globalSuppressions.concat(eksBlueprintsSuppressions), true);
NagSuppressions.addStackSuppressions(baseStack, globalSuppressions);
NagSuppressions.addResourceSuppressions(baseStack.efsSg, [
    {
      id: 'AwsSolutions-EC23',
      reason: 'Suppress the error related to allowing inbound access from 0.0.0.0/0 on EFS security group'
    }
  ]);
