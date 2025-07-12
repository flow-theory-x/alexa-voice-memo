# Alexa Voice Memo - Development Guide

*Generated from ideanotes project - 2025-07-12*

## 🎯 Development Philosophy

This project follows **ideanotes スモールスタート原則**:
- **50%決まれば開発開始OK**: Start with minimal viable implementation
- **段階的改善**: Iterative improvement over perfection
- **学習重視**: Focus on learning and experimentation
- **実用性優先**: Working solution over perfect design

## 🚀 Development Phases

### Phase 1: Infrastructure Setup (Day 1)
```bash
# Goal: Working CDK stack deployment
1. CDK project initialization
2. AlexaVoiceMemoStack implementation
3. DynamoDB table creation
4. Lambda function deployment
5. Basic smoke test
```

### Phase 2: Core Implementation (Day 2-3)
```bash
# Goal: Basic memo operations working
1. Lambda handler structure
2. AddMemo functionality
3. ReadMemos functionality
4. DeleteMemo functionality
5. Error handling basics
```

### Phase 3: Testing & Polish (Day 4)
```bash
# Goal: Production-ready implementation
1. Comprehensive testing
2. Error handling improvement
3. Performance optimization
4. Documentation completion
```

### Phase 4: Alexa Integration (Day 5)
```bash
# Goal: End-to-end working Alexa skill
1. Alexa Developer Console setup
2. Interaction model configuration
3. Skill endpoint configuration
4. Real device testing
```

## 🛠️ Implementation Strategy

### Start Simple, Evolve Gradually

#### MVP Implementation
```typescript
// Start with minimal handler
export const handler = async (event: AlexaRequest): Promise<AlexaResponse> => {
  const requestType = event.request.type;
  
  switch (requestType) {
    case 'LaunchRequest':
      return buildResponse('ボイスメモへようこそ');
    case 'IntentRequest':
      return handleIntent(event);
    default:
      return buildResponse('すみません、理解できませんでした');
  }
};
```

#### Gradually Add Complexity
```typescript
// Then add proper error handling, logging, validation
export const handler = async (event: AlexaRequest): Promise<AlexaResponse> => {
  const logger = createLogger(event.context.requestId);
  
  try {
    logger.info('Request received', { type: event.request.type });
    
    const validator = new RequestValidator();
    validator.validate(event);
    
    const handler = HandlerFactory.create(event.request.type);
    const response = await handler.handle(event);
    
    logger.info('Response generated', { response });
    return response;
    
  } catch (error) {
    logger.error('Handler error', { error });
    return ErrorHandler.handle(error);
  }
};
```

### CDK Development Pattern

#### 1. Infrastructure First
```typescript
// Start with basic stack
export class AlexaVoiceMemoStack extends Stack {
  constructor(scope: Construct, id: string, props: AlexaVoiceMemoStackProps) {
    super(scope, id, props);
    
    // Start simple
    const table = new Table(this, 'MemosTable', {
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      sortKey: { name: 'memoId', type: AttributeType.STRING },
    });
    
    const lambda = new Function(this, 'Handler', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromAsset('src'),
    });
  }
}
```

#### 2. Add Complexity Gradually
```typescript
// Then add monitoring, alarms, proper IAM
const table = new Table(this, 'MemosTable', {
  partitionKey: { name: 'userId', type: AttributeType.STRING },
  sortKey: { name: 'memoId', type: AttributeType.STRING },
  billingMode: BillingMode.ON_DEMAND,
  encryption: TableEncryption.AWS_MANAGED,
  pointInTimeRecovery: props.environment === 'prod',
  removalPolicy: props.environment === 'prod' 
    ? RemovalPolicy.RETAIN 
    : RemovalPolicy.DESTROY,
});

// Add GSI
table.addGlobalSecondaryIndex({
  indexName: 'timestamp-index',
  partitionKey: { name: 'userId', type: AttributeType.STRING },
  sortKey: { name: 'timestamp', type: AttributeType.STRING },
});
```

## 📋 Development Checklist

### Infrastructure Development

#### CDK Stack Implementation
- [ ] Basic AlexaVoiceMemoStack class
- [ ] DynamoDB table with correct schema
- [ ] Lambda function with proper configuration
- [ ] IAM roles with minimal required permissions
- [ ] Environment-specific configurations
- [ ] CloudWatch log groups
- [ ] Stack deployment successful

#### DynamoDB Design
- [ ] Primary key design (userId, memoId)
- [ ] GSI for timestamp-based queries
- [ ] GSI for status-based queries (active/deleted)
- [ ] Proper attribute types
- [ ] Encryption enabled
- [ ] Backup configuration (prod environment)

#### Lambda Configuration
- [ ] Node.js 20.x runtime
- [ ] Appropriate memory allocation (256MB)
- [ ] Timeout configuration (30s)
- [ ] Environment variables setup
- [ ] IAM role attachment
- [ ] CloudWatch logging enabled

### Application Development

#### Core Handler Implementation
- [ ] Alexa request type detection
- [ ] Intent routing logic
- [ ] Slot value extraction
- [ ] Response building utilities
- [ ] Error handling framework
- [ ] Logging implementation

#### Memo Service Implementation
- [ ] DynamoDB client initialization
- [ ] addMemo operation
- [ ] getActiveMemos operation
- [ ] deleteMemo operation (logical delete)
- [ ] Error handling for DynamoDB operations
- [ ] Input validation and sanitization

#### Intent Handlers
- [ ] LaunchRequestHandler
- [ ] AddMemoIntentHandler
- [ ] ReadMemosIntentHandler
- [ ] DeleteMemoIntentHandler
- [ ] HelpIntentHandler
- [ ] CancelAndStopIntentHandler
- [ ] SessionEndedRequestHandler
- [ ] ErrorHandler

### Testing Implementation

#### Unit Tests
- [ ] MemoService unit tests
- [ ] Intent handler unit tests
- [ ] Response builder unit tests
- [ ] Validation logic tests
- [ ] Error handling tests

#### Integration Tests
- [ ] DynamoDB integration tests
- [ ] End-to-end request/response tests
- [ ] Error scenario tests
- [ ] Performance tests

#### Infrastructure Tests
- [ ] CDK stack synthesis tests
- [ ] IAM permission tests
- [ ] Resource configuration tests

## 🔧 Development Tools & Setup

### Required Environment
```bash
# AWS CLI configuration
aws configure

# CDK CLI installation
npm install -g aws-cdk

# Environment variables
export CDK_ACCOUNT=your-aws-account-id
export CDK_REGION=ap-northeast-1
export CDK_ENV=dev
```

### Development Commands
```bash
# CDK commands
cdk diff                 # Show changes
cdk deploy              # Deploy stack
cdk destroy             # Remove stack
cdk synth               # Generate CloudFormation

# Testing commands
npm test                # Run all tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests
npm run test:coverage   # Coverage report

# Development commands
npm run build           # Compile TypeScript
npm run watch           # Watch mode
npm run lint            # Code linting
npm run format          # Code formatting
```

### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json"
  ]
}
```

## 📊 Development Best Practices

### Code Organization
```typescript
// Clear separation of concerns
src/
├── handlers/           # Alexa request handlers
│   ├── launch-handler.ts
│   ├── add-memo-handler.ts
│   └── read-memos-handler.ts
├── services/          # Business logic
│   ├── memo-service.ts
│   └── alexa-service.ts
├── types/             # Type definitions
│   ├── alexa-types.ts
│   └── memo-types.ts
└── utils/             # Utilities
    ├── logger.ts
    ├── validators.ts
    └── response-builder.ts
```

### Error Handling Strategy
```typescript
// Consistent error handling
export class MemoServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'MemoServiceError';
  }
}

// Usage
try {
  await memoService.addMemo(userId, text);
} catch (error) {
  if (error instanceof MemoServiceError) {
    logger.error('Memo service error', { error: error.code });
    return buildErrorResponse(error.message);
  }
  throw error; // Re-throw unexpected errors
}
```

### Logging Best Practices
```typescript
// Structured logging
const logger = {
  info: (message: string, context?: object) => {
    console.log(JSON.stringify({
      level: 'INFO',
      message,
      timestamp: new Date().toISOString(),
      requestId: getCurrentRequestId(),
      ...context
    }));
  }
};

// Usage
logger.info('Memo added successfully', {
  userId: sanitizeUserId(userId),
  memoCount: memos.length,
  operation: 'addMemo'
});
```

## 🎯 Success Criteria

### Functional Requirements
- [ ] Users can add memos by voice
- [ ] Users can hear all memos read back
- [ ] Users can delete specific memos by number
- [ ] Skill responds appropriately to help requests
- [ ] Skill handles errors gracefully

### Non-Functional Requirements
- [ ] Response time < 3 seconds (95th percentile)
- [ ] Error rate < 5%
- [ ] Cost < $1/month for expected usage
- [ ] No security vulnerabilities
- [ ] Code coverage > 80%

### Learning Objectives
- [ ] Understand Alexa Skills Kit development
- [ ] Learn CDK infrastructure as code
- [ ] Practice DynamoDB design patterns
- [ ] Implement serverless architecture
- [ ] Apply ideanotes development methodology

## 🔄 Iteration Strategy

### Week 1: MVP
- Basic functionality working
- Manual testing successful
- Infrastructure deployed

### Week 2: Polish
- Comprehensive testing
- Error handling improved
- Performance optimized

### Week 3: Production
- Alexa skill published (optional)
- Monitoring implemented
- Documentation complete

---

## 💡 Development Tips

1. **Start with hard-coded responses** to test the flow
2. **Use console.log liberally** for debugging
3. **Test each component separately** before integration
4. **Deploy frequently** to catch issues early
5. **Keep the scope minimal** for the first iteration

Remember: The goal is **learning and working solution**, not perfection!