# Alexa Voice Memo - Documentation

_Generated from ideanotes project - 2025-07-12_

## 📋 Documentation Index

### 🎯 Core Specifications

- [**cdk-specification.md**](cdk-specification.md) - CDK 実装完全仕様書
- [**architecture.md**](architecture.md) - システムアーキテクチャ設計
- [**development-guide.md**](development-guide.md) - 開発手順とベストプラクティス

### 🔧 Implementation Guides

- [**setup-guide.md**](setup-guide.md) - 初期セットアップ手順
- [**lambda-implementation.md**](lambda-implementation.md) - Lambda 実装ガイド
- [**dynamodb-design.md**](dynamodb-design.md) - DynamoDB 設計詳細

### 🧪 Testing & Deployment

- [**testing-guide.md**](testing-guide.md) - テスト戦略と実行手順
- [**deployment-guide.md**](deployment-guide.md) - デプロイ手順とトラブルシューティング

### 📊 Operations

- [**monitoring-guide.md**](monitoring-guide.md) - モニタリング設定
- [**security-checklist.md**](security-checklist.md) - セキュリティチェックリスト

## 🚀 Quick Start

### 1. 環境準備

```bash
# AWS環境変数設定
export CDK_ACCOUNT=your-aws-account-id
export CDK_REGION=ap-northeast-1
export CDK_ENV=dev

# CDK初期化
cdk init app --language typescript
```

### 2. 実装開始

1. [setup-guide.md](setup-guide.md) で環境構築
2. [cdk-specification.md](cdk-specification.md) で仕様確認
3. [development-guide.md](development-guide.md) で実装開始

### 3. デプロイ

```bash
cdk diff
cdk deploy alexa-voice-memo-dev
```

## 🎯 Project Background

このプロジェクトは**ideanotes**の**スモールスタート原則**に基づいて設計されました：

- **開発判定スコア**: 79.2/100（開発 GO 判定）
- **技術実現可能性**: 90/100（非常に高い）
- **開発リソース**: 85/100（十分確保）

### ideanotes 設計思想の適用

- **50%決まれば開発開始 OK**: 完璧より実行重視
- **段階的改善**: MVP→ 機能拡張の段階的開発
- **学習重視**: 技術習得と検証を主目的
- **メタ記録**: 開発プロセス自体も学習材料

## 📚 関連リソース

### 原典プロジェクト

- **ideanotes**: [GitHub](https://github.com/flow-theory-x/ideanotes)
- **設計プロセス**: ideanotes/services/alexa-voice-memo/
- **方法論**: ideanotes/methodology/development-flow/

### 外部リソース

- [Alexa Skills Kit SDK](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

---

**開発開始前に必ず [cdk-specification.md](cdk-specification.md) を確認してください**
