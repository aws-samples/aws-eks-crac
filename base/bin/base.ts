#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';

import { BaseStack } from '../lib/base-stack';

const app = new cdk.App();

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


const blueprint = blueprints.EksBlueprint.builder()
  .resourceProvider(blueprints.GlobalResources.Vpc, new blueprints.DirectVpcProvider(baseStack.vpc))
  .account(account)
  .region(region)
  .version("auto")
  .addOns(...addOns)
  .name(clusterName)
  .build(app, clusterName + '-stack');

const springBootDdbServiceAccountName = 'spring-boot-ddb';
const springBootDdbServiceAccount = blueprint.getClusterInfo().cluster.addServiceAccount(springBootDdbServiceAccountName, {
  name: springBootDdbServiceAccountName,
  namespace: "default"
});
springBootDdbServiceAccount.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess"));
springBootDdbServiceAccount.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"));

const customerServiceConfigServerServiceAccountName = 'customer-service-config-server';
const customerServiceConfigServerServiceAccount = blueprint.getClusterInfo().cluster.addServiceAccount(customerServiceConfigServerServiceAccountName, {
  name: customerServiceConfigServerServiceAccountName,
  namespace: "default"
});

customerServiceConfigServerServiceAccount.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AWSCodeCommitReadOnly"));

