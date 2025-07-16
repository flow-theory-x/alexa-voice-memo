# Alexaスキル設定ガイド - 松蔭（showIN）

## 既存スキルとの両立について

### ✅ 両立可能です！
- 既存の「voiceMEMO」スキルはそのまま維持
- 新規に「松蔭」スキルを作成
- ユーザーは好きな方を選択可能

## 新規スキル作成手順

### 1. Alexa Developer Consoleへアクセス
[https://developer.amazon.com/alexa/console/ask](https://developer.amazon.com/alexa/console/ask)

### 2. 新規スキル作成
- **スキル名**: 松蔭（しょういん）
- **デフォルト言語**: 日本語
- **モデル**: カスタム
- **ホスティング方法**: ユーザー定義のプロビジョニング

### 3. 呼び出し名の設定
推奨パターン：
- 「しょういん」（ひらがな）- 最も認識されやすい
- 「松蔭」（漢字）- ブランド名に忠実
- 「しょーいん」（長音符号付き）- 発音を明確に

### 4. インテントの設定
既存のvoiceMEMOと同じインテントを作成：

#### AddMemoIntent
```
サンプル発話：
- {content} を記録
- {content} をメモ
- {content} を追加
- {content} を覚えて
```

#### ReadMemosIntent
```
サンプル発話：
- メモを読んで
- メモを教えて
- 記録を読み上げて
- 何があるか教えて
```

#### DeleteMemoIntent
```
サンプル発話：
- {number} 番目を削除
- {number} 番を消して
- {number} 番目のメモを削除
```

#### InviteCodeIntent
```
サンプル発話：
- 招待 {code}
- 招待コード {code}
- {code} で招待
```

### 5. エンドポイント設定

#### 開発環境
```
arn:aws:lambda:ap-northeast-1:YOUR_ACCOUNT_ID:function:showin-dev-handler
```

#### 本番環境
```
arn:aws:lambda:ap-northeast-1:YOUR_ACCOUNT_ID:function:showin-prod-handler
```

### 6. Lambda関数の調整

新しいスキル用にメッセージを調整する場合：

```typescript
// src/handler.ts の LaunchRequest を修正
case "LaunchRequest":
  return buildResponse(
    "松蔭へようこそ。声でつなぐ、家族の知恵。メモを追加、読み上げ、削除ができます。",
    false
  );
```

## 移行戦略

### Phase 1: 並行運用（推奨）
1. 両スキルを並行運用
2. 新規ユーザーには「松蔭」を推奨
3. 既存ユーザーは引き続き「voiceMEMO」を使用可能

### Phase 2: 段階的移行
1. 「voiceMEMO」スキルに移行案内を追加
2. ユーザーに「松蔭」への移行を促す
3. 十分な移行期間を設ける（3-6ヶ月）

### Phase 3: 統合（オプション）
1. データ移行ツールの提供
2. 「voiceMEMO」スキルの新規受付停止
3. 最終的に「松蔭」に一本化

## テスト方法

### 1. Alexaシミュレーターでテスト
```
ユーザー：「アレクサ、松蔭を開いて」
Alexa：「松蔭へようこそ。声でつなぐ、家族の知恵。メモを追加、読み上げ、削除ができます。」

ユーザー：「牛乳を買うを記録」
Alexa：「牛乳を買う、をメモしました」
```

### 2. 実機テスト
- 開発者アカウントに紐づいたEchoデバイスで自動的に利用可能
- ベータテスターを招待して検証

## よくある質問

### Q: 同じDynamoDBを使えますか？
A: いいえ、新しいスタックでは別のDynamoDBテーブル（`showin-dev-memos`）が作成されます。データ共有が必要な場合は、別途データ同期の仕組みが必要です。

### Q: ユーザーは両方のスキルを有効化できますか？
A: はい、可能です。ただし、データは別々に管理されます。

### Q: スキル名の重複は大丈夫ですか？
A: 呼び出し名が異なれば問題ありません。「ボイスメモ」と「松蔭（しょういん）」は全く別の呼び出し名なので共存可能です。

## チェックリスト

- [ ] Alexa Developer Consoleで新規スキル作成
- [ ] 呼び出し名を「しょういん」に設定
- [ ] インテント（AddMemo、ReadMemos、DeleteMemo、InviteCode）を設定
- [ ] Lambda関数のARNをエンドポイントに設定
- [ ] Lambda関数のトリガーにAlexaスキルを追加
- [ ] テスト実施
- [ ] ベータテスト開始
- [ ] スキル公開申請

---

これで「voiceMEMO」と「松蔭」の両スキルが独立して運用可能になります！