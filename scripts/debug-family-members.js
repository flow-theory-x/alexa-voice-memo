#!/usr/bin/env node

// 家族メンバーのデバッグ用スクリプト

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.TABLE_NAME || 'alexa-voice-memo-dev-memos';

async function debugFamilyMembers() {
  const client = new DynamoDBClient({ region: 'ap-northeast-1' });
  const docClient = DynamoDBDocumentClient.from(client);

  try {
    // まず全てのユーザー情報レコードを取得
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'userId = memoId',
      Limit: 100
    });

    const result = await docClient.send(scanCommand);
    const users = result.Items || [];

    console.log(`\n=== ユーザー情報レコード (${users.length}件) ===\n`);

    // familyIdでグループ化
    const families = {};
    users.forEach(user => {
      const familyId = user.familyId || user.userId;
      if (!families[familyId]) {
        families[familyId] = [];
      }
      families[familyId].push(user);
    });

    // 家族ごとに表示
    Object.entries(families).forEach(([familyId, members]) => {
      console.log(`Family ID: ${familyId}`);
      console.log(`  筆頭者: ${familyId}`);
      console.log(`  メンバー数: ${members.length}`);
      console.log('  メンバー:');
      
      members.forEach(member => {
        const isOwner = member.userId === familyId;
        const isAlexa = member.userId.startsWith('amzn1.ask.account');
        console.log(`    - ${member.userName || '(名前なし)'}`);
        console.log(`      User ID: ${member.userId.substring(0, 30)}...`);
        console.log(`      筆頭者: ${isOwner ? 'はい' : 'いいえ'}`);
        console.log(`      Alexa: ${isAlexa ? 'はい' : 'いいえ'}`);
        console.log(`      作成日: ${member.timestamp || '不明'}`);
      });
      console.log('---\n');
    });

    // 各家族のメモ数も確認
    console.log('=== 家族ごとのメモ数 ===\n');
    
    for (const [familyId, members] of Object.entries(families)) {
      const memoScan = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'familyId = :familyId AND userId <> memoId AND deleted = :deleted',
        ExpressionAttributeValues: {
          ':familyId': familyId,
          ':deleted': 'false'
        }
      });
      
      const memoResult = await docClient.send(memoScan);
      const memoCount = memoResult.Items?.length || 0;
      
      console.log(`Family ID: ${familyId.substring(0, 30)}...`);
      console.log(`  アクティブなメモ数: ${memoCount}`);
      console.log('---');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

debugFamilyMembers();