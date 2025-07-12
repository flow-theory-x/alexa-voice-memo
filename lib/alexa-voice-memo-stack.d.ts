import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
export interface AlexaVoiceMemoStackProps extends cdk.StackProps {
    projectName: string;
    environment: string;
}
export declare class AlexaVoiceMemoStack extends cdk.Stack {
    readonly alexaLambda: lambda.Function;
    readonly memoTable: dynamodb.Table;
    readonly alexaRole: iam.Role;
    constructor(scope: Construct, id: string, props: AlexaVoiceMemoStackProps);
}
