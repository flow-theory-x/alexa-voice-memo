import express from 'express';
import serverlessExpress from '@codegenie/serverless-express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

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

// GET /api/memos - メモ一覧取得（全ユーザー分、削除済み含む）
app.get('/api/memos', async (req, res) => {
  try {
    // Scan操作で全ユーザーのメモを取得（削除済み含む）
    const command = new ScanCommand({
      TableName: tableName,
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
        deleted: item.deleted === 'true'
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
    
    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }
    
    // UUIDを生成
    const memoId = `memo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userId = 'web-user'; // Web UIから追加された場合のデフォルトユーザー
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
        version: 1
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

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Lambda handler
export const handler = serverlessExpress({ app });