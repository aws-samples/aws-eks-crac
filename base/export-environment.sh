#!/bin/bash

export AWS_REGION="$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone | sed 's/\(.*\)[a-z]/\1/')"
export ACCOUNT_ID="$(aws sts get-caller-identity --output text --query Account)"
export CLUSTER_NAME=eks-crac-cluster-stack

export VPC_ID="$(aws cloudformation describe-stacks --stack-name BaseStack --query 'Stacks[0].Outputs[?OutputKey==`VpcId`].OutputValue' --output text)"
export CI_SG_ID="$(aws cloudformation describe-stacks --stack-name BaseStack --query 'Stacks[0].Outputs[?OutputKey==`CiSgId`].OutputValue' --output text)"
export VPC_PRIVATE_SUBNET_IDS="$(aws cloudformation describe-stacks --stack-name BaseStack --query 'Stacks[0].Outputs[?OutputKey==`VpcPrivateSubnetIds`].OutputValue' --output text)"

# TODO: Should this be moved to the CICD setup? Does it make sense to have a single EFS location for all CRaC files or one per deployment.
export EFS_DNS="$(aws cloudformation describe-stacks --stack-name BaseStack --query 'Stacks[0].Outputs[?OutputKey==`CracCheckpointsFileSystemDns`].OutputValue' --output text)"
export EFS_ID="$(aws cloudformation describe-stacks --stack-name BaseStack --query 'Stacks[0].Outputs[?OutputKey==`CracCheckpointsFileSystemId`].OutputValue' --output text)"

echo "export ACCOUNT_ID=${ACCOUNT_ID}" | tee -a ~/.bash_profile
echo "export AWS_REGION=${AWS_REGION}" | tee -a ~/.bash_profile
echo "export CLUSTER_NAME=${CLUSTER_NAME}" | tee -a ~/.bash_profile
echo "export VPC_ID=${VPC_ID}" | tee -a ~/.bash_profile
echo "export CI_SG_ID=${CI_SG_ID}" | tee -a ~/.bash_profile
echo "export VPC_PRIVATE_SUBNET_IDS=${VPC_PRIVATE_SUBNET_IDS}" | tee -a ~/.bash_profile
echo "export EFS_DNS=${EFS_DNS}" | tee -a ~/.bash_profile
echo "export EFS_ID=${EFS_ID}" | tee -a ~/.bash_profile

echo "export ACCOUNT_ID=${ACCOUNT_ID}"
echo "export AWS_REGION=${AWS_REGION}"
echo "export CLUSTER_NAME=${CLUSTER_NAME}"
echo "export VPC_ID=${VPC_ID}"
echo "export CI_SG_ID=${CI_SG_ID}"
echo "export VPC_PRIVATE_SUBNET_IDS=${VPC_PRIVATE_SUBNET_IDS}"
echo "export EFS_DNS=${EFS_DNS}"
echo "export EFS_ID=${EFS_ID}"
