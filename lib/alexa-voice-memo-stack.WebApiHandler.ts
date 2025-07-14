import express from 'express';
import serverlessExpress from '@codegenie/serverless-express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, DeleteCommand, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const app = express();
app.use(express.json());

// CORS設定（全許可）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// DynamoDB設定
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.MEMO_TABLE_NAME!;
const inviteCodeTableName = process.env.INVITE_CODE_TABLE_NAME!;

// GET /api/memos - メモ一覧取得（家族メモ、削除済み含む）
app.get('/api/memos', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'web-user';
    
    // まずユーザー情報を取得してfamilyIdを確認
    const userScan = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: 1
    });
    
    const userResult = await docClient.send(userScan);
    const familyId = userResult.Items?.[0]?.familyId || userId;
    
    // familyIdでメモを取得（GSIを使用）
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: 'family-timestamp-index',
      KeyConditionExpression: 'familyId = :familyId',
      ExpressionAttributeValues: {
        ':familyId': familyId
      },
      ScanIndexForward: false,
      Limit: 200
    });

    const result = await docClient.send(command);
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    
    // 10日以上経過した削除済みメモを物理削除
    const toDelete = (result.Items || []).filter(item => 
      item.deleted === 'true' && 
      item.updatedAt && 
      new Date(item.updatedAt) < tenDaysAgo
    );
    
    // バッチで物理削除
    for (const item of toDelete) {
      const deleteCommand = new DeleteCommand({
        TableName: tableName,
        Key: {
          userId: item.userId,
          memoId: item.memoId
        }
      });
      await docClient.send(deleteCommand);
    }
    
    // 残ったメモを返す（物理削除されたものは除外）
    const memos = (result.Items || [])
      .filter(item => !toDelete.some(d => d.memoId === item.memoId))
      .map(item => ({
        id: item.memoId,
        content: item.text,
        timestamp: item.timestamp,
        userId: item.userId,
        deleted: item.deleted === 'true',
        createdByName: item.createdByName,
        familyId: item.familyId
      }))
      .sort((a, b) => {
        // まず削除フラグでソート（削除されていないものが上）
        if (a.deleted !== b.deleted) {
          return a.deleted ? 1 : -1;
        }
        // 同じ削除状態なら新しい順にソート
        return b.timestamp.localeCompare(a.timestamp);
      })
      .slice(0, 100); // 最大100件

    res.json(memos);
  } catch (error) {
    console.error('Error fetching memos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/memos - メモ追加
app.post('/api/memos', async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.headers['x-user-id'] as string || 'web-user';
    const userName = req.headers['x-user-name'] as string || 'Webユーザー';
    
    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }
    
    // ユーザー情報を取得してfamilyIdを確認
    const userScan = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: 1
    });
    
    const userResult = await docClient.send(userScan);
    const familyId = userResult.Items?.[0]?.familyId || userId;
    
    // UUIDを生成
    const memoId = `memo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const putCommand = new PutCommand({
      TableName: tableName,
      Item: {
        userId,
        memoId,
        text: content,
        timestamp,
        deleted: 'false',
        createdAt: timestamp,
        updatedAt: timestamp,
        version: 1,
        familyId,
        createdByName: userName
      }
    });
    
    await docClient.send(putCommand);
    res.json({ success: true, memoId });
  } catch (error) {
    console.error('Error adding memo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/memos/:id - メモ削除（論理削除または物理削除）
app.delete('/api/memos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // まず該当のメモを探す（削除済み含む全て）
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'memoId = :memoId',
      ExpressionAttributeValues: {
        ':memoId': id
      }
    });
    
    const scanResult = await docClient.send(scanCommand);
    if (!scanResult.Items || scanResult.Items.length === 0) {
      res.status(404).json({ error: 'Memo not found' });
      return;
    }
    
    const memo = scanResult.Items[0];
    
    // 既に論理削除されている場合は物理削除
    if (memo.deleted === 'true') {
      const deleteCommand = new DeleteCommand({
        TableName: tableName,
        Key: { 
          userId: memo.userId,
          memoId: id 
        }
      });
      
      await docClient.send(deleteCommand);
      res.json({ success: true, action: 'physical_delete' });
    } else {
      // まだ削除されていない場合は論理削除
      const updateCommand = new UpdateCommand({
        TableName: tableName,
        Key: { 
          userId: memo.userId,
          memoId: id 
        },
        UpdateExpression: 'SET deleted = :deleted, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':deleted': 'true',
          ':updatedAt': new Date().toISOString()
        }
      });
      
      await docClient.send(updateCommand);
      res.json({ success: true, action: 'logical_delete' });
    }
  } catch (error) {
    console.error('Error deleting memo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/memos/:id - メモ更新
app.put('/api/memos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }
    
    // まず該当のメモを探す
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'memoId = :memoId AND deleted = :deleted',
      ExpressionAttributeValues: {
        ':memoId': id,
        ':deleted': 'false'
      }
    });
    
    const scanResult = await docClient.send(scanCommand);
    if (!scanResult.Items || scanResult.Items.length === 0) {
      res.status(404).json({ error: 'Memo not found' });
      return;
    }
    
    // メモを更新
    const memo = scanResult.Items[0];
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: { 
        userId: memo.userId,
        memoId: id 
      },
      UpdateExpression: 'SET #text = :content, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#text': 'text'
      },
      ExpressionAttributeValues: {
        ':content': content,
        ':updatedAt': new Date().toISOString()
      }
    });
    
    await docClient.send(updateCommand);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating memo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/memos/:id/restore - メモ復元
app.put('/api/memos/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    
    // まず該当のメモを探す（削除済みのもののみ）
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'memoId = :memoId AND deleted = :deleted',
      ExpressionAttributeValues: {
        ':memoId': id,
        ':deleted': 'true'
      }
    });
    
    const scanResult = await docClient.send(scanCommand);
    if (!scanResult.Items || scanResult.Items.length === 0) {
      res.status(404).json({ error: 'Deleted memo not found' });
      return;
    }
    
    // メモを復元
    const memo = scanResult.Items[0];
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: { 
        userId: memo.userId,
        memoId: id 
      },
      UpdateExpression: 'SET deleted = :deleted, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':deleted': 'false',
        ':updatedAt': new Date().toISOString()
      }
    });
    
    await docClient.send(updateCommand);
    res.json({ success: true });
  } catch (error) {
    console.error('Error restoring memo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== 家族管理API ==========

// POST /api/family/invite-codes - 招待コード生成
app.post('/api/family/invite-codes', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'web-user';
    
    // ユーザー情報を取得してfamilyIdを確認
    const userScan = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: 1
    });
    
    const userResult = await docClient.send(userScan);
    const familyId = userResult.Items?.[0]?.familyId || userId;
    
    // 4桁の招待コード生成
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const ttl = Math.floor(Date.now() / 1000) + 300; // 5分後に失効
    
    const putCommand = new PutCommand({
      TableName: inviteCodeTableName,
      Item: {
        code,
        familyId,
        createdAt: new Date().toISOString(),
        ttl
      }
    });
    
    await docClient.send(putCommand);
    res.json({ code, expiresIn: 300 });
  } catch (error) {
    console.error('Error creating invite code:', error);
    res.status(500).json({ error: '招待コードの生成に失敗しました' });
  }
});

// POST /api/family/join - 家族に参加
app.post('/api/family/join', async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.headers['x-user-id'] as string || 'web-user';
    
    if (!inviteCode) {
      res.status(400).json({ error: '招待コードが必要です' });
      return;
    }
    
    // 招待コードを検証
    const getCommand = new GetCommand({
      TableName: inviteCodeTableName,
      Key: { code: inviteCode }
    });
    
    const codeResult = await docClient.send(getCommand);
    if (!codeResult.Item) {
      res.status(404).json({ error: '招待コードが無効です' });
      return;
    }
    
    const { familyId } = codeResult.Item;
    
    // ユーザーのfamilyIdを更新
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: { userId, memoId: userId }, // ユーザー情報用のダミーレコード
      UpdateExpression: 'SET familyId = :familyId, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':familyId': familyId,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    });
    
    await docClient.send(updateCommand);
    
    // 招待コードを削除
    const deleteCommand = new DeleteCommand({
      TableName: inviteCodeTableName,
      Key: { code: inviteCode }
    });
    await docClient.send(deleteCommand);
    
    res.json({ success: true, familyId });
  } catch (error) {
    console.error('Error joining family:', error);
    res.status(500).json({ error: '家族への参加に失敗しました' });
  }
});

// POST /api/family/leave - 家族から退出
app.post('/api/family/leave', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'web-user';
    
    // ユーザーのfamilyIdを自分のuserIdに戻す
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: { userId, memoId: userId },
      UpdateExpression: 'SET familyId = :familyId, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':familyId': userId,
        ':updatedAt': new Date().toISOString()
      }
    });
    
    await docClient.send(updateCommand);
    res.json({ success: true });
  } catch (error) {
    console.error('Error leaving family:', error);
    res.status(500).json({ error: '家族からの退出に失敗しました' });
  }
});

// POST /api/family/transfer-owner - 筆頭者移譲
app.post('/api/family/transfer-owner', async (req, res) => {
  try {
    const { newOwnerUserId } = req.body;
    const userId = req.headers['x-user-id'] as string || 'web-user';
    
    if (!newOwnerUserId) {
      res.status(400).json({ error: '新しい筆頭者のユーザーIDが必要です' });
      return;
    }
    
    // 現在のfamilyIdを取得
    const userScan = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: 1
    });
    
    const userResult = await docClient.send(userScan);
    const currentFamilyId = userResult.Items?.[0]?.familyId || userId;
    
    // 筆頭者チェック（familyId === userId）
    if (currentFamilyId !== userId) {
      res.status(403).json({ error: '筆頭者のみが移譲できます' });
      return;
    }
    
    // 全メンバーのfamilyIdを新しい筆頭者のuserIdに更新
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'familyId = :familyId',
      ExpressionAttributeValues: {
        ':familyId': currentFamilyId
      }
    });
    
    const membersResult = await docClient.send(scanCommand);
    const updatePromises = (membersResult.Items || []).map(item => {
      const updateCmd = new UpdateCommand({
        TableName: tableName,
        Key: { 
          userId: item.userId,
          memoId: item.memoId
        },
        UpdateExpression: 'SET familyId = :newFamilyId, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':newFamilyId': newOwnerUserId,
          ':updatedAt': new Date().toISOString()
        }
      });
      return docClient.send(updateCmd);
    });
    
    await Promise.all(updatePromises);
    res.json({ success: true, newFamilyId: newOwnerUserId });
  } catch (error) {
    console.error('Error transferring ownership:', error);
    res.status(500).json({ error: '筆頭者の移譲に失敗しました' });
  }
});

// GET /api/family/members - メンバー一覧
app.get('/api/family/members', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'web-user';
    
    // ユーザーのfamilyIdを取得
    const userScan = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: 1
    });
    
    const userResult = await docClient.send(userScan);
    const familyId = userResult.Items?.[0]?.familyId || userId;
    
    // 同じfamilyIdを持つユーザーを取得
    const membersCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'familyId = :familyId AND userId = memoId',
      ExpressionAttributeValues: {
        ':familyId': familyId
      }
    });
    
    const membersResult = await docClient.send(membersCommand);
    const members = (membersResult.Items || []).map(item => ({
      userId: item.userId,
      name: item.createdByName || 'ユーザー',
      isOwner: item.userId === familyId
    }));
    
    res.json({ familyId, members });
  } catch (error) {
    console.error('Error fetching family members:', error);
    res.status(500).json({ error: 'メンバー一覧の取得に失敗しました' });
  }
});

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Lambda handler
export const handler = serverlessExpress({ app });