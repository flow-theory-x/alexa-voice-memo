#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// DynamoDB設定
const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = 'alexa-voice-memo-dev-memos';

async function removeVersionFields() {
  console.log('🚀 DynamoDBからversionフィールドを削除開始...');
  
  try {
    let totalProcessed = 0;
    let totalUpdated = 0;
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
      
      // versionフィールドを持つレコードをフィルタ
      const recordsWithVersion = scanResult.Items.filter(item => item.version !== undefined);
      console.log(`🎯 versionフィールドを持つレコード: ${recordsWithVersion.length}件`);
      
      // 各レコードからversionを削除
      for (const item of recordsWithVersion) {
        try {
          console.log(`🔧 更新中: ${item.userId}/${item.memoId}`);
          
          const updateParams = {
            TableName: tableName,
            Key: {
              userId: item.userId,
              memoId: item.memoId
            },
            UpdateExpression: 'REMOVE version',
            ConditionExpression: 'attribute_exists(version)', // versionが存在する場合のみ実行
            ReturnValues: 'NONE'
          };
          
          await docClient.send(new UpdateCommand(updateParams));
          totalUpdated++;
          console.log(`✅ 更新完了: ${item.userId}/${item.memoId}`);
          
        } catch (error) {
          if (error.name === 'ConditionalCheckFailedException') {
            console.log(`⚠️  スキップ (versionなし): ${item.userId}/${item.memoId}`);
          } else {
            console.error(`❌ 更新エラー: ${item.userId}/${item.memoId}`, error.message);
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
    
    console.log('\n🎉 cleanup完了!');
    console.log(`📊 総処理件数: ${totalProcessed}件`);
    console.log(`🔄 更新件数: ${totalUpdated}件`);
    
  } catch (error) {
    console.error('❌ cleanup中にエラーが発生:', error);
    process.exit(1);
  }
}

// 実行確認
console.log('⚠️  この操作はDynamoDBからversionフィールドを完全に削除します');
console.log('📍 対象テーブル:', tableName);
console.log('🔄 5秒後に開始します... (Ctrl+Cで中止)');

setTimeout(() => {
  removeVersionFields();
}, 5000);