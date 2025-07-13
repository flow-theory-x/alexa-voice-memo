# Alexa Voice Memo - Claude Development Configuration

*Generated from ideanotes project using スモールスタート原則 - 2025-07-12*

## 🎯 Project Context

### Project Origin
このプロジェクトは**ideanotes**で設計・準備されたプロジェクトです：
- **開発判定スコア**: 79.2/100（開発GO判定済み）
- **設計完了度**: 100%（完全仕様書作成済み）
- **技術実現可能性**: 90/100（非常に高い）
- **開発リソース**: 85/100（十分確保）

### ideanotes Philosophy
- **スモールスタート原則**: 50%決まれば開発開始OK
- **段階的改善**: MVP→機能拡張の段階的開発
- **学習重視**: 技術習得と検証を主目的
- **実用性優先**: 完璧より動くものを早く

## 📋 開発指針

### 最優先事項
1. **仕様書準拠**: `docs/cdk-specification.md`が完全な設計仕様
2. **段階的実装**: Phase 1-4の順序で実装
3. **MVP優先**: 基本3機能（追加・読み上げ・削除）をまず完成
4. **学習記録**: 開発プロセスも学習材料として記録

### 技術スタック
- **CDK**: TypeScript（AWS CDK v2）
- **Lambda**: Node.js 20.x + TypeScript
- **データベース**: DynamoDB（オンデマンド）
- **ログ**: CloudWatch Logs（構造化ログ）

## 🚀 Implementation Strategy

### Phase 1: Infrastructure First (最優先)
```bash
# 1. CDK project setup
cdk init app --language typescript

# 2. AlexaVoiceMemoStack implementation
# 3. DynamoDB + Lambda + IAM setup
# 4. First deployment

# Success criteria: cdk deploy succeeds
```

### Phase 2: Core Lambda Implementation
```typescript
// Goal: Working memo operations
1. Basic handler structure
2. AddMemo functionality  
3. ReadMemos functionality
4. DeleteMemo functionality
5. Error handling basics

// Success criteria: All 3 core functions work
```

### Phase 3: Testing & Polish
```bash
# Goal: Production-ready code
1. Unit tests
2. Integration tests
3. Error handling improvement
4. Performance optimization

# Success criteria: >80% test coverage, <3s response time
```

### Phase 4: Alexa Integration
```bash
# Goal: End-to-end Alexa skill
1. Alexa Developer Console setup
2. Interaction model
3. Skill endpoint configuration
4. Real device testing

# Success criteria: Voice commands work on real Alexa device
```

## 📚 Key Documentation

### Required Reading (実装前必読)
1. **[docs/cdk-specification.md](docs/cdk-specification.md)** - Complete technical specification
2. **[docs/architecture.md](docs/architecture.md)** - System architecture design
3. **[docs/development-guide.md](docs/development-guide.md)** - Development methodology

### Reference Documentation
- **[docs/setup-guide.md](docs/setup-guide.md)** - Environment setup
- **[docs/testing-guide.md](docs/testing-guide.md)** - Testing strategy
- **[docs/deployment-guide.md](docs/deployment-guide.md)** - Deployment procedures

## 🛠️ Development Environment

### Required Environment Variables
```bash
export CDK_ACCOUNT=your-aws-account-id
export CDK_REGION=ap-northeast-1
export CDK_ENV=dev
```

### Project Structure
```
alexa-voice-memo/
├── bin/
│   └── alexa-voice-memo.ts     # CDK app entry point
├── lib/
│   └── alexa-voice-memo-stack.ts # CDK stack definition
├── src/
│   ├── handler.ts              # Lambda handler
│   ├── services/
│   │   └── memo-service.ts     # DynamoDB operations
│   └── types/
│       └── alexa-types.ts      # Type definitions
├── test/
├── docs/                       # Complete documentation
├── cdk.json                    # CDK configuration
└── CLAUDE.md                   # This file
```

### Key Commands
```bash
# Development
npm run build                   # Compile TypeScript
npm run watch                   # Watch mode
npm test                        # Run tests

# CDK operations  
cdk diff                        # Show changes
cdk deploy alexa-voice-memo-dev # Deploy to dev
cdk destroy alexa-voice-memo-dev # Clean up
```

## 🎯 Success Metrics

### Technical Metrics
- [ ] CDK deployment successful
- [ ] All 3 core functions implemented
- [ ] Response time < 3 seconds
- [ ] Error rate < 5%
- [ ] Test coverage > 80%

### Learning Metrics
- [ ] Alexa Skills Kit understanding
- [ ] CDK infrastructure patterns learned
- [ ] DynamoDB design patterns applied
- [ ] Serverless architecture implemented

### Business Metrics
- [ ] Voice memo add/read/delete works
- [ ] Error handling graceful
- [ ] User experience smooth
- [ ] Cost < $1/month

## ⚠️ Important Notes

### 🔍 デプロイ前の必須確認
**CRITICAL**: デプロイ前には必ず`docs/deployment-checklist.md`を確認すること。
- ローカルテストを実施したか？
- 環境変数/シークレットは設定済みか？
- エラーハンドリングは考慮されているか？
- 非同期処理の完了待ちは実装されているか？

### Start Simple Philosophy
- **Don't over-engineer**: Start with minimal working implementation
- **Hard-code first**: Use static responses to test flow
- **Add complexity gradually**: MVP → features → polish
- **Deploy frequently**: Catch issues early

### Common Pitfalls to Avoid
- **Perfect first iteration**: 50%决まれば开始OK
- **Complex error handling**: Start basic, improve iteratively  
- **Premature optimization**: Working > fast initially
- **Scope creep**: Focus on core 3 functions first

### 🚨 デプロイの鉄則：ローカルテストファースト

**重要**: 17分の実装に2時間のデプロイで失敗した教訓から：
- **必ず** `docs/deployment-checklist.md` を確認
- **必ず** `docs/deployment-lessons.md` を読む（具体的な失敗例）
- **鉄則**: 実装時間 < デプロイ時間になったら立ち止まれ

**最低限のローカルテスト**:
```bash
npm run build && cdk synth    # CDK変更時
[new-tool] --help             # 新ツール使用時
```

### CDK Best Practices
- **Environment isolation**: Use CDK_ENV for dev/stg/prod
- **Minimal IAM permissions**: Only what's needed
- **Proper resource naming**: Include environment in names
- **Infrastructure as code**: Everything via CDK

## 🔧 Troubleshooting

### Common Issues
1. **CDK bootstrap not found**: Run `cdk bootstrap` in target account/region
2. **Permission denied**: Check AWS credentials and IAM permissions
3. **Lambda timeout**: Start with 30s timeout for development
4. **DynamoDB access**: Ensure Lambda has proper IAM role

### Debug Strategy
1. **CloudWatch Logs**: Check Lambda execution logs
2. **CDK diff**: Understand what will be deployed
3. **Unit tests**: Test components in isolation
4. **Console.log**: Liberal logging for debugging

## 📞 Support Resources

### Documentation References
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Alexa Skills Kit SDK](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs)
- [DynamoDB Documentation](https://docs.aws.amazon.com/amazondynamodb/)

### Original Project Context
- **ideanotes repository**: Source of methodology and specifications
- **Development logs**: ideanotes/columns/daily-learning/
- **Design process**: ideanotes/services/alexa-voice-memo/

---

## 🚀 Ready to Start!

1. **First action**: Read `docs/cdk-specification.md` completely
2. **Environment setup**: Configure AWS credentials and CDK_* variables
3. **CDK initialization**: `cdk init app --language typescript`
4. **Implementation start**: Follow Phase 1 in development-guide.md

**Remember**: This project embodies ideanotes **スモールスタート原則** - start simple, improve iteratively, focus on learning and working solutions over perfection.

Good luck! 🎯