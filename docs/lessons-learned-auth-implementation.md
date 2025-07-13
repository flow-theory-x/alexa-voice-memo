# 認証実装における学びと教訓

## 概要
Google Sign-In認証の実装とCI/CDパイプライン統合を通じて得られた知見をまとめる。

## 1. 秘密情報管理のアンチパターン

### ❌ 実装したアプローチ（二重管理）
```
ローカル開発: .env.dev → GOOGLE_CLIENT_ID_DEV
CI/CD: GitHub Secrets → GOOGLE_CLIENT_ID_DEV
```

### ✅ 理想的なアプローチ（単一管理）
```
AWS Secrets Manager
    ↓
ローカル開発: aws secretsmanager get-secret-value
CI/CD: 同じコマンドまたはSDK
```

### 学び
- 秘密情報は単一の真実の源（Single Source of Truth）で管理すべき
- クラウドネイティブなソリューション（Secrets Manager）を最初から採用
- `.env`ファイルとGitHub Secretsの二重管理は避ける

## 2. フロントエンドの静的ビルド戦略

### 実装した解決策
1. テンプレート化: `{{GOOGLE_CLIENT_ID}}`
2. ビルド時置換: `scripts/build-frontend.js`
3. 環境別ビルド: dev/stg/prod対応

### メリット
- ソースコードに秘密情報を含めない
- 環境別の設定が可能
- CI/CDパイプラインで自動化可能

## 3. CI/CDパイプラインの構築

### 追加した機能
```yaml
- name: Build Frontend
  run: |
    export GOOGLE_CLIENT_ID_DEV=${{ secrets.GOOGLE_CLIENT_ID_DEV }}
    npm run build:frontend -- --env=$CDK_ENV
```

### CDKとの統合
```typescript
// CDKでビルド済みフロントエンドをデプロイ
new s3deploy.BucketDeployment(this, 'FrontendDeployment', {
  sources: [s3deploy.Source.asset('./build/frontend')], // publicではなくbuild
  destinationBucket: frontendBucket,
});
```

## 4. セキュリティの改善点

### Before（脆弱性あり）
```javascript
// localStorage から userId を直接使用
const userId = localStorage.getItem('userId');
fetch('/api/memos', { 
  body: JSON.stringify({ userId }) 
});
```

### After（JWT認証）
```javascript
// Google Sign-In のJWTトークンを使用
const token = localStorage.getItem('googleToken');
fetch('/api/memos', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 5. 開発プロセスの教訓

### スモールスタート原則の正しい適用
1. **初期実装**: シンプルだが動作する（Client IDハードコード）
2. **成長段階**: セキュリティと環境管理の必要性
3. **改善実装**: 適切な秘密情報管理とCI/CD統合

### 重要な判断ポイント
- プロジェクトの規模と要件に応じた設計
- 将来の拡張性を考慮した基盤作り
- セキュリティは後回しにしない

## 6. 今後の改善提案

### 短期
- AWS Secrets Managerへの移行検討
- CloudFormationでのSecrets管理

### 長期
- AWS Cognitoの採用検討（より堅牢な認証基盤）
- マルチリージョン対応
- 監査ログの強化

## まとめ
「動くものを作る」ことと「正しく作る」ことのバランスが重要。スモールスタートは良いが、セキュリティと運用性は初期段階から考慮すべき。特に秘密情報管理は、最初からクラウドネイティブなソリューションを採用することで、後の技術的負債を避けられる。