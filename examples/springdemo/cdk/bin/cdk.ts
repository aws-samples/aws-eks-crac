#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SpringDemoInfra } from '../lib/springdemo-infra';

const app = new cdk.App();
new SpringDemoInfra(app, 'SpringDemoInfra', {
  
});