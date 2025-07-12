# Web統合計画書 - Express + Lambda Integration

*Alexa Voice Memo Web Pages (Privacy Policy & Terms of Use)*

## 🎯 概要

既存のLambda関数にExpressを追加して、Alexa Skills Store申請に必要なWeb ページを提供する。

## 📋 実装計画

### Phase 1: Express環境構築

#### 1.1 依存関係追加
```bash
cd src/
npm install express serverless-http
npm install --save-dev @types/express
```

#### 1.2 新規ファイル作成
```
src/
├── handler.ts              # 既存: Alexa handler
├── memo-service.ts          # 既存: DynamoDB operations  
├── types.ts                 # 既存: Type definitions
├── web-handler.ts           # 新規: Express web handler
├── templates/               # 新規: HTML templates
│   ├── privacy-policy.html
│   └── terms-of-use.html
└── package.json             # 更新: Express依存関係追加
```

### Phase 2: Web Handler実装

#### 2.1 Express アプリケーション作成
```typescript
// src/web-handler.ts
import express from 'express';
import serverless from 'serverless-http';
import { readFileSync } from 'fs';
import { join } from 'path';

const app = express();

// 静的アセット配信
app.use(express.static('assets'));

// プライバシーポリシー
app.get('/privacy-policy', (req, res) => {
  const html = readFileSync(join(__dirname, 'templates/privacy-policy.html'), 'utf-8');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// 利用規約
app.get('/terms-of-use', (req, res) => {
  const html = readFileSync(join(__dirname, 'templates/terms-of-use.html'), 'utf-8');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'alexa-voice-memo-web' });
});

// Root page (スキル情報)
app.get('/', (req, res) => {
  res.json({ 
    name: 'Alexa Voice Memo',
    version: '1.0.0',
    description: '音声でメモを管理するAlexaスキル'
  });
});

export const webHandler = serverless(app);
```

#### 2.2 ルーティング振り分け実装
```typescript
// src/router.ts (新規)
import { AlexaRequest } from './types';
import { handler as alexaHandler } from './handler';
import { webHandler } from './web-handler';

export const router = async (event: any, context: any) => {
  console.log('Event source:', event.source || 'unknown');
  console.log('Request path:', event.path || 'no-path');
  
  // Alexa Skills Kit からのリクエスト
  if (event.session && event.request) {
    console.log('Routing to Alexa handler');
    return await alexaHandler(event as AlexaRequest);
  }
  
  // API Gateway からのHTTPリクエスト
  if (event.httpMethod || event.requestContext) {
    console.log('Routing to Web handler');
    return await webHandler(event, context);
  }
  
  // 不明なリクエスト
  return {
    statusCode: 400,
    body: JSON.stringify({ error: 'Unknown request type' })
  };
};
```

### Phase 3: CDK Infrastructure更新

#### 3.1 API Gateway追加
```typescript
// lib/alexa-voice-memo-stack.ts に追加

import * as apigateway from 'aws-cdk-lib/aws-apigateway';

// 既存のLambda関数を拡張
this.alexaLambda = new lambda.Function(this, 'Handler', {
  // 既存設定...
  handler: 'router.router', // handler.handler から変更
  // 既存設定...
});

// API Gateway 追加
const api = new apigateway.RestApi(this, 'WebApi', {
  restApiName: `${projectName}-${environment}-web-api`,
  description: 'Web pages for Alexa Voice Memo skill',
  defaultCorsPreflightOptions: {
    allowOrigins: apigateway.Cors.ALL_ORIGINS,
    allowMethods: apigateway.Cors.ALL_METHODS,
  },
});

// Lambda統合
const lambdaIntegration = new apigateway.LambdaIntegration(this.alexaLambda, {
  requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
});

// ルート設定
api.root.addMethod('GET', lambdaIntegration);
api.root.addResource('privacy-policy').addMethod('GET', lambdaIntegration);
api.root.addResource('terms-of-use').addMethod('GET', lambdaIntegration);
api.root.addResource('health').addMethod('GET', lambdaIntegration);

// カスタムドメイン（オプション）
// const domain = api.addDomainName('CustomDomain', {
//   domainName: 'alexa-voice-memo.your-domain.com',
//   certificate: certificate,
// });

// Output
new cdk.CfnOutput(this, 'WebApiUrl', {
  value: api.url,
  description: 'API Gateway URL for web pages',
});
```

### Phase 4: HTML テンプレート作成

#### 4.1 プライバシーポリシー
```html
<!-- src/templates/privacy-policy.html -->
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>プライバシーポリシー - Alexa Voice Memo</title>
    <style>
        body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; margin: 40px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #232F3E; border-bottom: 2px solid #FF9900; padding-bottom: 10px; }
        h2 { color: #232F3E; margin-top: 30px; }
        .last-updated { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>プライバシーポリシー</h1>
        <p class="last-updated">最終更新日: 2025年7月12日</p>
        
        <h2>1. 収集する情報</h2>
        <p>本サービス「ボイスメモ」では、以下の情報を収集します：</p>
        <ul>
            <li>音声コマンドの内容（メモのテキスト）</li>
            <li>Alexaユーザー識別子</li>
            <li>サービス利用日時</li>
        </ul>
        
        <h2>2. 情報の使用目的</h2>
        <p>収集した情報は以下の目的で使用します：</p>
        <ul>
            <li>メモの保存・管理機能の提供</li>
            <li>サービスの改善・最適化</li>
            <li>技術的問題の調査・解決</li>
        </ul>
        
        <h2>3. 情報の保存・管理</h2>
        <ul>
            <li>データはAmazon DynamoDBに暗号化して保存</li>
            <li>アクセスは利用者本人のみに制限</li>
            <li>データの不正アクセス防止措置を実施</li>
        </ul>
        
        <h2>4. 第三者への提供</h2>
        <p>以下の場合を除き、第三者にデータを提供することはありません：</p>
        <ul>
            <li>法的要請がある場合</li>
            <li>利用者の同意がある場合</li>
        </ul>
        
        <h2>5. データの削除</h2>
        <p>利用者は音声コマンドまたは連絡により、保存されたデータの削除を要求できます。</p>
        
        <h2>6. お問い合わせ</h2>
        <p>プライバシーに関するご質問は、Alexaアプリのスキルレビュー機能からご連絡ください。</p>
    </div>
</body>
</html>
```

#### 4.2 利用規約
```html
<!-- src/templates/terms-of-use.html -->
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>利用規約 - Alexa Voice Memo</title>
    <style>
        body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; margin: 40px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #232F3E; border-bottom: 2px solid #FF9900; padding-bottom: 10px; }
        h2 { color: #232F3E; margin-top: 30px; }
        .last-updated { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>利用規約</h1>
        <p class="last-updated">最終更新日: 2025年7月12日</p>
        
        <h2>1. サービス概要</h2>
        <p>「ボイスメモ」は、Amazon Alexaを通じて音声でメモを管理できるサービスです。</p>
        
        <h2>2. 利用条件</h2>
        <ul>
            <li>本サービスは無料で提供されます</li>
            <li>Alexaデバイスまたはアプリが必要です</li>
            <li>インターネット接続が必要です</li>
        </ul>
        
        <h2>3. 利用制限</h2>
        <p>以下の行為を禁止します：</p>
        <ul>
            <li>サービスの悪用・不正利用</li>
            <li>他者への迷惑行為</li>
            <li>法令に違反する行為</li>
        </ul>
        
        <h2>4. 免責事項</h2>
        <ul>
            <li>サービスの継続性は保証されません</li>
            <li>データ損失等の損害について一切の責任を負いません</li>
            <li>音声認識の精度は保証されません</li>
        </ul>
        
        <h2>5. サービスの変更・終了</h2>
        <p>事前の通知なくサービス内容の変更・終了を行う場合があります。</p>
        
        <h2>6. 規約の変更</h2>
        <p>本規約は予告なく変更される場合があります。変更後はAlexaアプリ内で通知します。</p>
    </div>
</body>
</html>
```

## 🚀 実装手順

### Step 1: 環境準備
```bash
# 1. 依存関係追加
cd src/
npm install express serverless-http
npm install --save-dev @types/express

# 2. ディレクトリ作成
mkdir -p templates
mkdir -p ../assets/icons
```

### Step 2: ファイル作成
```bash
# 3. テンプレートファイル作成
touch templates/privacy-policy.html
touch templates/terms-of-use.html

# 4. Express handler作成
touch web-handler.ts
touch router.ts
```

### Step 3: CDK更新
```bash
# 5. CDKスタック更新
# lib/alexa-voice-memo-stack.ts を編集

# 6. デプロイ
npm run build
cdk diff
cdk deploy
```

### Step 4: テスト
```bash
# 7. 動作確認
curl https://your-api-gateway-url/privacy-policy
curl https://your-api-gateway-url/terms-of-use
curl https://your-api-gateway-url/health

# 8. Alexa機能確認
# Developer Console でテスト実行
```

## 📊 予想実装時間

| タスク | 予想時間 | 詳細 |
|--------|----------|------|
| 依存関係追加 | 5分 | npm install |
| Express handler作成 | 20分 | TypeScript実装 |
| HTML テンプレート作成 | 30分 | プライバシーポリシー・利用規約 |
| CDK更新 | 15分 | API Gateway追加 |
| デプロイ・テスト | 10分 | 動作確認 |
| **合計** | **80分** | **1時間20分** |

## 🔧 後続作業

### Skill Manifest更新 ✅ 完了
```json
"privacyAndCompliance": {
  "locales": {
    "ja-JP": {
      "privacyPolicyUrl": "https://flow-theory-x.github.io/alexa-voice-memo/privacy-policy",
      "termsOfUseUrl": "https://flow-theory-x.github.io/alexa-voice-memo/terms-of-use"
    }
  }
}
```

### アイコン配置
```bash
# assets/icons/ に配置後
cp assets/icons/icon-108x108.png src/assets/
cp assets/icons/icon-512x512.png src/assets/
```

## ⚠️ 注意事項

1. **Lambda Cold Start**: Express追加により初回レスポンス時間が若干増加
2. **ルーティング**: Alexa/Web の振り分け確実に実装
3. **CORS設定**: Web アクセス時のCORS対応
4. **セキュリティ**: HTML インジェクション対策

## ✅ 完了チェックリスト

- [ ] Express依存関係追加
- [ ] Web handler実装
- [ ] HTML テンプレート作成
- [ ] Router実装
- [ ] CDK API Gateway追加
- [ ] デプロイ・動作確認
- [ ] Alexa機能継続確認
- [ ] Skill Manifest URL更新

---

**これで Alexa Skills Store 申請準備完了！** 🎉

*Web Integration Plan v1.0*  
*Ready for implementation*