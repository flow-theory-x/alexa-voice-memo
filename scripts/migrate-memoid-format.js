#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand, DeleteCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { createHash } = require('crypto');

// DynamoDB設定
const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = 'alexa-voice-memo-dev-memos';

// 新しいmemoId生成関数
function generateMemoId(userId, timestamp) {
  const hash = createHash('sha256')
    .update(userId)
    .digest('hex')
    .substring(0, 4);
  return `${timestamp}${hash}`;
}

// タイムスタンプから元のミリ秒を抽出
function extractTimestampFromOldFormat(oldMemoId, timestampISO) {
  // 古いフォーマットの場合、timestampISOからミリ秒を取得
  return new Date(timestampISO).getTime();
}

async function migrateMemoIdFormat() {
  console.log('🚀 memoIdフォーマットの移行開始...');
  
  try {
    let totalProcessed = 0;
    let totalMigrated = 0;
    let lastEvaluatedKey;
    
    do {
      // レコードをスキャン
      const scanParams = {
        TableName: tableName,
        Limit: 25 // 一度に処理する件数を制限
      };
      
      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      console.log(`📊 スキャン実行中... (処理済み: ${totalProcessed}件)`);
      const scanResult = await docClient.send(new ScanCommand(scanParams));
      
      if (!scanResult.Items || scanResult.Items.length === 0) {
        console.log('📝 レコードが見つかりませんでした');
        break;
      }
      
      console.log(`📋 ${scanResult.Items.length}件のレコードを取得`);
      
      // 古いフォーマットのレコードをフィルタ
      const oldFormatRecords = scanResult.Items.filter(item => {
        // ユーザー情報レコード（userId = memoId）はスキップ
        if (item.userId === item.memoId) {
          return false;
        }
        
        // 新しいフォーマット（数字のみ）はスキップ
        if (/^\d+[a-f0-9]{4}$/.test(item.memoId)) {
          return false;
        }
        
        // 古いフォーマット（memo- または memo_）の場合は移行対象
        return item.memoId.startsWith('memo-') || item.memoId.startsWith('memo_');
      });
      
      console.log(`🎯 移行対象レコード: ${oldFormatRecords.length}件`);
      
      // 各レコードを新しいフォーマットに移行
      for (const item of oldFormatRecords) {
        try {
          console.log(`🔧 移行中: ${item.userId}/${item.memoId}`);
          
          // 元のタイムスタンプから新しいmemoIdを生成
          const timestamp = extractTimestampFromOldFormat(item.memoId, item.timestamp);
          const newMemoId = generateMemoId(item.userId, timestamp);
          
          console.log(`  古いID: ${item.memoId} → 新しいID: ${newMemoId}`);
          
          // 新しいレコードを作成
          const newRecord = {
            ...item,
            memoId: newMemoId
          };
          
          // 新しいレコードを追加
          await docClient.send(new PutCommand({
            TableName: tableName,
            Item: newRecord
          }));
          
          // 古いレコードを削除
          await docClient.send(new DeleteCommand({
            TableName: tableName,
            Key: {
              userId: item.userId,
              memoId: item.memoId
            }
          }));
          
          totalMigrated++;
          console.log(`✅ 移行完了: ${item.userId}/${item.memoId} → ${newMemoId}`);
          
        } catch (error) {
          console.error(`❌ 移行エラー: ${item.userId}/${item.memoId}`, error.message);
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
    
    console.log('\n🎉 migration完了!');
    console.log(`📊 総処理件数: ${totalProcessed}件`);
    console.log(`🔄 移行件数: ${totalMigrated}件`);
    
  } catch (error) {
    console.error('❌ migration中にエラーが発生:', error);
    process.exit(1);
  }
}

// 実行確認
console.log('⚠️  この操作はmemoIdフォーマットを新しい形式に移行します');
console.log('📍 対象テーブル:', tableName);
console.log('🔄 古いフォーマット (memo-xxx, memo_xxx) → 新しいフォーマット (timestampxxxx)');
console.log('🔄 5秒後に開始します... (Ctrl+Cで中止)');

setTimeout(() => {
  migrateMemoIdFormat();
}, 5000);