# 松蔭（showIN）リポジトリへの移行ガイド

## 新規リポジトリ作成手順

### 1. GitHubで新規リポジトリ作成
```bash
# GitHubで「showin」リポジトリを作成
# - Repository name: showin
# - Description: 松蔭（showIN） - 声でつなぐ、家族の知恵
# - Private/Public: お好みで
# - Initialize with READMEはチェックしない
```

### 2. ローカルでの作業
```bash
# 新しいディレクトリを作成
cd ~/develop
mkdir showin
cd showin

# 現在のalexa-voice-memoから必要なファイルをコピー
# （.git, node_modules, dist, build, cdk.outは除外）
rsync -av --exclude='.git' \
          --exclude='node_modules' \
          --exclude='dist' \
          --exclude='build' \
          --exclude='cdk.out' \
          --exclude='*.log' \
          --exclude='.env.*' \
          ~/develop/claude/alexa-voice-memo/ ./

# 新規Gitリポジトリとして初期化
git init
git add .
git commit -m "Initial commit: 松蔭（showIN） - Forked from alexa-voice-memo"

# GitHubリモートを追加
git remote add origin https://github.com/YOUR_USERNAME/showin.git
git branch -M main
git push -u origin main
```

### 3. 環境ファイルの再作成
```bash
# 環境変数ファイルをコピー（機密情報なので手動で）
cp ~/develop/claude/alexa-voice-memo/.env.dev .env.dev
cp ~/develop/claude/alexa-voice-memo/.env.prod .env.prod
```

### 4. GitHub Actions Secretsの設定
GitHubリポジトリの Settings > Secrets and variables > Actions で以下を設定：

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `CDK_ACCOUNT`
- `GOOGLE_CLIENT_ID_DEV`
- `GOOGLE_CLIENT_ID_PROD`

### 5. 依存関係のインストールとビルド
```bash
# 依存関係をクリーンインストール
npm install

# ビルドテスト
npm run build
npm run build:web-api
npm run build:frontend:dev
```

### 6. 最終確認
```bash
# alexa-voice-memoの文字列が残っていないか確認
grep -r "alexa-voice-memo" . --exclude-dir=node_modules --exclude-dir=.git

# AlexaVoiceMemoの文字列が残っていないか確認
grep -r "AlexaVoiceMemo" . --exclude-dir=node_modules --exclude-dir=.git
```

## デプロイ

### 開発環境
```bash
# CDKデプロイ
export CDK_ENV=dev
export CDK_ACCOUNT=your-account-id
export CDK_REGION=ap-northeast-1

cdk deploy showin-dev
```

### 本番環境
```bash
# mainブランチにマージすると自動デプロイ
git checkout -b release/v1.0.0
git push origin release/v1.0.0
# Pull Requestを作成してmainにマージ
```

## 移行後の確認事項

- [ ] 新リポジトリでビルドが成功する
- [ ] GitHub Actionsが正常に動作する
- [ ] 開発環境へのデプロイが成功する
- [ ] Alexaスキルのエンドポイントを新しいLambda ARNに更新
- [ ] フロントエンドが正常に動作する
- [ ] 家族機能が正常に動作する

## 古いリポジトリの扱い

1. **アーカイブ化を推奨**
   - Settings > General > Danger Zone
   - "Archive this repository"をクリック

2. **README更新**（アーカイブ前に）
   ```markdown
   # ⚠️ This repository has been moved to [showin](https://github.com/YOUR_USERNAME/showin)
   
   This is the old version of the project. Please use the new repository.
   ```

## トラブルシューティング

### package-lock.jsonの警告が出る場合
```bash
rm package-lock.json
npm install
```

### CDKデプロイでBootstrapエラーが出る場合
```bash
cdk bootstrap aws://${CDK_ACCOUNT}/${CDK_REGION}
```

---

これで完全に新しい「松蔭（showIN）」プロジェクトとしてスタートできます！