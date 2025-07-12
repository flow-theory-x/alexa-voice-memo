"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlexaVoiceMemoStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
class AlexaVoiceMemoStack extends cdk.Stack {
    alexaLambda;
    memoTable;
    alexaRole;
    constructor(scope, id, props) {
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
exports.AlexaVoiceMemoStack = AlexaVoiceMemoStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxleGEtdm9pY2UtbWVtby1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFsZXhhLXZvaWNlLW1lbW8tc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsbUVBQXFEO0FBQ3JELCtEQUFpRDtBQUNqRCx5REFBMkM7QUFDM0MsMkRBQTZDO0FBUTdDLE1BQWEsbUJBQW9CLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDaEMsV0FBVyxDQUFrQjtJQUM3QixTQUFTLENBQWlCO0lBQzFCLFNBQVMsQ0FBVztJQUVwQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQStCO1FBQ3ZFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRTNDLDJCQUEyQjtRQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3RELFNBQVMsRUFBRSxHQUFHLFdBQVcsSUFBSSxXQUFXLFFBQVE7WUFDaEQsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDckUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDaEUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxVQUFVLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXO1lBQ2hELG1CQUFtQixFQUFFLFdBQVcsS0FBSyxNQUFNO1lBQzNDLGFBQWEsRUFBRSxXQUFXLEtBQUssTUFBTTtnQkFDbkMsQ0FBQyxDQUFDLEdBQUcs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SSxFQUFFLFdBQVcsRUFBRTtZQUNuQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTO1lBQy9CLFdBQVcsRUFBRSwrQkFBK0I7U0FDN0MsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUM1QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZO1lBQ3BDLFdBQVcsRUFBRSx3Q0FBd0M7U0FDdEQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUMzQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXO1lBQ25DLFdBQVcsRUFBRSwwQ0FBMEM7U0FDeEQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBM0ZELGtEQTJGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBBbGV4YVZvaWNlTWVtb1N0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHByb2plY3ROYW1lOiBzdHJpbmc7XG4gIGVudmlyb25tZW50OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBBbGV4YVZvaWNlTWVtb1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGFsZXhhTGFtYmRhOiBsYW1iZGEuRnVuY3Rpb247XG4gIHB1YmxpYyByZWFkb25seSBtZW1vVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBwdWJsaWMgcmVhZG9ubHkgYWxleGFSb2xlOiBpYW0uUm9sZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQWxleGFWb2ljZU1lbW9TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7IHByb2plY3ROYW1lLCBlbnZpcm9ubWVudCB9ID0gcHJvcHM7XG5cbiAgICAvLyBEeW5hbW9EQiBUYWJsZSBmb3IgTWVtb3NcbiAgICB0aGlzLm1lbW9UYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnTWVtb3NUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogYCR7cHJvamVjdE5hbWV9LSR7ZW52aXJvbm1lbnR9LW1lbW9zYCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ21lbW9JZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogZW52aXJvbm1lbnQgPT09ICdwcm9kJyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZCcgXG4gICAgICAgID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIFxuICAgICAgICA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBHbG9iYWwgU2Vjb25kYXJ5IEluZGV4IGZvciB0aW1lc3RhbXAtYmFzZWQgcXVlcmllc1xuICAgIHRoaXMubWVtb1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ3RpbWVzdGFtcC1pbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd0aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pO1xuXG4gICAgLy8gR2xvYmFsIFNlY29uZGFyeSBJbmRleCBmb3Igc3RhdHVzLWJhc2VkIHF1ZXJpZXNcbiAgICB0aGlzLm1lbW9UYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdzdGF0dXMtaW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnZGVsZXRlZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSk7XG5cbiAgICAvLyBJQU0gUm9sZSBmb3IgTGFtYmRhXG4gICAgdGhpcy5hbGV4YVJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0xhbWJkYVJvbGUnLCB7XG4gICAgICByb2xlTmFtZTogYCR7cHJvamVjdE5hbWV9LSR7ZW52aXJvbm1lbnR9LWxhbWJkYS1yb2xlYCxcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IER5bmFtb0RCIHBlcm1pc3Npb25zIHRvIExhbWJkYSByb2xlXG4gICAgdGhpcy5tZW1vVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHRoaXMuYWxleGFSb2xlKTtcblxuICAgIC8vIENsb3VkV2F0Y2ggTG9nIEdyb3VwXG4gICAgY29uc3QgbG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnTGFtYmRhTG9nR3JvdXAnLCB7XG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL2xhbWJkYS8ke3Byb2plY3ROYW1lfS0ke2Vudmlyb25tZW50fS1oYW5kbGVyYCxcbiAgICAgIHJldGVudGlvbjogZW52aXJvbm1lbnQgPT09ICdwcm9kJyBcbiAgICAgICAgPyBsb2dzLlJldGVudGlvbkRheXMuVEhSRUVfTU9OVEhTIFxuICAgICAgICA6IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBMYW1iZGEgRnVuY3Rpb25cbiAgICB0aGlzLmFsZXhhTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnSGFuZGxlcicsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogYCR7cHJvamVjdE5hbWV9LSR7ZW52aXJvbm1lbnR9LWhhbmRsZXJgLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlci5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnc3JjJyksXG4gICAgICByb2xlOiB0aGlzLmFsZXhhUm9sZSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIE1FTU9fVEFCTEVfTkFNRTogdGhpcy5tZW1vVGFibGUudGFibGVOYW1lLFxuICAgICAgICBFTlZJUk9OTUVOVDogZW52aXJvbm1lbnQsXG4gICAgICAgIExPR19MRVZFTDogZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/ICdXQVJOJyA6ICdJTkZPJyxcbiAgICAgIH0sXG4gICAgICBsb2dHcm91cDogbG9nR3JvdXAsXG4gICAgfSk7XG5cbiAgICAvLyBPdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1RhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLm1lbW9UYWJsZS50YWJsZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIHRhYmxlIG5hbWUgZm9yIG1lbW9zJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMYW1iZGFGdW5jdGlvbk5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5hbGV4YUxhbWJkYS5mdW5jdGlvbk5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0xhbWJkYSBmdW5jdGlvbiBuYW1lIGZvciBBbGV4YSBoYW5kbGVyJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMYW1iZGFGdW5jdGlvbkFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFsZXhhTGFtYmRhLmZ1bmN0aW9uQXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdMYW1iZGEgZnVuY3Rpb24gQVJOIGZvciBBbGV4YSBTa2lsbHMgS2l0JyxcbiAgICB9KTtcbiAgfVxufSJdfQ==