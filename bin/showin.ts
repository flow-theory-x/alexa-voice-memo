#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ShowinStack } from '../lib/showin-stack';

const app = new cdk.App();

const environment = process.env.CDK_ENV || 'dev';
const account = process.env.CDK_ACCOUNT;
const region = process.env.CDK_REGION || 'ap-northeast-1';

new ShowinStack(app, `showin-${environment}`, {
  env: { account, region },
  projectName: 'showin',
  environment: environment,
});