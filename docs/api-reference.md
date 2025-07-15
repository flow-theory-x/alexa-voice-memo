# API Reference

## Overview

Voice Memo Web APIは、Google OAuth2.0認証を使用したRESTful APIです。
すべてのエンドポイントは認証が必要で、JWTトークンをBearerトークンとして使用します。

## Base URL

```
https://99nb4tfwu6.execute-api.ap-northeast-1.amazonaws.com/dev
```

## Authentication

すべてのAPIリクエストには、HTTPヘッダーに認証トークンが必要です：

```http
Authorization: Bearer <google-jwt-token>
```

### エラーレスポンス

認証エラーの場合：
```json
{
  "error": "認証が必要です"
}
```

JWTの有効期限切れの場合、自動的にログアウト処理が実行されます。

## Endpoints

### Memo Management

#### GET /api/memos
家族全員のメモ一覧を取得します（削除済みメモを含む）。

**Response:**
```json
[
  {
    "id": "1234567890abcd",
    "userId": "google-user-id",
    "familyId": "family-uuid",
    "content": "メモの内容",
    "timestamp": "2025-07-14T12:34:56.789Z",
    "createdByName": "太郎",
    "deleted": false
  }
]
```

#### POST /api/memos
新しいメモを作成します。

**Request Body:**
```json
{
  "content": "メモの内容"
}
```

**Response:**
```json
{
  "id": "1234567890abcd",
  "message": "メモを追加しました"
}
```

#### PUT /api/memos/:id
メモを更新します。

**Request Body:**
```json
{
  "content": "更新後のメモ内容"
}
```

**Response:**
```json
{
  "message": "メモを更新しました"
}
```

#### DELETE /api/memos/:id
メモを削除します（論理削除または物理削除）。

- 通常のメモ: 論理削除（削除フラグを立てる）
- 既に削除済みのメモ: 物理削除（完全に削除）

**Response:**
```json
{
  "message": "メモを削除しました",
  "action": "logical_delete" // または "physical_delete"
}
```

#### PUT /api/memos/:id/restore
削除済みメモを復元します。

**Response:**
```json
{
  "message": "メモを復元しました"
}
```

### Family Management

#### POST /api/family/invite-codes
家族招待コードを生成します（4桁、5分間有効）。

**Response:**
```json
{
  "code": "1234",
  "expiresAt": "2025-07-14T12:39:56.789Z"
}
```

#### POST /api/family/join
招待コードを使って家族に参加します。

**Request Body:**
```json
{
  "inviteCode": "1234"
}
```

**Response:**
```json
{
  "message": "家族に参加しました",
  "familyId": "family-uuid"
}
```

#### POST /api/family/leave
現在の家族から独立します。

**Response:**
```json
{
  "message": "家族から独立しました",
  "newFamilyId": "new-family-uuid"
}
```

#### POST /api/family/transfer-owner
家督を他のメンバーに譲ります（当主のみ実行可能）。

**Request Body:**
```json
{
  "newOwnerUserId": "google-user-id"
}
```

**Response:**
```json
{
  "message": "家督を譲りました"
}
```

#### GET /api/family/members
家族メンバー一覧を取得します。

**Response:**
```json
{
  "members": [
    {
      "userId": "google-user-id",
      "name": "太郎",
      "email": "taro@example.com",
      "picture": "https://lh3.googleusercontent.com/...",
      "isOwner": true,
      "joinedAt": "2025-07-01T00:00:00.000Z"
    }
  ]
}
```

### User Management

#### PUT /api/user/name
ユーザー名を変更します。

**Request Body:**
```json
{
  "name": "新しい名前"
}
```

**Response:**
```json
{
  "message": "名前を変更しました",
  "name": "新しい名前"
}
```

## Error Codes

| Status Code | Description |
|------------|-------------|
| 200 | 成功 |
| 400 | リクエストエラー（パラメータ不正など） |
| 401 | 認証エラー |
| 403 | 権限エラー（当主のみの操作など） |
| 404 | リソースが見つからない |
| 500 | サーバーエラー |

## Rate Limiting

現在、レート制限は実装されていませんが、将来的に以下の制限を予定：
- 1分あたり60リクエスト
- 1時間あたり1000リクエスト

## Webhooks

現在、Webhook機能は実装されていません。

## SDKs

現在、公式SDKは提供されていません。
JavaScriptでの実装例は `public/app.js` を参照してください。