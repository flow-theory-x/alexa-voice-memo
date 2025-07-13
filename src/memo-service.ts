import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, BatchWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { MemoItem } from './types';

export class MemoService {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.MEMO_TABLE_NAME!;
  }

  // ユーザーのfamilyIdを取得
  private async getFamilyId(userId: string): Promise<string> {
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'userId = :userId AND userId = memoId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: 1
    });

    const result = await this.docClient.send(command);
    return result.Items?.[0]?.familyId || userId;
  }

  async addMemo(userId: string, text: string, userName: string = 'Alexa'): Promise<MemoItem> {
    if (!text || text.trim().length === 0) {
      throw new Error('Memo text cannot be empty');
    }
    
    if (text.length > 500) {
      throw new Error('Memo text too long');
    }

    const familyId = await this.getFamilyId(userId);
    const now = new Date().toISOString();
    const memoId = `memo_${now.slice(0, 10).replace(/-/g, '')}_${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    const memo: MemoItem = {
      userId,
      memoId,
      text: text.trim(),
      timestamp: now,
      deleted: 'false',
      createdAt: now,
      updatedAt: now,
      version: 1,
      familyId,
      createdByName: userName
    };

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: memo
    }));

    return memo;
  }

  async getActiveMemos(userId: string): Promise<MemoItem[]> {
    const familyId = await this.getFamilyId(userId);
    
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'family-timestamp-index',
      KeyConditionExpression: 'familyId = :familyId',
      FilterExpression: 'deleted = :deleted',
      ExpressionAttributeValues: {
        ':familyId': familyId,
        ':deleted': 'false'
      },
      ScanIndexForward: false, // Latest first
    });

    const result = await this.docClient.send(command);
    return (result.Items as MemoItem[]) || [];
  }

  async deleteMemo(userId: string, memoId: string): Promise<void> {
    await this.docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { userId, memoId },
      UpdateExpression: 'SET deleted = :deleted, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':deleted': 'true',
        ':updatedAt': new Date().toISOString()
      }
    }));
  }

  async deleteAllMemos(userId: string): Promise<void> {
    const memos = await this.getActiveMemos(userId);
    
    if (memos.length === 0) {
      return;
    }

    const updatedAt = new Date().toISOString();
    
    // BatchWriteCommandはUpdateRequestをサポートしないため、
    // 個別のUpdateCommandを並列実行する
    const updatePromises = memos.map(memo => 
      this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { userId: memo.userId, memoId: memo.memoId },
        UpdateExpression: 'SET deleted = :deleted, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':deleted': 'true',
          ':updatedAt': updatedAt
        }
      }))
    );

    // 並列実行して全ての更新を待つ
    await Promise.all(updatePromises);
  }
}