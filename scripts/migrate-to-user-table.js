#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// DynamoDB設定
const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);
const memoTableName = 'alexa-voice-memo-dev-memos';
const userTableName = 'alexa-voice-memo-dev-users';

async function migrateToUserTable() {
  console.log('🚀 User Table移行開始...');
  
  try {
    let totalProcessed = 0;
    let totalMigrated = 0;
    let totalMemoUpdated = 0;
    let lastEvaluatedKey;
    
    do {
      // メモテーブルからユーザー情報レコードをスキャン
      const scanParams = {
        TableName: memoTableName,
        FilterExpression: 'userId = memoId', // ユーザー情報レコード
        Limit: 25
      };
      
      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      console.log(`📊 スキャン実行中... (処理済み: ${totalProcessed}件)`);
      const scanResult = await docClient.send(new ScanCommand(scanParams));
      
      if (!scanResult.Items || scanResult.Items.length === 0) {
        console.log('📝 ユーザー情報レコードが見つかりませんでした');
        break;
      }
      
      console.log(`📋 ${scanResult.Items.length}件のユーザー情報レコードを取得`);
      
      // 各ユーザー情報レコードを処理
      for (const userRecord of scanResult.Items) {
        try {
          console.log(`🔧 移行中: ${userRecord.userId} (${userRecord.userName || 'Unknown'})`);
          
          // Userテーブルに新しいレコードを作成
          const now = new Date().toISOString();
          const newUserRecord = {
            userId: userRecord.userId,
            familyId: userRecord.familyId || userRecord.userId,
            userName: userRecord.userName || userRecord.createdByName || 'Unknown User',
            email: userRecord.email || undefined,
            createdAt: userRecord.timestamp || now,
            updatedAt: now
          };
          
          console.log(`  新しいユーザーレコード:`, JSON.stringify(newUserRecord, null, 2));
          
          // Userテーブルに挿入
          await docClient.send(new PutCommand({
            TableName: userTableName,
            Item: newUserRecord,
            ConditionExpression: 'attribute_not_exists(userId)' // 重複防止
          }));
          
          // メモテーブルからユーザー情報レコードを削除
          await docClient.send(new DeleteCommand({
            TableName: memoTableName,
            Key: {
              userId: userRecord.userId,
              memoId: userRecord.memoId
            }
          }));
          
          totalMigrated++;
          console.log(`✅ 移行完了: ${userRecord.userId}`);
          
        } catch (error) {
          if (error.name === 'ConditionalCheckFailedException') {
            console.log(`⚠️  スキップ (既存): ${userRecord.userId}`);
          } else {
            console.error(`❌ 移行エラー: ${userRecord.userId}`, error.message);
          }
        }
      }
      
      totalProcessed += scanResult.Items.length;
      lastEvaluatedKey = scanResult.LastEvaluatedKey;
      
      // API制限を避けるために少し待機
      if (lastEvaluatedKey) {
        console.log('⏱️  1秒待機中...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } while (lastEvaluatedKey);
    
    console.log('\n🧹 メモテーブルからcreatedByNameフィールドを削除中...');
    
    // メモテーブルからcreatedByNameフィールドを削除
    let memoLastEvaluatedKey;
    do {
      const memoScanParams = {
        TableName: memoTableName,
        FilterExpression: 'attribute_exists(createdByName)',
        Limit: 25
      };
      
      if (memoLastEvaluatedKey) {
        memoScanParams.ExclusiveStartKey = memoLastEvaluatedKey;
      }
      
      const memoScanResult = await docClient.send(new ScanCommand(memoScanParams));
      
      if (!memoScanResult.Items || memoScanResult.Items.length === 0) {
        break;
      }
      
      console.log(`📋 ${memoScanResult.Items.length}件のメモからcreatedByNameを削除`);
      
      for (const memo of memoScanResult.Items) {
        try {
          await docClient.send(new UpdateCommand({
            TableName: memoTableName,
            Key: {
              userId: memo.userId,
              memoId: memo.memoId
            },
            UpdateExpression: 'REMOVE createdByName',
            ConditionExpression: 'attribute_exists(createdByName)'
          }));
          
          totalMemoUpdated++;
        } catch (error) {
          if (error.name !== 'ConditionalCheckFailedException') {
            console.error(`❌ createdByName削除エラー: ${memo.userId}/${memo.memoId}`, error.message);
          }
        }
      }
      
      memoLastEvaluatedKey = memoScanResult.LastEvaluatedKey;
      
      if (memoLastEvaluatedKey) {
        console.log('⏱️  1秒待機中...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } while (memoLastEvaluatedKey);
    
    console.log('\n🎉 migration完了!');
    console.log(`📊 総処理件数: ${totalProcessed}件`);
    console.log(`👥 ユーザー移行件数: ${totalMigrated}件`);
    console.log(`📝 メモ更新件数: ${totalMemoUpdated}件`);
    
  } catch (error) {
    console.error('❌ migration中にエラーが発生:', error);
    process.exit(1);
  }
}

// 実行確認
console.log('⚠️  この操作は以下を実行します:');
console.log('  1. メモテーブルのユーザー情報レコード → Userテーブルに移行');
console.log('  2. メモテーブルからcreatedByNameフィールドを削除');
console.log('📍 メモテーブル:', memoTableName);
console.log('📍 ユーザーテーブル:', userTableName);
console.log('🔄 5秒後に開始します... (Ctrl+Cで中止)');

setTimeout(() => {
  migrateToUserTable();
}, 5000);