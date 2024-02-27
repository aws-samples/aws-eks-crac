#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CicdSetupStack } from '../lib/cicd-setup-stack';

const app = new cdk.App();
const account = process.env.CDK_DEFAULT_ACCOUNT!;
const region = process.env.CDK_DEFAULT_REGION;
const env = {account, region}

// get serviceName from cdk context
const serviceName = app.node.tryGetContext('service-name');

new CicdSetupStack(app, serviceName +"-ci-stack", {
  env : env
});