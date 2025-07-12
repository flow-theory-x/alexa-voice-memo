#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AlexaVoiceMemoStack } from '../lib/alexa-voice-memo-stack';

const app = new cdk.App();

const environment = process.env.CDK_ENV || 'dev';
const account = process.env.CDK_ACCOUNT;
const region = process.env.CDK_REGION || 'ap-northeast-1';

new AlexaVoiceMemoStack(app, `alexa-voice-memo-${environment}`, {
  env: { account, region },
  projectName: 'alexa-voice-memo',
  environment: environment,
});