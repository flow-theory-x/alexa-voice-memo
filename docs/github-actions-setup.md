# GitHub Actions 自動デプロイ設定

## 概要
develop/mainブランチへのプッシュで自動的にAWSへデプロイされます。

## セットアップ手順

### 1. GitHub Secretsの設定
GitHubリポジトリの Settings > Secrets and variables > Actions で以下を設定：

- `AWS_ACCESS_KEY_ID`: AWSアクセスキーID
- `AWS_SECRET_ACCESS_KEY`: AWSシークレットアクセスキー

### 2. AWS IAM権限
デプロイ用のIAMユーザーには以下の権限が必要：
- CloudFormation（スタック作成・更新）
- S3（バケット作成・オブジェクト更新）
- Lambda（関数作成・更新）
- DynamoDB（テーブル作成）
- API Gateway（API作成・更新）
- IAM（ロール作成 - CDK用）
- CloudWatch Logs（ログ作成）

推奨: `PowerUserAccess` + IAMロール作成権限

### 3. ブランチ戦略
- `develop` → dev環境へ自動デプロイ
- `main` → prod環境へ自動デプロイ

### 4. デプロイフロー
1. コードをプッシュ
2. GitHub Actionsが自動起動
3. TypeScriptビルド
4. CDKデプロイ実行
5. S3へフロントエンド配置

### 5. デプロイ確認
Actions タブでデプロイ状況を確認できます。
成功時にS3のURLが表示されます。

## トラブルシューティング

### CDKブートストラップエラー
初回デプロイ前に手動で実行：
```bash
cdk bootstrap aws://ACCOUNT-ID/ap-northeast-1
```

### 権限エラー
IAMユーザーの権限を確認してください。