import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
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

    // Global Secondary Index for family-based queries
    this.memoTable.addGlobalSecondaryIndex({
      indexName: 'family-timestamp-index',
      partitionKey: { name: 'familyId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // DynamoDB Table for Users
    const userTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `${projectName}-${environment}-users`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: environment === 'prod',
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // DynamoDB Table for Invite Codes
    const inviteCodeTable = new dynamodb.Table(this, 'InviteCodesTable', {
      tableName: `${projectName}-${environment}-invite-codes`,
      partitionKey: { name: 'code', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl', // 自動削除用
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
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
    userTable.grantReadWriteData(this.alexaRole);
    inviteCodeTable.grantReadData(this.alexaRole);

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
      handler: 'src/handler.handler',
      code: lambda.Code.fromAsset('dist'),
      role: this.alexaRole,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        MEMO_TABLE_NAME: this.memoTable.tableName,
        USER_TABLE_NAME: userTable.tableName,
        INVITE_CODE_TABLE_NAME: inviteCodeTable.tableName,
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

    // Web API Lambda
    const webApiHandler = new lambda.Function(this, 'WebApiHandler', {
      functionName: `${projectName}-${environment}-web-api`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/web-api'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        MEMO_TABLE_NAME: this.memoTable.tableName,
        USER_TABLE_NAME: userTable.tableName,
        INVITE_CODE_TABLE_NAME: inviteCodeTable.tableName,
      },
    });

    // Grant Web API Lambda permissions to access DynamoDB
    this.memoTable.grantReadWriteData(webApiHandler);
    userTable.grantReadWriteData(webApiHandler);
    inviteCodeTable.grantReadWriteData(webApiHandler);

    // API Gateway for Web UI
    const webApi = new apigateway.RestApi(this, 'WebApi', {
      restApiName: `${projectName}-web-api-${environment}`,
      deployOptions: {
        stageName: environment,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true,
      },
    });

    // /api/memos resource
    const memosResource = webApi.root.addResource('api').addResource('memos');
    
    // GET /api/memos
    memosResource.addMethod('GET', new apigateway.LambdaIntegration(webApiHandler));
    
    // POST /api/memos
    memosResource.addMethod('POST', new apigateway.LambdaIntegration(webApiHandler));
    
    // DELETE /api/memos/{id}
    const memoIdResource = memosResource.addResource('{id}');
    memoIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(webApiHandler));
    
    // PUT /api/memos/{id} - 編集
    memoIdResource.addMethod('PUT', new apigateway.LambdaIntegration(webApiHandler));
    
    // PUT /api/memos/{id}/restore
    const restoreResource = memoIdResource.addResource('restore');
    restoreResource.addMethod('PUT', new apigateway.LambdaIntegration(webApiHandler));
    
    // Family management endpoints
    const apiResource = webApi.root.getResource('api')!;
    const familyResource = apiResource.addResource('family');
    
    // POST /api/family/invite-codes - 招待コード生成
    const inviteCodesResource = familyResource.addResource('invite-codes');
    inviteCodesResource.addMethod('POST', new apigateway.LambdaIntegration(webApiHandler));
    
    // POST /api/family/join - 家族に参加
    const joinResource = familyResource.addResource('join');
    joinResource.addMethod('POST', new apigateway.LambdaIntegration(webApiHandler));
    
    // POST /api/family/leave - 家族から退出
    const leaveResource = familyResource.addResource('leave');
    leaveResource.addMethod('POST', new apigateway.LambdaIntegration(webApiHandler));
    
    // POST /api/family/transfer-owner - 筆頭者移譲
    const transferOwnerResource = familyResource.addResource('transfer-owner');
    transferOwnerResource.addMethod('POST', new apigateway.LambdaIntegration(webApiHandler));
    
    // GET /api/family/members - メンバー一覧
    const membersResource = familyResource.addResource('members');
    membersResource.addMethod('GET', new apigateway.LambdaIntegration(webApiHandler));
    
    // User management endpoints
    const userResource = apiResource.addResource('user');
    
    // PUT /api/user/name - 名前変更
    const nameResource = userResource.addResource('name');
    nameResource.addMethod('PUT', new apigateway.LambdaIntegration(webApiHandler));

    // Output the API endpoint
    new cdk.CfnOutput(this, 'WebApiUrl', {
      value: webApi.url,
      description: 'Web API endpoint URL',
    });

    // ===== S3 Bucket for Frontend Deployment =====
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `${projectName}-${environment}-frontend`,
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Deploy frontend files to S3
    new s3deploy.BucketDeployment(this, 'FrontendDeployment', {
      sources: [s3deploy.Source.asset('./build/frontend')],
      destinationBucket: frontendBucket,
      retainOnDelete: false,
    });

    // Output the S3 website URL
    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: frontendBucket.bucketWebsiteUrl,
      description: 'Frontend S3 website URL',
    });

    // Output the S3 bucket name for deployment scripts
    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 bucket name for frontend deployment',
    });
  }
}