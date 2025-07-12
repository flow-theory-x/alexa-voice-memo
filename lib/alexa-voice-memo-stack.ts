import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface AlexaVoiceMemoStackProps extends cdk.StackProps {
  projectName: string;
  environment: string;
}

export class AlexaVoiceMemoStack extends cdk.Stack {
  public readonly alexaLambda: lambda.Function;
  public readonly memoTable: dynamodb.Table;
  public readonly alexaRole: iam.Role;

  constructor(scope: Construct, id: string, props: AlexaVoiceMemoStackProps) {
    super(scope, id, props);

    const { projectName, environment } = props;

    // DynamoDB Table for Memos
    this.memoTable = new dynamodb.Table(this, 'MemosTable', {
      tableName: `${projectName}-${environment}-memos`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'memoId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: environment === 'prod',
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Global Secondary Index for timestamp-based queries
    this.memoTable.addGlobalSecondaryIndex({
      indexName: 'timestamp-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // Global Secondary Index for status-based queries
    this.memoTable.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'deleted', type: dynamodb.AttributeType.STRING },
    });

    // IAM Role for Lambda
    this.alexaRole = new iam.Role(this, 'LambdaRole', {
      roleName: `${projectName}-${environment}-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant DynamoDB permissions to Lambda role
    this.memoTable.grantReadWriteData(this.alexaRole);

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'LambdaLogGroup', {
      logGroupName: `/aws/lambda/${projectName}-${environment}-handler`,
      retention: environment === 'prod' 
        ? logs.RetentionDays.THREE_MONTHS 
        : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda Function
    this.alexaLambda = new lambda.Function(this, 'Handler', {
      functionName: `${projectName}-${environment}-handler`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('src'),
      role: this.alexaRole,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        MEMO_TABLE_NAME: this.memoTable.tableName,
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'WARN' : 'INFO',
      },
      logGroup: logGroup,
    });

    // Outputs
    new cdk.CfnOutput(this, 'TableName', {
      value: this.memoTable.tableName,
      description: 'DynamoDB table name for memos',
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: this.alexaLambda.functionName,
      description: 'Lambda function name for Alexa handler',
    });

    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: this.alexaLambda.functionArn,
      description: 'Lambda function ARN for Alexa Skills Kit',
    });
  }
}