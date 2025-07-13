# Alexa JoinFamilyIntent 緊急修正手順

## 問題
- 「招待コード1234で参加」→「そのメモは存在しません」
- JoinFamilyIntentが認識されず、DeleteMemoIntentとして処理されている

## 即時解決手順

### 1. Alexa Developer Consoleで確認
1. https://developer.amazon.com/alexa/console/ask
2. 「ボイスメモ」スキルを選択
3. ビルド → 対話モデル → インテント

### 2. JoinFamilyIntentが存在するか確認
- リストにJoinFamilyIntentがない場合：手動で追加が必要

### 3. JSONエディターで一括更新（推奨）
1. ビルド → JSONエディター
2. 現在のJSONを全て削除
3. `alexa-skills/interaction-model.json`の内容を全てコピペ
4. 「モデルを保存」
5. 「モデルをビルド」（約1-2分）

### 4. ビルド完了後にテスト
1. テストタブ → 「開発中」に設定
2. 以下を試す：
   - 「家族参加 1234」
   - 「1234 参加」
   - 「招待 1234」

## 確認ポイント
- インテント一覧にJoinFamilyIntentが表示されるか
- スロットタイプがAMAZON.FOUR_DIGIT_NUMBERになっているか
- サンプル発話が登録されているか

## それでも認識されない場合
1. CloudWatch Logsで実際のインテント名を確認
2. 発話をもっとシンプルに：「参加 1234」
3. 数字を区切って：「参加 いち に さん よん」