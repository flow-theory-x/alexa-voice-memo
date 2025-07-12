# Alexa Voice Memo - CDK実装仕様書

*2025-07-12*

## 🎯 実装方針

### アーキテクチャ戦略
- **アプリケーション**: 独立リポジトリ（`alexa-voice-memo`）で開発
- **インフラ**: 独立CDKプロジェクトで管理
- **管理方針**: 完全独立管理（bootstrapのみ共有）

### 既存CDK環境活用
- **Bootstrap**: web3cdkの既存bootstrap活用（同一AWSアカウント・リージョン）
- **スタック**: 完全独立管理
- **リポジトリ**: alexa-voice-memo独立リポジトリで管理

## 🏗️ インフラ仕様

### CDKスタック設計

#### alexa-voice-memo-stack.ts
```typescript
export interface AlexaVoiceMemoStackProps extends cdk.StackProps {
  projectName: string;
  environment: string;
}

export class AlexaVoiceMemoStack extends cdk.Stack {
  public readonly alexaLambda: lambda.Function;
  public readonly memoTable: dynamodb.Table;
  public readonly alexaRole: iam.Role;
}
```

### AWS リソース構成

#### 1. DynamoDB テーブル
```yaml
テーブル名: alexa-voice-memo-{env}-memos
パーティションキー: userId (String)
ソートキー: memoId (String)
グローバルセカンダリインデックス: 
  - timestamp-index (timestamp用)
  - status-index (deleted用)
```

#### 2. Lambda 関数
```yaml
関数名: alexa-voice-memo-{env}-handler
ランタイム: Node.js 20.x
メモリ: 256MB
タイムアウト: 30秒
環境変数:
  - MEMO_TABLE_NAME: DynamoDBテーブル名
  - ENVIRONMENT: dev/stg/prod
```

#### 3. IAM ロール
```yaml
ロール名: alexa-voice-memo-{env}-lambda-role
ポリシー:
  - DynamoDB: Table読み書き権限
  - CloudWatch: ログ出力権限
  - Alexa Skills Kit: 基本権限
```

## 📊 データ設計

### DynamoDB スキーマ

#### メインテーブル: memos
```json
{
  "userId": "amzn1.ask.account.xxx",      // パーティションキー
  "memoId": "memo_20250712_001",          // ソートキー
  "text": "牛乳を買う",                    // メモ内容
  "timestamp": "2025-07-12T10:30:00.000Z", // 作成日時
  "deleted": false,                       // 削除フラグ
  "createdAt": "2025-07-12T10:30:00.000Z",
  "updatedAt": "2025-07-12T10:30:00.000Z",
  "version": 1                           // 楽観的ロック用
}
```

#### インデックス構成
```yaml
GSI1: timestamp-index
  - パーティションキー: userId
  - ソートキー: timestamp
  - 用途: 時系列順でのメモ取得

GSI2: status-index  
  - パーティションキー: userId
  - ソートキー: deleted
  - 用途: アクティブなメモのみの取得
```

## 🔧 Lambda実装仕様

### ハンドラー構成
```typescript
// src/handler.ts
export interface AlexaRequest {
  version: string;
  session: AlexaSession;
  context: AlexaContext;
  request: AlexaRequestBody;
}

export interface MemoItem {
  userId: string;
  memoId: string;
  text: string;
  timestamp: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

### API設計
```typescript
// Alexa Skills Kit ハンドラー
- LaunchRequestHandler: スキル起動
- AddMemoIntentHandler: メモ追加
- ReadMemosIntentHandler: メモ読み上げ
- DeleteMemoIntentHandler: メモ削除
- HelpIntentHandler: ヘルプ
- CancelAndStopIntentHandler: 終了
- ErrorHandler: エラー処理
```

### DynamoDB操作
```typescript
// src/services/memo-service.ts
export class MemoService {
  async addMemo(userId: string, text: string): Promise<MemoItem>
  async getActiveMemos(userId: string): Promise<MemoItem[]>
  async deleteMemo(userId: string, memoId: string): Promise<void>
  async getMemoById(userId: string, memoId: string): Promise<MemoItem | null>
}
```

## 🚀 デプロイ仕様

### 独立CDKプロジェクト

#### alexa-voice-memo/cdk.json
```json
{
  "app": "npx ts-node --project tsconfig.json bin/alexa-voice-memo.ts",
  "context": {
    "@aws-cdk/core:enableStackNameDuplicates": true,
    "aws-cdk:enableDiffNoFail": true
  }
}
```

#### bin/alexa-voice-memo.ts
```typescript
#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AlexaVoiceMemoStack } from '../lib/alexa-voice-memo-stack';

const app = new cdk.App();

const environment = process.env.CDK_ENV || 'dev';
const account = process.env.CDK_ACCOUNT;
const region = process.env.CDK_REGION || 'ap-northeast-1';

new AlexaVoiceMemoStack(app, `alexa-voice-memo-${environment}`, {
  env: { account, region },
  environment: environment,
});
```

#### 環境変数
```bash
# .env
CDK_ACCOUNT=your-aws-account-id
CDK_REGION=ap-northeast-1
CDK_ENV=dev
```

### デプロイ手順
```bash
# 1. 環境変数設定
export CDK_ACCOUNT=your-aws-account-id
export CDK_REGION=ap-northeast-1
export CDK_ENV=dev

# 2. CDK差分確認
cdk diff

# 3. デプロイ実行
cdk deploy alexa-voice-memo-dev

# 4. 削除（必要時）
cdk destroy alexa-voice-memo-dev
```

## 🧪 テスト仕様

### インフラテスト
```typescript
// test/alexa-voice-memo-stack.test.ts
describe('AlexaVoiceMemoStack', () => {
  test('DynamoDB table created with correct configuration');
  test('Lambda function has proper IAM permissions');
  test('Environment variables are set correctly');
});
```

### 統合テスト
```bash
# DynamoDB接続テスト
# Lambda実行テスト  
# Alexa Skills Kit統合テスト
```

## 🔐 セキュリティ仕様

### IAM最小権限
```yaml
DynamoDB権限:
  - dynamodb:GetItem
  - dynamodb:PutItem
  - dynamodb:UpdateItem
  - dynamodb:Query
  - dynamodb:Scan (制限付き)

CloudWatch権限:
  - logs:CreateLogGroup
  - logs:CreateLogStream
  - logs:PutLogEvents
```

### データ保護
```yaml
DynamoDB:
  - 暗号化: AWS管理キー
  - バックアップ: 継続的バックアップ有効
  - タグ: 適切なタグ設定

Lambda:
  - VPC: パブリックサブネット（Alexa Skills Kit要件）
  - 環境変数: 機密情報なし
```

## 📋 運用仕様

### モニタリング
```yaml
CloudWatch Metrics:
  - Lambda実行時間
  - Lambda エラー率
  - DynamoDB 読み書きユニット
  - DynamoDB スロットリング

CloudWatch Alarms:
  - Lambda エラー率 > 5%
  - DynamoDB スロットリング発生
  - 実行時間 > 25秒
```

### ログ管理
```yaml
Lambda Logs:
  - 保持期間: 30日（dev）/ 90日（prod）
  - ログレベル: INFO以上
  - 構造化ログ: JSON形式

DynamoDB Logs:
  - アクセスログ: CloudTrail
  - パフォーマンス: CloudWatch Insights
```

### バックアップ・災害復旧
```yaml
DynamoDB:
  - 継続的バックアップ: 35日間
  - オンデマンドバックアップ: 週次
  - 復旧時間目標: 4時間

Lambda:
  - コード: Git管理
  - 設定: CDKコード管理
  - 復旧時間目標: 30分
```

## 🎯 パフォーマンス仕様

### レスポンス要件
```yaml
Alexa応答時間:
  - 目標: 3秒以内
  - 最大: 8秒（Alexa制限）

DynamoDB性能:
  - 読み込み: 1ms以内
  - 書き込み: 5ms以内
  - スループット: オンデマンド
```

### スケーラビリティ
```yaml
同時実行:
  - Lambda: 100同時実行まで
  - DynamoDB: オンデマンドで自動調整

ユーザー数:
  - 想定: 1-10ユーザー（個人利用）
  - 最大: 1000ユーザーまで対応可能
```

## 💰 コスト仕様

### 想定コスト（月額・dev環境）
```yaml
DynamoDB:
  - オンデマンド: ~$0.01
  - ストレージ: ~$0.01

Lambda:
  - 実行時間: ~$0.01
  - リクエスト: ~$0.01

CloudWatch:
  - ログ: ~$0.05
  - メトリクス: ~$0.01

合計: ~$0.10/月
```

### コスト最適化
```yaml
開発環境:
  - DynamoDB: オンデマンド
  - Lambda: 最小リソース
  - ログ保持: 短期間

本番環境:
  - DynamoDB: プロビジョンド（必要に応じて）
  - Lambda: 適切なサイジング
  - モニタリング強化
```

## 📁 ディレクトリ構成

### alexa-voice-memo リポジトリ（独立）
```
alexa-voice-memo/
├── bin/
│   └── alexa-voice-memo.ts           # CDKアプリエントリーポイント
├── lib/
│   └── alexa-voice-memo-stack.ts     # CDKスタック定義
├── src/
│   ├── handler.ts                    # Lambdaハンドラー
│   ├── services/
│   │   └── memo-service.ts           # DynamoDB操作
│   └── types/
│       └── alexa-types.ts            # 型定義
├── test/
│   └── alexa-voice-memo-stack.test.ts
├── cdk.json                          # CDK設定
├── package.json
├── tsconfig.json
└── README.md
```

## 🔄 開発フロー

### 1. インフラ先行開発
```bash
# 1. CDKスタック実装
# 2. インフラデプロイ
# 3. 接続テスト
```

### 2. アプリケーション開発
```bash
# 1. 別リポジトリでLambda実装
# 2. ローカルテスト
# 3. デプロイ・統合テスト
```

### 3. 継続的改善
```bash
# 1. モニタリング確認
# 2. パフォーマンス調整
# 3. 機能拡張
```

---

## ✅ 次のアクション

1. **CDKスタック実装**: AlexaVoiceMemoStack作成
2. **web3cdk統合**: bin/web3cdk.tsに追加
3. **デプロイテスト**: dev環境での動作確認
4. **アプリリポジトリ作成**: alexa-voice-memo独立開発開始

---

*この仕様書に基づいて、まずCDKスタック実装から開始しましょう*