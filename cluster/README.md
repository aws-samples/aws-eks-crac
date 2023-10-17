CDK must be bootstrapped prior to deploying stacks. Bootstrapping is a process of creating IAM roles and lambda functions that can execute some of the common CDK constructs. The following must be run once, in the account where the stack is deployed.
* `cdk bootstrap` 

Once CDK is bootstrapped, the cluster is deployed an updated with the following command:
* `cdk deploy eks-java-checkpoint-restore`

This cluster is configured with Karpenter as the node provisioner. After the 1st creation of the cluster, the Karpenter Add-on is setup and the provisioner must be created. This is done with the following
* `kubectl apply -f post-cluster/karpenter-provisioner.yaml`

Please check these links for more details about EKS Blueprints
* https://aws-quickstart.github.io/cdk-eks-blueprints/getting-started/
* https://github.com/aws-samples/cdk-eks-blueprints-patterns