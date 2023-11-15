import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import * as blueprints from '@aws-quickstart/eks-blueprints';


export class EksSampleCluster extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id);

  //   const account = props?.env?.account!;
  //   const region = props?.env?.region!;

  //   const addOns: Array<blueprints.ClusterAddOn> = [
  //     new blueprints.KarpenterAddOn({
  //       values: {
  //         replicas: 1
  //       }
  //     }),
  //     new blueprints.addons.AwsLoadBalancerControllerAddOn(),
  // ];

  //   const blueprint = blueprints.EksBlueprint.builder()
  //   .account(account)
  //   .region(region)
  //   .version("auto")
  //   .addOns(...addOns)
  //   .build(scope, id+'-stack');

  //   const springBootDdbServiceAccountName = 'spring-boot-ddb';
  //   const springBootDdbServiceAccount = blueprint.getClusterInfo().cluster.addServiceAccount(springBootDdbServiceAccountName, {
  //       name: springBootDdbServiceAccountName,
  //       namespace: "default"
  //   });
  //   springBootDdbServiceAccount.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess"));

  //   const customerServiceConfigServerServiceAccountName = 'customer-service-config-server';
  //   const customerServiceConfigServerServiceAccount = blueprint.getClusterInfo().cluster.addServiceAccount(customerServiceConfigServerServiceAccountName, {
  //       name: customerServiceConfigServerServiceAccountName,
  //       namespace: "default"
  //   });

  //   customerServiceConfigServerServiceAccount.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AWSCodeCommitReadOnly"));
  }
}
