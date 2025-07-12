import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { MemoItem } from './types';

export class MemoService {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.MEMO_TABLE_NAME!;
  }

  async addMemo(userId: string, text: string): Promise<MemoItem> {
    if (!text || text.trim().length === 0) {
      throw new Error('Memo text cannot be empty');
    }
    
    if (text.length > 500) {
      throw new Error('Memo text too long');
    }

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
      version: 1
    };

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: memo
    }));

    return memo;
  }

  async getActiveMemos(userId: string): Promise<MemoItem[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: 'deleted = :deleted',
      ExpressionAttributeValues: {
        ':userId': userId,
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
}