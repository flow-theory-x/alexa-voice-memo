#!/usr/bin/env node

// 家族統合の修正スクリプト
// FLOWとAlexaの最近のメモもChikaraの家族に統合

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.TABLE_NAME || 'alexa-voice-memo-dev-memos';
const DRY_RUN = process.argv.includes('--dry-run');

// 家族の設定
const CHIKARA_USER_ID = '102220884585798233202';
const CHIKARA_FAMILY_ID = CHIKARA_USER_ID;
const FLOW_USER_ID = '113951560184250584927';
const ALEXA_USER_ID = 'amzn1.ask.account.AMAUQHAEAF4CA3WYJRV2SFNPRYQZOULAOYBXOLY2JLPEYIZTYH3HBCQVDQ2LTN2RF66KPSIIVUFLJYYAMY63B7XSEJLVT5IXFWNRVE4G3V25BMLCD5ALHKQVR7XWUN7EMBBFLHWFNAJ5MCALFPRFS6HXTJDDZCIKTBKITCKBLUYGHAKXRUTNRQVFASIKFRPLLZWWYETICT6QMF3INR5IHOPAS6UWS4XS7WSHX4NS2POQ';

async function fixFamilyIntegration() {
  const client = new DynamoDBClient({ region: 'ap-northeast-1' });
  const docClient = DynamoDBDocumentClient.from(client);

  console.log('\n=== 家族統合修正スクリプト ===');
  console.log(`モード: ${DRY_RUN ? 'DRY RUN（実行しない）' : '実行'}`);
  console.log(`統合先: Chikaraの家族 (familyId: ${CHIKARA_FAMILY_ID})\n`);

  try {
    // 全データを取得
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME
    });
    
    const result = await docClient.send(scanCommand);
    const items = result.Items || [];

    // 1. FLOWのユーザーレコードを作成（存在しない場合）
    console.log('1. FLOWのユーザーレコード確認・作成');
    const flowUserRecord = items.find(item => 
      item.userId === FLOW_USER_ID && item.memoId === FLOW_USER_ID
    );
    
    if (!flowUserRecord) {
      console.log('  FLOWのユーザーレコードが存在しません。作成します。');
      
      if (!DRY_RUN) {
        await docClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            userId: FLOW_USER_ID,
            memoId: FLOW_USER_ID,
            familyId: CHIKARA_FAMILY_ID,
            userName: 'FLOW Theory',
            timestamp: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deleted: 'false',
            version: 1
          }
        }));
        console.log('  ✅ FLOWのユーザーレコードを作成');
      }
    } else if (flowUserRecord.familyId !== CHIKARA_FAMILY_ID) {
      console.log(`  FLOWのfamilyIdを更新: ${flowUserRecord.familyId} → ${CHIKARA_FAMILY_ID}`);
      
      if (!DRY_RUN) {
        await docClient.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            userId: FLOW_USER_ID,
            memoId: FLOW_USER_ID
          },
          UpdateExpression: 'SET familyId = :familyId, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':familyId': CHIKARA_FAMILY_ID,
            ':updatedAt': new Date().toISOString()
          }
        }));
        console.log('  ✅ FLOWのfamilyIdを更新');
      }
    } else {
      console.log('  FLOWのユーザーレコードは正しく設定済み');
    }

    // 2. FLOWのメモをChikaraの家族に統合
    console.log('\n2. FLOWのメモを家族に統合');
    const flowMemos = items.filter(item => 
      item.userId === FLOW_USER_ID && 
      item.memoId !== FLOW_USER_ID &&
      item.familyId !== CHIKARA_FAMILY_ID
    );
    
    console.log(`  対象メモ数: ${flowMemos.length}`);
    
    for (const memo of flowMemos) {
      console.log(`  - ${memo.memoId}: "${memo.text?.substring(0, 30)}..."`);
      
      if (!DRY_RUN) {
        await docClient.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            userId: memo.userId,
            memoId: memo.memoId
          },
          UpdateExpression: 'SET familyId = :familyId, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':familyId': CHIKARA_FAMILY_ID,
            ':updatedAt': new Date().toISOString()
          }
        }));
      }
    }
    
    if (!DRY_RUN && flowMemos.length > 0) {
      console.log(`  ✅ ${flowMemos.length}件のFLOWメモを家族に統合`);
    }

    // 3. Alexaのメモを家族に統合
    console.log('\n3. Alexaの最新メモを家族に統合');
    const alexaMemos = items.filter(item => 
      item.userId === ALEXA_USER_ID && 
      item.memoId !== ALEXA_USER_ID &&
      item.familyId !== CHIKARA_FAMILY_ID
    );
    
    console.log(`  対象メモ数: ${alexaMemos.length}`);
    
    for (const memo of alexaMemos) {
      console.log(`  - ${memo.memoId}: "${memo.text?.substring(0, 30)}..."`);
      
      if (!DRY_RUN) {
        await docClient.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            userId: memo.userId,
            memoId: memo.memoId
          },
          UpdateExpression: 'SET familyId = :familyId, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':familyId': CHIKARA_FAMILY_ID,
            ':updatedAt': new Date().toISOString()
          }
        }));
      }
    }
    
    if (!DRY_RUN && alexaMemos.length > 0) {
      console.log(`  ✅ ${alexaMemos.length}件のAlexaメモを家族に統合`);
    }

    // 4. AlexaのユーザーレコードのfamilyId更新
    console.log('\n4. Alexaのユーザーレコード更新');
    const alexaUserRecord = items.find(item => 
      item.userId === ALEXA_USER_ID && item.memoId === ALEXA_USER_ID
    );
    
    if (alexaUserRecord && alexaUserRecord.familyId !== CHIKARA_FAMILY_ID) {
      console.log(`  AlexaのfamilyIdを更新: ${alexaUserRecord.familyId} → ${CHIKARA_FAMILY_ID}`);
      
      if (!DRY_RUN) {
        await docClient.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            userId: ALEXA_USER_ID,
            memoId: ALEXA_USER_ID
          },
          UpdateExpression: 'SET familyId = :familyId, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':familyId': CHIKARA_FAMILY_ID,
            ':updatedAt': new Date().toISOString()
          }
        }));
        console.log('  ✅ AlexaのfamilyIdを更新');
      }
    } else if (!alexaUserRecord) {
      console.log('  Alexaのユーザーレコードが存在しません（必要に応じて作成）');
    } else {
      console.log('  Alexaのユーザーレコードは正しく設定済み');
    }

    // 完了サマリー
    console.log('\n=== 家族統合修正完了 ===');
    if (DRY_RUN) {
      console.log('DRY RUNモードで実行しました。');
      console.log('実際に実行するには --dry-run オプションを外してください。');
      
      console.log('\n【修正後の予想状態】');
      console.log(`Chikaraの家族（familyId: ${CHIKARA_FAMILY_ID}）に統合されるメモ:`);
      console.log(`  - FLOWのメモ: +${flowMemos.length}件`);
      console.log(`  - Alexaのメモ: +${alexaMemos.length}件`);
      console.log('  全メンバーが全メモを共有可能になります。');
    } else {
      console.log('全ての処理が完了しました。');
      console.log('\n推奨: check-family-status.js を再実行して結果を確認してください。');
    }
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    console.error('処理を中断しました。');
  }
}

// 実行
console.log('================================================');
console.log('⚠️  警告: このスクリプトは家族統合を修正します');
console.log('FLOWとAlexaの全メモがChikaraの家族に統合されます');
console.log('================================================\n');

if (!DRY_RUN) {
  console.log('本当に実行しますか？ 3秒後に開始します...');
  console.log('中止するには Ctrl+C を押してください。\n');
  
  setTimeout(() => {
    fixFamilyIntegration();
  }, 3000);
} else {
  fixFamilyIntegration();
}