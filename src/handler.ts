import { AlexaRequest, AlexaResponse } from './types';
import { MemoService } from './memo-service';

const memoService = new MemoService();

export const handler = async (event: AlexaRequest): Promise<AlexaResponse> => {
  console.log('Request:', JSON.stringify(event, null, 2));

  try {
    const requestType = event.request.type;
    const userId = event.session.user.userId;

    switch (requestType) {
      case 'LaunchRequest':
        return buildResponse('ボイスメモへようこそ。メモを追加、読み上げ、削除ができます。何をしますか？', false);

      case 'IntentRequest':
        return await handleIntent(event, userId);

      case 'SessionEndedRequest':
        return buildResponse('', true);

      default:
        return buildResponse('申し訳ありません、理解できませんでした。', true);
    }
  } catch (error) {
    console.error('Handler error:', error);
    return buildResponse('申し訳ありません、エラーが発生しました。', true);
  }
};

async function handleIntent(event: AlexaRequest, userId: string): Promise<AlexaResponse> {
  const intentName = event.request.intent?.name;

  switch (intentName) {
    case 'AddMemoIntent':
      return await handleAddMemo(event, userId);
    
    case 'ReadMemosIntent':
      return await handleReadMemos(userId);
    
    case 'DeleteMemoIntent':
      return await handleDeleteMemo(event, userId);
    
    case 'AMAZON.HelpIntent':
      return buildResponse(
        'ボイスメモでは、メモの追加、読み上げ、削除ができます。例えば「牛乳を買うをメモに追加」や「メモを読んで」と言ってください。',
        false
      );
    
    case 'AMAZON.CancelIntent':
    case 'AMAZON.StopIntent':
      return buildResponse('さようなら。', true);
    
    default:
      return buildResponse('申し訳ありません、その機能はまだ対応していません。', false);
  }
}

async function handleAddMemo(event: AlexaRequest, userId: string): Promise<AlexaResponse> {
  try {
    const memoText = event.request.intent?.slots?.memoText?.value;
    
    if (!memoText) {
      return buildResponse('申し訳ありません、メモの内容が聞き取れませんでした。もう一度お試しください。', false);
    }

    await memoService.addMemo(userId, memoText);
    return buildResponse(`${memoText}をメモに追加しました。`, false);
    
  } catch (error) {
    console.error('Add memo error:', error);
    return buildResponse('申し訳ありません、メモの追加に失敗しました。', false);
  }
}

async function handleReadMemos(userId: string): Promise<AlexaResponse> {
  try {
    const memos = await memoService.getActiveMemos(userId);
    
    if (memos.length === 0) {
      return buildResponse('メモはありません。', false);
    }

    let response = `メモが${memos.length}件あります。`;
    memos.forEach((memo, index) => {
      response += `${index + 1}番目、${memo.text}。`;
    });

    return buildResponse(response, false);
    
  } catch (error) {
    console.error('Read memos error:', error);
    return buildResponse('申し訳ありません、メモの読み上げに失敗しました。', false);
  }
}

async function handleDeleteMemo(event: AlexaRequest, userId: string): Promise<AlexaResponse> {
  try {
    const memoNumber = event.request.intent?.slots?.memoNumber?.value;
    
    if (!memoNumber) {
      return buildResponse('申し訳ありません、削除するメモの番号が聞き取れませんでした。', false);
    }

    const memos = await memoService.getActiveMemos(userId);
    const index = parseInt(memoNumber) - 1;
    
    if (index < 0 || index >= memos.length) {
      return buildResponse('申し訳ありません、その番号のメモは存在しません。', false);
    }

    await memoService.deleteMemo(userId, memos[index].memoId);
    return buildResponse(`${index + 1}番目のメモを削除しました。`, false);
    
  } catch (error) {
    console.error('Delete memo error:', error);
    return buildResponse('申し訳ありません、メモの削除に失敗しました。', false);
  }
}

function buildResponse(outputText: string, shouldEndSession: boolean = false): AlexaResponse {
  return {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: outputText
      },
      shouldEndSession
    }
  };
}