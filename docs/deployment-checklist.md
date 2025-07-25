# デプロイ前チェックリスト

## 🔍 必須確認事項

### 1. ローカルテスト
- [ ] 変更した機能が**ローカルで動作確認済み**か？
- [ ] 新しいコマンド/ツールは**ローカルで実行成功**したか？
- [ ] エラーケースのテストは実施したか？

### 2. 環境変数・シークレット
- [ ] 新しい環境変数は**GitHub Secrets**に設定済みか？
- [ ] ハードコードされた値（ID、トークン等）はないか？
- [ ] シークレットの参照は`${{ secrets.XXX }}`形式か？

### 3. CI/CD設定
- [ ] **非同期処理**の完了待ちは考慮されているか？
- [ ] エラー時の**フォールバック処理**はあるか？
- [ ] **並行実行時の競合**は考慮されているか？
- [ ] 長いトークンは**heredoc**で処理しているか？

### 4. 権限・認証
- [ ] 必要な**IAMロール/権限**は設定済みか？
- [ ] API呼び出しの**認証情報**は正しく設定されているか？
- [ ] ファイル/ディレクトリの**書き込み権限**は考慮されているか？

### 5. エラーハンドリング
- [ ] 失敗しても**後続処理に影響しない**設計か？
- [ ] ログ出力で**デバッグ可能**か？
- [ ] **リトライ処理**は必要ないか？

## 📝 今回の教訓

### ask-cli導入時の失敗例
1. **ローカルテスト未実施** → 12回以上のCI/CD修正
2. **コマンド名の誤り** → `update-interaction-model` ❌ → `set-interaction-model` ✅
3. **トークン長の考慮不足** → コマンドライン長制限エラー
4. **heredoc記法の誤り** → `<< 'EOF'`で変数展開されず

### 改善策
```bash
# 1. まずローカルでコマンド確認
ask smapi set-interaction-model --help

# 2. 実際に実行してみる
ask smapi set-interaction-model \
  --skill-id $SKILL_ID \
  --stage development \
  --locale ja-JP \
  --interaction-model file:interaction-model.json

# 3. 成功したらCI/CDに組み込む
```

## 🚀 デプロイコマンド

```bash
# 通常のデプロイ（developブランチ）
git add .
git commit -m "feat: add delete all memos with confirmation"
git push origin develop

# 緊急修正の場合
git push origin develop --no-verify
```

## ⚠️ 最終確認

**「このデプロイで壊れる可能性があるものは？」**を必ず自問自答する。

### 🔴 警告サイン（即座に立ち止まるべき状況）
- [ ] 実装時間 < デプロイ準備時間になっていないか？
- [ ] 「これくらい動くだろう」と思っていないか？
- [ ] 新しいツールを初めて使うのにヘルプを見ていないか？
- [ ] CI/CDのデバッグを3回以上繰り返していないか？

**もし1つでも該当したら、ローカルテストに戻る**

---

*このチェックリストは継続的に更新してください。失敗から学んだことは必ずここに追記すること。*