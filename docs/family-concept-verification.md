# 家族機能コンセプト検証仕様書

## 1. コンセプトの定義

### 基本原則
```
familyId = 筆頭者のuserId
```

### 設計思想
- **家族は運命共同体**: 全員が同じ権限を持つ
- **シンプルな状態管理**: 追加テーブルなし、状態遷移が明確
- **直感的な操作**: 現実世界のメタファーをそのまま反映

## 2. 検証項目

### 2.1 データモデル検証

#### ユーザー情報レコード
- [ ] userId = memoId となるレコードが存在するか
- [ ] familyIdフィールドが正しく設定されているか
- [ ] 初期状態でfamilyId = userIdか

#### メモレコード
- [ ] familyIdが全てのメモに設定されているか
- [ ] family-timestamp-indexが正しく機能するか
- [ ] 削除フラグが論理削除を実現しているか

### 2.2 状態遷移検証

#### 初期状態（一人）
```
検証ID: ST-001
前提: 新規ユーザー
操作: 初回ログイン
期待結果:
- familyId = userId
- 自分のメモのみ表示
- メンバー数 = 1
```

#### 家族作成（招待）
```
検証ID: ST-002
前提: 一人の状態
操作: 招待コード生成
期待結果:
- 4桁の招待コード生成
- 招待コードテーブルに登録
- TTL = 300秒（5分）
- familyIdは変更なし
```

#### 家族参加
```
検証ID: ST-003
前提: 有効な招待コード
操作: 招待コードで参加
期待結果:
- familyId = 招待者のfamilyId
- 家族全員のメモが表示
- メンバー数が増加
- 招待コードが削除される
```

#### 家族退出
```
検証ID: ST-004
前提: 家族メンバー（非筆頭者）
操作: 家族から退出
期待結果:
- familyId = userId（自分に戻る）
- 自分のメモのみ表示
- 元家族のメンバー数が減少
```

### 2.3 筆頭者の特殊ルール

#### 筆頭者の識別
```
検証ID: OW-001
検証内容: familyId === userId で筆頭者判定
確認項目:
- UIで「筆頭者」バッジ表示
- 退出ボタンの無効化（未実装？）
```

#### 筆頭者の移譲
```
検証ID: OW-002
前提: 筆頭者で家族が2人以上
操作: 筆頭者を他メンバーに移譲
期待結果:
- 全メンバーのfamilyId更新
- 新筆頭者のfamilyId = 新筆頭者のuserId
- 旧筆頭者は通常メンバーに
```

### 2.4 エッジケース検証

#### 同時操作
```
検証ID: EC-001
シナリオ: 2人が同時に同じ招待コードを使用
期待結果: 1人目は成功、2人目はエラー
```

#### ユーザーレコードなし
```
検証ID: EC-002  
シナリオ: ユーザーレコードなしでメモ追加
期待結果: ユーザーレコード自動作成
```

#### 招待コード重複
```
検証ID: EC-003
シナリオ: 同じ招待コードが生成される
期待結果: DynamoDBのキー制約でエラー（リトライ必要？）
```

#### 循環参照防止
```
検証ID: EC-004
シナリオ: A→B→C→Aのような参照
期待結果: 設計上発生不可能（要確認）
```

### 2.5 異なるIDプロバイダー間の連携

#### Web（Google）→ Alexa（Amazon）
```
検証ID: ID-001
前提: Webユーザーが家族作成
操作: Alexaが招待コードで参加
期待結果:
- 異なるuserIdで同じfamilyId
- 両者のメモが相互に見える
```

#### Alexa → Web
```
検証ID: ID-002
前提: Alexaユーザーが存在
操作: Webユーザーが招待で参加
期待結果: ID-001と同様
```

### 2.6 データ整合性検証

#### メモの所有権
```
検証ID: DI-001
確認項目:
- メモのuserIdは作成者
- メモのfamilyIdは家族ID
- 削除は家族全員が可能
```

#### 過去データの扱い
```
検証ID: DI-002
シナリオ: 家族参加前のメモ
期待結果: familyIdが更新されない（個人のまま）
課題: 過去メモの共有方法？
```

## 3. 実装状況チェックリスト

### Backend（Lambda/DynamoDB）
- [ ] getFamilyIdメソッドの実装
- [ ] ユーザーレコード作成ロジック
- [ ] 家族参加時のfamilyId更新
- [ ] 筆頭者の退出制限

### Frontend（Web UI）
- [ ] 筆頭者バッジの表示
- [ ] 退出ボタンの条件付き表示
- [ ] メンバー数の正確な表示
- [ ] 招待コードの有効期限表示

### Alexa Skills
- [ ] JoinFamilyIntentの実装
- [ ] ユーザーレコード作成の確実性
- [ ] 家族メモの読み上げ

## 4. 自動テストの提案

### ユニットテスト
```typescript
describe('Family Concept', () => {
  test('初期状態でfamilyId = userId', async () => {
    const user = await createUser('user1');
    expect(user.familyId).toBe(user.userId);
  });

  test('招待参加でfamilyId更新', async () => {
    const owner = await createUser('owner');
    const code = await generateInviteCode(owner.userId);
    const member = await joinFamily('member', code);
    expect(member.familyId).toBe(owner.userId);
  });

  test('筆頭者は退出不可', async () => {
    const owner = await createUser('owner');
    await addMember(owner, 'member');
    await expect(leaveFamily(owner)).rejects.toThrow();
  });
});
```

### 統合テスト
```typescript
describe('Cross-Platform Family', () => {
  test('Google/Amazon ID統合', async () => {
    const googleUser = await webLogin('google-user');
    const inviteCode = await generateInviteCode(googleUser);
    const alexaUser = await alexaJoinFamily('amzn1.ask.account...', inviteCode);
    
    const googleMemos = await getMemos(googleUser);
    const alexaMemos = await getMemos(alexaUser);
    
    expect(googleMemos).toEqual(alexaMemos);
  });
});
```

## 5. 検証実施計画

### Phase 1: 現状確認（1日）
- 実装コードのレビュー
- 手動テストによる動作確認
- 問題点の洗い出し

### Phase 2: 修正実装（2-3日）
- 検証で発見された問題の修正
- 不足機能の実装
- エラーハンドリング強化

### Phase 3: 自動テスト構築（2日）
- ユニットテスト実装
- 統合テスト実装
- CI/CDへの組み込み

### Phase 4: ドキュメント整備（1日）
- ユーザーガイド作成
- 開発者向けドキュメント
- トラブルシューティングガイド

## 6. 成功基準

1. **全ての検証項目がPASSする**
2. **エッジケースでもシステムが破綻しない**
3. **ユーザーが直感的に理解できる動作**
4. **異なるIDプロバイダー間でシームレスな連携**

---

この検証仕様書に基づいて、家族機能のコンセプトが正しく実装されているか確認し、必要な修正を行います。