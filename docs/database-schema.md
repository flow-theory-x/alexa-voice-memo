# Database Schema Documentation

## Overview

Voice Memo は3つの DynamoDB テーブルを使用してデータを管理しています。
すべてのテーブルはオンデマンド課金モードで、自動スケーリングされます。

## Tables

### 1. Memos Table
メモデータを保存するメインテーブル

**Table Name**: `alexa-voice-memo-${environment}-memos`

**Primary Key**:
- Partition Key: `userId` (String) - ユーザーID（Google ID または Alexa ID）
- Sort Key: `id` (String) - メモID（タイムスタンプ + ハッシュ）

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | String | Yes | ユーザーID |
| id | String | Yes | メモの一意識別子 |
| familyId | String | Yes | 家族グループID（UUID） |
| content | String | Yes | メモの内容 |
| timestamp | String | Yes | 作成日時（ISO 8601形式） |
| deleted | Boolean | No | 論理削除フラグ（デフォルト: false） |
| createdByName | String | No | 作成者の表示名 |

**Global Secondary Index (GSI)**:
- Name: `family-timestamp-index`
- Partition Key: `familyId` (String)
- Sort Key: `timestamp` (String)
- 用途: 家族単位でメモを時系列で取得

**サンプルデータ**:
```json
{
  "userId": "123456789012345678901",
  "id": "17207899123454abc",
  "familyId": "550e8400-e29b-41d4-a716-446655440000",
  "content": "牛乳を買う",
  "timestamp": "2025-07-14T09:30:15.123Z",
  "deleted": false,
  "createdByName": "太郎"
}
```

### 2. Users Table
ユーザー情報と家族関係を管理

**Table Name**: `alexa-voice-memo-${environment}-users`

**Primary Key**:
- Partition Key: `userId` (String) - ユーザーID

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | String | Yes | ユーザーID |
| familyId | String | Yes | 所属する家族ID |
| userName | String | Yes | 表示名 |
| email | String | No | メールアドレス（Googleユーザーのみ） |
| picture | String | No | プロフィール画像URL |
| isOwner | Boolean | Yes | 家族の当主フラグ |
| createdAt | String | Yes | アカウント作成日時 |
| updatedAt | String | Yes | 最終更新日時 |
| source | String | Yes | アカウントソース（"google" or "alexa"） |

**サンプルデータ**:
```json
{
  "userId": "123456789012345678901",
  "familyId": "550e8400-e29b-41d4-a716-446655440000",
  "userName": "山田太郎",
  "email": "taro@example.com",
  "picture": "https://lh3.googleusercontent.com/...",
  "isOwner": true,
  "createdAt": "2025-07-01T00:00:00.000Z",
  "updatedAt": "2025-07-14T09:30:00.000Z",
  "source": "google"
}
```

### 3. InviteCodes Table
家族招待コードを管理（5分間有効）

**Table Name**: `alexa-voice-memo-${environment}-invite-codes`

**Primary Key**:
- Partition Key: `code` (String) - 4桁の招待コード

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| code | String | Yes | 4桁の数字コード |
| familyId | String | Yes | 招待先の家族ID |
| createdBy | String | Yes | 作成者のユーザーID |
| createdAt | String | Yes | 作成日時 |
| expiresAt | String | Yes | 有効期限（作成から5分後） |
| used | Boolean | No | 使用済みフラグ |

**TTL (Time To Live)**:
- `expiresAt` フィールドを使用して自動削除
- 期限切れコードは DynamoDB が自動的に削除

**サンプルデータ**:
```json
{
  "code": "1234",
  "familyId": "550e8400-e29b-41d4-a716-446655440000",
  "createdBy": "123456789012345678901",
  "createdAt": "2025-07-14T09:30:00.000Z",
  "expiresAt": "2025-07-14T09:35:00.000Z",
  "used": false
}
```

## データアクセスパターン

### 1. メモの取得
```
Query on family-timestamp-index
WHERE familyId = :familyId
ORDER BY timestamp DESC
```

### 2. ユーザーの家族メンバー取得
```
1. Get user from Users table
2. Query Users table WHERE familyId = user.familyId
```

### 3. 招待コードの検証
```
Get from InviteCodes table WHERE code = :code
Check if not expired and not used
```

## インデックス戦略

### Primary Key 設計
- **Memos**: userId + id の複合キーで、ユーザーごとのメモを効率的に管理
- **Users**: userId 単一キーで、高速なユーザー検索
- **InviteCodes**: code 単一キーで、O(1) の検証

### GSI 設計
- **family-timestamp-index**: 家族単位でのメモ取得を最適化
- Sort Key に timestamp を使用して時系列ソート

## スケーリング考慮事項

### 現在の設計制限
- 1家族あたりの最大メンバー数: 制限なし（推奨: 10人以下）
- 1家族あたりの最大メモ数: 制限なし（実用上: 10,000件）
- 招待コード: 4桁数字（同時有効数: 最大10,000）

### 将来の拡張性
1. **Sharding**: familyId によるシャーディングが可能
2. **Archive**: 古いメモの別テーブルへのアーカイブ
3. **Cache**: 頻繁にアクセスされるデータの Redis キャッシュ

## セキュリティ

### 暗号化
- すべてのテーブルで保存時暗号化（Encryption at Rest）有効
- AWS KMS によるキー管理

### アクセス制御
- Lambda 関数のみがアクセス可能
- IAM ロールによる最小権限の原則

### データ保護
- ポイントインタイムリカバリ有効（7日間）
- 論理削除による誤削除防止

## コスト最適化

### オンデマンドモード
- トラフィックに応じた自動スケーリング
- 使用した分だけの課金
- 開発環境では月額 $0.01 未満

### TTL による自動削除
- 期限切れ招待コードの自動削除
- ストレージコストの削減

## マイグレーション

### スキーマ変更時の考慮事項
1. **後方互換性**: 新しい属性は optional として追加
2. **段階的移行**: 読み取り時にデフォルト値を設定
3. **バージョニング**: スキーマバージョンを属性として管理（将来）

### バックアップとリストア
```bash
# バックアップ
aws dynamodb create-backup \
  --table-name alexa-voice-memo-prod-memos \
  --backup-name memo-backup-$(date +%Y%m%d)

# リストア
aws dynamodb restore-table-from-backup \
  --target-table-name alexa-voice-memo-prod-memos-restored \
  --backup-arn arn:aws:dynamodb:...
```