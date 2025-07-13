#!/usr/bin/env node

// ユーザー情報レコードを一覧表示するスクリプト

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.TABLE_NAME || 'alexa-voice-memo-dev-memos';

async function listUsers() {
  const client = new DynamoDBClient({ region: 'ap-northeast-1' });
  const docClient = DynamoDBDocumentClient.from(client);

  try {
    // ユーザー情報レコード（userId = memoId）を取得
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'userId = memoId',
      Limit: 100
    });

    const result = await docClient.send(scanCommand);
    const users = result.Items || [];

    console.log(`Found ${users.length} users:\n`);

    users.forEach(user => {
      console.log(`User ID: ${user.userId}`);
      console.log(`  Family ID: ${user.familyId}`);
      console.log(`  User Name: ${user.userName || '(not set)'}`);
      console.log(`  Created By Name: ${user.createdByName || '(not set)'}`);
      console.log(`  Timestamp: ${user.timestamp}`);
      console.log(`  Is Alexa: ${user.userId.startsWith('amzn1.ask.account')}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

listUsers();