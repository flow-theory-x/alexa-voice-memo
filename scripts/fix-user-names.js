#!/usr/bin/env node

// 既存のユーザー情報レコードの名前を修正するスクリプト

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.TABLE_NAME || 'alexa-voice-memo-dev-memos';

async function fixUserNames() {
  const client = new DynamoDBClient({ region: 'ap-northeast-1' });
  const docClient = DynamoDBDocumentClient.from(client);

  try {
    // ユーザー情報レコード（userId = memoId）を取得
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'userId = memoId AND attribute_not_exists(userName)',
      Limit: 100
    });

    const result = await docClient.send(scanCommand);
    const usersToFix = result.Items || [];

    console.log(`Found ${usersToFix.length} users without names`);

    // 各ユーザーの名前を設定
    for (const user of usersToFix) {
      console.log(`Fixing user: ${user.userId}`);
      
      // Alexaユーザーかどうかチェック
      const isAlexaUser = user.userId.startsWith('amzn1.ask.account');
      const userName = isAlexaUser ? 'Alexa' : 'ユーザー';

      const updateCommand = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          userId: user.userId,
          memoId: user.memoId
        },
        UpdateExpression: 'SET userName = :userName, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':userName': userName,
          ':updatedAt': new Date().toISOString()
        }
      });

      await docClient.send(updateCommand);
      console.log(`  → Set name to: ${userName}`);
    }

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixUserNames();