# Environment Setup Guide

*Alexa Voice Memo - Environment Management Strategy*

## 🎯 Environment Philosophy

Following **ideanotes スモールスタート原則**:
- **Start Simple**: Single `dev` environment for initial development
- **Scale When Needed**: Add `staging`/`prod` when business demands it
- **Cost Conscious**: Minimize AWS resources until required
- **Development First**: Optimize for development speed and learning

## 📋 Current Environment Status

### Phase 1: Development Only (Current)
```
✅ dev environment
   ├── 🏗️ AWS Infrastructure: alexa-voice-memo-dev-*
   ├── 🔧 Configuration: .env.dev
   ├── 🎤 Alexa Testing: Real Echo device
   ├── 🌿 Git Branch: develop
   └── 💰 Monthly Cost: ~$0.03

❌ staging environment (Not needed yet)
❌ production environment (Not needed yet)
```

### Environment Configuration
```bash
# Current .env.dev
CDK_ACCOUNT=498997347996
CDK_REGION=ap-northeast-1
CDK_ENV=dev

# Future environments (when needed)
# .env.stg - staging configuration
# .env.prod - production configuration
```

### Alexa Skills Configuration
```
📱 Amazon Developer Console Skills:

Current (Phase 1):
├── "Voice Memo" (dev skill)
│   ├── Endpoint: alexa-voice-memo-dev-handler
│   ├── Skill ID: amzn1.ask.skill.xxx-dev
│   ├── 🏠 Personal Echo device testing
│   └── Command: "アレクサ、ボイスメモを開いて"

Future (Phase 2 - Staging):
├── "Voice Memo Dev" (renamed for clarity)
├── "Voice Memo Staging" (new staging skill)
│   ├── Endpoint: alexa-voice-memo-stg-handler
│   ├── Skill ID: amzn1.ask.skill.xxx-stg
│   ├── 🧪 UAT/stakeholder testing
│   └── Command: "アレクサ、ボイスメモ検証版を開いて"

Future (Phase 3 - Production):
└── "Voice Memo" (public production skill)
    ├── Endpoint: alexa-voice-memo-prod-handler
    ├── Skill ID: amzn1.ask.skill.xxx-prod
    ├── 🌍 Alexa Skills Store public release
    └── Command: "アレクサ、ボイスメモを開いて"
```

**Single Device Testing Strategy:**
- One Echo device can test multiple skills
- Different invocation names distinguish environments
- Dev/staging skills remain private (testing only)
- Production skill becomes publicly available

## 🚀 CI/CD Pipeline Status

### Current Setup
```yaml
Branches → Environments:
├── develop branch → alexa-voice-memo-dev (✅ Active)
├── staging branch → alexa-voice-memo-stg (⏸️ Prepared)
└── production branch → alexa-voice-memo-prod (⏸️ Prepared)
```

### GitHub Actions Workflow
- ✅ **Automated Testing**: All pushes trigger tests
- ✅ **Development Deployment**: `develop` branch → auto deploy to dev
- ⏸️ **Staging Deployment**: Ready but not needed yet
- ⏸️ **Production Deployment**: Ready but not needed yet

## 📊 When to Scale Environments

### Triggers for Adding Staging Environment
- [ ] Multiple developers working simultaneously
- [ ] Complex features requiring pre-production testing
- [ ] Need for user acceptance testing (UAT)
- [ ] Monthly active users > 50
- [ ] Business stakeholder review requirements

### Triggers for Adding Production Environment
- [ ] Public release to Alexa Skills Store
- [ ] SLA requirements (uptime guarantees)
- [ ] Compliance requirements (data separation)
- [ ] Monthly active users > 500
- [ ] Revenue generation from service

## 🛠️ Environment Expansion Checklist

### Adding Staging Environment
```bash
# 1. Configuration
- [ ] Create .env.stg file
- [ ] Set CDK_ENV=stg variables
- [ ] Configure different AWS account (optional)

# 2. Infrastructure
- [ ] cdk deploy alexa-voice-memo-stg
- [ ] Verify DynamoDB table creation
- [ ] Verify Lambda function deployment

# 3. Alexa Integration
- [ ] Create separate Alexa Skill for staging
- [ ] Configure staging endpoint
- [ ] Test basic functionality

# 4. CI/CD
- [ ] Enable staging deployment workflow
- [ ] Configure staging secrets in GitHub
- [ ] Test automated deployment

# 5. Documentation
- [ ] Update deployment guides
- [ ] Document staging-specific procedures
- [ ] Update architecture diagrams
```

### Adding Production Environment
```bash
# 1. Security Review
- [ ] Conduct security audit
- [ ] Review IAM permissions
- [ ] Implement monitoring/alerting
- [ ] Setup backup procedures

# 2. Configuration
- [ ] Create .env.prod file
- [ ] Use separate AWS account (recommended)
- [ ] Configure production secrets

# 3. Infrastructure
- [ ] Deploy production stack
- [ ] Setup CloudWatch dashboards
- [ ] Configure automated backups
- [ ] Setup disaster recovery

# 4. Alexa Store Preparation
- [ ] Submit skill for certification
- [ ] Prepare store listing
- [ ] Configure production endpoints
- [ ] Complete privacy/terms documentation

# 5. Monitoring
- [ ] Setup CloudWatch alarms
- [ ] Configure error notifications
- [ ] Implement health checks
- [ ] Setup cost monitoring
```

## 💡 Cost Management

### Current Costs (Dev Only)
```
DynamoDB On-Demand: ~$0.01/month
Lambda Requests: ~$0.01/month
CloudWatch Logs: ~$0.01/month
Total: ~$0.03/month
```

### Projected Costs (All Environments)
```
Dev Environment: ~$0.03/month
Staging Environment: ~$0.05/month
Production Environment: ~$0.20/month (with monitoring)
Total: ~$0.28/month
```

## 🔐 Security Considerations

### Current Security (Dev)
- ✅ IAM least privilege access
- ✅ DynamoDB encryption at rest
- ✅ VPC isolation not required (serverless)
- ✅ HTTPS/TLS for all communications

### Additional Security (Staging/Prod)
- [ ] Separate AWS accounts for isolation
- [ ] Enhanced monitoring and alerting
- [ ] Automated security scanning
- [ ] Compliance documentation
- [ ] Access logging and audit trails

## 📚 Documentation Updates Required

### When Adding Environments
- [ ] Update deployment-guide.md
- [ ] Update architecture.md diagrams
- [ ] Update testing-guide.md procedures
- [ ] Update CLAUDE.md instructions
- [ ] Update README.md status

### When Going to Production
- [ ] Create operations runbook
- [ ] Document incident response procedures
- [ ] Create monitoring playbooks
- [ ] Update legal documentation
- [ ] Create user onboarding guides

## 🎯 Success Metrics

### Development Phase (Current)
- [x] Rapid iteration cycles
- [x] Low operational overhead
- [x] Cost under $1/month
- [x] Single developer productivity

### Staging Phase (Future)
- [ ] Multi-developer collaboration
- [ ] Pre-production validation
- [ ] UAT process efficiency
- [ ] Deployment confidence

### Production Phase (Future)
- [ ] 99.9% uptime SLA
- [ ] < 2s response times
- [ ] User satisfaction > 4.5/5
- [ ] Cost efficiency at scale

## 🚨 Emergency Procedures

### Environment Rollback
```bash
# Quick rollback to previous version
git checkout v1.0.0
export CDK_ENV=dev
cdk deploy alexa-voice-memo-dev

# Emergency stack deletion (if needed)
cdk destroy alexa-voice-memo-dev --force
```

### Data Recovery
```bash
# DynamoDB point-in-time recovery
aws dynamodb restore-table-to-point-in-time \
  --target-table-name alexa-voice-memo-dev-memos-recovered \
  --source-table-name alexa-voice-memo-dev-memos \
  --restore-date-time 2025-07-12T10:00:00.000Z
```

---

## 📋 Next Steps (Priority Order)

1. **Immediate** (This week):
   - [ ] Configure GitHub Actions secrets
   - [ ] Test develop branch auto-deployment
   - [ ] Document any deployment issues

2. **Short Term** (This month):
   - [ ] Add monitoring to dev environment
   - [ ] Implement basic health checks
   - [ ] Optimize Lambda cold starts

3. **Medium Term** (When needed):
   - [ ] Evaluate staging environment need
   - [ ] Plan production environment strategy
   - [ ] Consider multi-region deployment

4. **Long Term** (6+ months):
   - [ ] Advanced monitoring and analytics
   - [ ] Multi-tenant architecture
   - [ ] Cost optimization strategies

Remember: **Environment complexity should grow with business needs, not ahead of them!** 🎯