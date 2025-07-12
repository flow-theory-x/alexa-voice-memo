# Alexa Voice Memo - Deployment Guide

*Generated from ideanotes project - 2025-07-12*

## 🎯 Deployment Strategy

Following **ideanotes スモールスタート原則**:
- **Deploy early, deploy often**: Catch issues quickly
- **Environment progression**: dev → stg → prod
- **Incremental deployment**: Infrastructure first, then features
- **Rollback ready**: Always have a rollback plan

## 🏗️ Deployment Architecture

### Environment Isolation
```
Development (dev):
├── Stack: alexa-voice-memo-dev
├── Table: alexa-voice-memo-dev-memos  
├── Function: alexa-voice-memo-dev-handler
└── Logs: /aws/lambda/alexa-voice-memo-dev-handler

Staging (stg):
├── Stack: alexa-voice-memo-stg
├── Table: alexa-voice-memo-stg-memos
├── Function: alexa-voice-memo-stg-handler
└── Logs: /aws/lambda/alexa-voice-memo-stg-handler

Production (prod):
├── Stack: alexa-voice-memo-prod
├── Table: alexa-voice-memo-prod-memos
├── Function: alexa-voice-memo-prod-handler
└── Logs: /aws/lambda/alexa-voice-memo-prod-handler
```

## 🚀 Deployment Process

### Phase 1: Development Deployment

#### Prerequisites
```bash
# Environment setup
export CDK_ACCOUNT=your-aws-account-id
export CDK_REGION=ap-northeast-1
export CDK_ENV=dev

# Verify AWS access
aws sts get-caller-identity

# Verify CDK bootstrap
aws cloudformation describe-stacks --stack-name CDKToolkit
```

#### Initial Deployment
```bash
# 1. Build the project
npm run build

# 2. Run tests
npm test

# 3. Synthesize CloudFormation
cdk synth alexa-voice-memo-dev

# 4. Review changes
cdk diff alexa-voice-memo-dev

# 5. Deploy
cdk deploy alexa-voice-memo-dev

# 6. Verify deployment
aws cloudformation describe-stacks --stack-name alexa-voice-memo-dev
```

#### Deployment Verification
```bash
# Check Lambda function
aws lambda get-function --function-name alexa-voice-memo-dev-handler

# Check DynamoDB table
aws dynamodb describe-table --table-name alexa-voice-memo-dev-memos

# Test basic functionality
aws lambda invoke \
  --function-name alexa-voice-memo-dev-handler \
  --payload '{"request":{"type":"LaunchRequest"},"session":{"user":{"userId":"test"}}}' \
  response.json
```

### Phase 2: Staging Deployment

#### Environment Switch
```bash
# Switch to staging environment
export CDK_ENV=stg

# Deploy to staging
cdk deploy alexa-voice-memo-stg
```

#### Staging Tests
```bash
# Run integration tests against staging
npm run test:integration

# Run performance tests
npm run test:performance

# Manual testing checklist
# - All intents working
# - Error handling appropriate
# - Response times < 3s
```

### Phase 3: Production Deployment

#### Pre-production Checklist
- [ ] All tests passing in staging
- [ ] Performance requirements met
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Rollback plan prepared

#### Production Deployment
```bash
# Switch to production
export CDK_ENV=prod

# Final verification
cdk diff alexa-voice-memo-prod

# Deploy to production
cdk deploy alexa-voice-memo-prod

# Post-deployment verification
npm run test:smoke -- --env prod
```

## 🔄 Continuous Deployment

### Automated Deployment Pipeline

#### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy Alexa Voice Memo

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Build project
        run: npm run build

  deploy-dev:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      
      - name: Install dependencies
        run: npm ci
      
      - name: Deploy to dev
        run: |
          export CDK_ENV=dev
          export CDK_ACCOUNT=${{ secrets.AWS_ACCOUNT_ID }}
          export CDK_REGION=ap-northeast-1
          cdk deploy alexa-voice-memo-dev --require-approval never
      
      - name: Run smoke tests
        run: npm run test:smoke -- --env dev

  deploy-stg:
    needs: deploy-dev
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      
      - name: Deploy to staging
        run: |
          export CDK_ENV=stg
          export CDK_ACCOUNT=${{ secrets.AWS_ACCOUNT_ID }}
          export CDK_REGION=ap-northeast-1
          cdk deploy alexa-voice-memo-stg --require-approval never
      
      - name: Run integration tests
        run: npm run test:integration -- --env stg
```

### Manual Production Deployment
```bash
# Production deployment should be manual with approval
# After staging verification:

# 1. Create release tag
git tag v1.0.0
git push origin v1.0.0

# 2. Deploy to production
export CDK_ENV=prod
cdk deploy alexa-voice-memo-prod

# 3. Verify production deployment
npm run test:smoke -- --env prod

# 4. Monitor for issues
aws logs tail /aws/lambda/alexa-voice-memo-prod-handler --follow
```

## 📊 Deployment Monitoring

### Health Checks

#### Lambda Function Health
```bash
# Check function status
aws lambda get-function --function-name alexa-voice-memo-${CDK_ENV}-handler

# Check recent invocations
aws logs filter-log-events \
  --log-group-name /aws/lambda/alexa-voice-memo-${CDK_ENV}-handler \
  --start-time $(date -d '1 hour ago' +%s)000

# Check error rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=alexa-voice-memo-${CDK_ENV}-handler \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Sum
```

#### DynamoDB Health
```bash
# Check table status
aws dynamodb describe-table --table-name alexa-voice-memo-${CDK_ENV}-memos

# Check throttling
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=alexa-voice-memo-${CDK_ENV}-memos \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Sum
```

### Post-Deployment Verification

#### Smoke Tests
```typescript
// test/smoke/smoke.test.ts
import { handler } from '../../src/handler';

describe('Smoke Tests', () => {
  const environment = process.env.TEST_ENV || 'dev';
  
  beforeAll(() => {
    // Set environment-specific configuration
    process.env.MEMO_TABLE_NAME = `alexa-voice-memo-${environment}-memos`;
    process.env.ENVIRONMENT = environment;
  });

  it('should handle launch request', async () => {
    const response = await handler({
      request: { type: 'LaunchRequest' },
      session: { user: { userId: 'smoke-test-user' } }
    } as any);

    expect(response.response.outputSpeech).toBeDefined();
    expect(response.response.outputSpeech.text).toContain('ボイスメモ');
  });

  it('should add and retrieve memo', async () => {
    const userId = `smoke-test-${Date.now()}`;
    
    // Add memo
    const addResponse = await handler({
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'AddMemoIntent',
          slots: { memoText: { value: 'Smoke test memo' } }
        }
      },
      session: { user: { userId } }
    } as any);

    expect(addResponse.response.outputSpeech.text).toContain('追加しました');

    // Retrieve memo
    const readResponse = await handler({
      request: {
        type: 'IntentRequest',
        intent: { name: 'ReadMemosIntent' }
      },
      session: { user: { userId } }
    } as any);

    expect(readResponse.response.outputSpeech.text).toContain('メモが1件');
  });
});
```

## 🚨 Rollback Procedures

### Automatic Rollback Triggers
```yaml
# CloudWatch Alarms for automatic rollback
ErrorRateAlarm:
  MetricName: Errors
  Threshold: 5  # 5% error rate
  ComparisonOperator: GreaterThanThreshold
  TreatMissingData: notBreaching

DurationAlarm:
  MetricName: Duration
  Threshold: 25000  # 25 seconds
  ComparisonOperator: GreaterThanThreshold
  TreatMissingData: notBreaching
```

### Manual Rollback Process
```bash
# Option 1: Rollback to previous version
cdk deploy alexa-voice-memo-${CDK_ENV} --rollback

# Option 2: Deploy specific version
git checkout v1.0.0
cdk deploy alexa-voice-memo-${CDK_ENV}

# Option 3: Emergency rollback
aws lambda update-function-code \
  --function-name alexa-voice-memo-${CDK_ENV}-handler \
  --zip-file fileb://previous-version.zip
```

### Rollback Verification
```bash
# Verify rollback success
npm run test:smoke -- --env ${CDK_ENV}

# Check application logs
aws logs tail /aws/lambda/alexa-voice-memo-${CDK_ENV}-handler --since 5m

# Monitor metrics
aws cloudwatch get-dashboard --dashboard-name alexa-voice-memo-${CDK_ENV}
```

## 🛠️ Deployment Troubleshooting

### Common Issues

#### 1. CDK Deployment Failures
```bash
# Error: Stack update failed
# Solution: Check CloudFormation events
aws cloudformation describe-stack-events --stack-name alexa-voice-memo-${CDK_ENV}

# Error: Insufficient permissions
# Solution: Check IAM permissions
aws iam simulate-principal-policy \
  --policy-source-arn $(aws sts get-caller-identity --query Arn --output text) \
  --action-names cloudformation:CreateStack \
  --resource-arns "*"
```

#### 2. Lambda Function Issues
```bash
# Error: Function not found
# Check function exists
aws lambda list-functions --query 'Functions[?contains(FunctionName, `alexa-voice-memo`)]'

# Error: Function execution failed
# Check function logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/alexa-voice-memo-${CDK_ENV}-handler \
  --filter-pattern "ERROR"
```

#### 3. DynamoDB Issues
```bash
# Error: Table not found
# Check table exists
aws dynamodb list-tables --query 'TableNames[?contains(@, `alexa-voice-memo`)]'

# Error: Provisioned throughput exceeded
# Check table metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=alexa-voice-memo-${CDK_ENV}-memos \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --period 300 \
  --statistics Average,Maximum
```

### Debug Commands
```bash
# Detailed CDK output
cdk deploy --verbose

# CloudFormation template debug
cdk synth alexa-voice-memo-${CDK_ENV} > template.json

# Lambda function test
aws lambda invoke \
  --function-name alexa-voice-memo-${CDK_ENV}-handler \
  --log-type Tail \
  --payload '{}' \
  response.json

# View base64 encoded logs
echo $(aws lambda invoke --function-name alexa-voice-memo-${CDK_ENV}-handler --log-type Tail --payload '{}' response.json --query 'LogResult' --output text) | base64 -d
```

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Security scan completed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Rollback plan prepared

### Deployment
- [ ] Environment variables set correctly
- [ ] CDK diff reviewed
- [ ] Deployment executed successfully
- [ ] Stack resources created properly
- [ ] Function deployed and callable

### Post-Deployment
- [ ] Smoke tests passed
- [ ] Health checks passing
- [ ] Metrics looking normal
- [ ] Logs showing expected activity
- [ ] No error alerts triggered
- [ ] Documentation updated with new version

### Production Specific
- [ ] Change management ticket created
- [ ] Stakeholders notified
- [ ] Monitoring dashboards updated
- [ ] On-call team notified
- [ ] Performance baseline established

---

## 💡 Deployment Best Practices

1. **Infrastructure as Code**: Everything through CDK, no manual changes
2. **Environment Parity**: Keep dev/stg/prod as similar as possible
3. **Automated Testing**: Never deploy without passing tests
4. **Gradual Rollout**: Use staging environment to catch issues
5. **Monitor Everything**: Set up comprehensive monitoring
6. **Document Changes**: Keep deployment history and rollback procedures

Remember: Deployment is part of the learning process - use issues as opportunities to improve the process! 🚀