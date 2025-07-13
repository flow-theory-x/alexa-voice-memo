# Alexaインテント認識のトラブルシューティング

## CloudWatch Logsで確認

1. AWS Console → CloudWatch → ロググループ
2. `/aws/lambda/alexa-voice-memo-dev-handler` を開く
3. 最新のログストリームを確認
4. `Request:` で始まるログを探す

```json
{
  "request": {
    "type": "IntentRequest",
    "intent": {
      "name": "実際に呼ばれたインテント名",
      "slots": {
        "スロット名": {
          "value": "認識された値"
        }
      }
    }
  }
}
```

## よくある問題

### 1. DeleteMemoIntentと誤認識される
- 「○○○○」が「4番目」と解釈される
- 解決策：より具体的な発話パターンを使う

### 2. 数字が認識されない
- 4桁の数字は区切って発音：「いち に さん よん」
- または通常の数の読み方：「せんにひゃくさんじゅうよん」

### 3. インテント自体が認識されない
- インタラクションモデルがビルドされていない
- Alexa Developer Consoleでモデルを再ビルド

## テスト用の発話例

最も認識されやすいパターン：
1. 「家族参加 いち に さん よん」
2. 「いち に さん よん で参加」
3. 「参加コード いち に さん よん」

## デバッグ用コード追加

handler.tsの最初に詳細ログを追加：
```typescript
console.log("Intent Name:", event.request.intent?.name);
console.log("Slots:", JSON.stringify(event.request.intent?.slots, null, 2));
```