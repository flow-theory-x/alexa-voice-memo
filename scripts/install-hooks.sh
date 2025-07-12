#!/bin/bash

# Git hooks インストールスクリプト

echo "📦 Git hooks をインストールしています..."

# .git/hooks ディレクトリにコピー
cp .github/hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push

echo "✅ Git hooks のインストールが完了しました"
echo ""
echo "🛡️ 以下の保護が有効になりました："
echo "  - CI/CD変更時の自動チェック"
echo "  - 実装時間 vs デプロイ時間の比較"
echo "  - ローカルテスト実施の確認"