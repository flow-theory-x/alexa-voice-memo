# 家族共有機能デバッグの教訓

## 問題の概要

**症状**: FLOWユーザーがログインしても自分のメモしか見えない（家族の他のメモが見えない）

**根本原因**: WebApiHandlerがユーザーレコード取得時にScanCommandを使用していたため、正しくfamilyIdを取得できなかった

## タイムライン

### 1. 初期の報告
- ユーザー: 「FLOWでログインしたのにFLOWのメモしか見えない」
- 実際の問題: WebApiHandlerがFLOWのfamilyIdを正しく取得できていない

### 2. 誤った方向への調査
- ❌ memo-service.tsに大量のログを追加
- ❌ 複雑なデバッグスクリプトを作成（check-family-status.js、debug-user-records.js）
- ❌ データの整合性を疑い、修正スクリプトを実行

### 3. 核心的な指摘
- ユーザー: 「GetCommandで取得しなきゃいけないものはFamilyIDだろ？」
- これが正解だったが、理解するまでに時間がかかった

### 4. 解決
```typescript
// Before (誤り)
const userScan = new ScanCommand({
  TableName: tableName,
  FilterExpression: 'userId = :userId',
  ExpressionAttributeValues: { ':userId': userId },
  Limit: 1
});

// After (正解)
const getUserCommand = new GetCommand({
  TableName: tableName,
  Key: {
    userId: userId,
    memoId: userId  // ユーザー情報レコードはuserId = memoId
  }
});
```

## 教訓

### 1. シンプルさの原則
- **問題**: 単純な問題を複雑化してしまった
- **教訓**: まず最もシンプルな解決策から試す
- **適用**: 「これ以上シンプルにできないか？」を常に問う

### 2. ユーザーの言葉を聞く
- **問題**: ユーザーが正しい指摘をしているのに理解できなかった
- **教訓**: ユーザーの言葉を素直に受け止める
- **適用**: 「最初からそれを言ってるんだが」と言われたら立ち止まる

### 3. DynamoDBのベストプラクティス
- **問題**: ScanCommandの不適切な使用
- **教訓**: 
  - 特定のアイテムを取得する場合は必ずGetCommandを使用
  - ScanCommandは全件検索が必要な場合のみ使用
  - Limit:1のScanは予期しない結果を返す可能性がある

### 4. アーキテクチャの理解
- **問題**: システムに2つのLambda関数があることを見落とした
- **教訓**: 
  - CloudWatchログは正しいLambda関数を確認する
  - CDKスタックの構造を理解してから作業する
  - `/aws/lambda/alexa-voice-memo-dev-handler` (Alexa用)
  - `/aws/lambda/alexa-voice-memo-dev-web-api` (Web API用)

### 5. デバッグの優先順位
1. **最初にすべきこと**:
   - エラーが発生している具体的な場所の特定
   - 該当箇所のコードを読む
   - シンプルな修正を試す

2. **避けるべきこと**:
   - 大量のログを追加する前に問題を理解する
   - 複雑なスクリプトを作る前に既存のコードを確認する
   - データを修正する前にコードの問題を疑う

## システム設計の重要な点

### familyIdの概念
```
familyId = 筆頭者（家族の最初のメンバー）のuserId
```

### ユーザーレコードの構造
```javascript
{
  userId: "113951560184250584927",      // ユーザーのID
  memoId: "113951560184250584927",      // userId = memoIdがユーザーレコード
  familyId: "102220884585798233202",    // 所属する家族のID
  userName: "FLOW Theory"
}
```

### 正しいユーザー情報の取得方法
```javascript
// ユーザー情報レコードを直接取得
const getUserCommand = new GetCommand({
  TableName: tableName,
  Key: {
    userId: userId,
    memoId: userId  // この条件がユーザーレコードを特定
  }
});
```

## まとめ

「極限までシンプルに」というシステムの肝を忘れず、複雑化する前に立ち止まることの重要性を学んだ。オッカムの剃刀の原則：最もシンプルな説明が往々にして正しい。

## 参考コマンド

```bash
# Web APIのログ確認（正しいLambda）
aws logs tail /aws/lambda/alexa-voice-memo-dev-web-api --since 5m

# デバッグ用のデータ確認
node scripts/debug-user-records.js

# 家族データの修正（必要な場合のみ）
node scripts/fix-family-integration.js
```