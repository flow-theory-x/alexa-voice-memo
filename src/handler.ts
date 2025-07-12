import { MemoService } from "./memo-service";
import { AlexaRequest, AlexaResponse } from "./types";

const memoService = new MemoService();

export const handler = async (event: AlexaRequest): Promise<AlexaResponse> => {
  console.log("Request:", JSON.stringify(event, null, 2));

  try {
    const requestType = event.request.type;
    const userId = event.session.user.userId;

    switch (requestType) {
      case "LaunchRequest":
        return buildResponse(
          "ボイスメモへようこそ。メモを追加、読み上げ、削除ができます。",
          false
        );

      case "IntentRequest":
        return await handleIntent(event, userId);

      case "SessionEndedRequest":
        return buildResponse("", true);

      default:
        return buildResponse("理解できませんでした。", true);
    }
  } catch (error) {
    console.error("Handler error:", error);
    return buildResponse("エラーが発生しました。", true);
  }
};

async function handleIntent(
  event: AlexaRequest,
  userId: string
): Promise<AlexaResponse> {
  const intentName = event.request.intent?.name;

  switch (intentName) {
    case "AddMemoIntent":
      return await handleAddMemo(event, userId);

    case "ReadMemosIntent":
      return await handleReadMemos(userId);

    case "DeleteMemoIntent":
      return await handleDeleteMemo(event, userId);

    case "DeleteAllMemosIntent":
      return await handleDeleteAllMemos(event, userId);

    case "AMAZON.YesIntent":
      return await handleYesIntent(event, userId);

    case "AMAZON.NoIntent":
      return await handleNoIntent(event, userId);

    case "AMAZON.HelpIntent":
      return buildResponse(
        "ボイスメモでは、メモの追加、読み上げ、削除ができます。例えば「牛乳を買うをメモに追加」や「メモを読んで」と言ってください。",
        false
      );

    case "AMAZON.CancelIntent":
    case "AMAZON.StopIntent":
      return buildResponse("さようなら。", true, {}, true);

    default:
      return buildResponse("その機能はまだ対応していません。", false);
  }
}

async function handleAddMemo(
  event: AlexaRequest,
  userId: string
): Promise<AlexaResponse> {
  try {
    const memoText = event.request.intent?.slots?.memoText?.value;

    if (!memoText) {
      return buildResponse("聞き取れませんでした。もう一度お願いします", false);
    }

    await memoService.addMemo(userId, memoText);
    return buildResponse(`${memoText}をメモに追加しました。`, false);
  } catch (error) {
    console.error("Add memo error:", error);
    return buildResponse("メモの追加に失敗しました。", false);
  }
}

async function handleReadMemos(userId: string): Promise<AlexaResponse> {
  try {
    const memos = await memoService.getActiveMemos(userId);

    if (memos.length === 0) {
      return buildResponse("メモはありません。", false);
    }

    let response = `メモが${memos.length}件あります。`;
    memos.forEach((memo, index) => {
      response += `${index + 1}番目、${memo.text}。`;
    });

    return buildResponse(response, false);
  } catch (error) {
    console.error("Read memos error:", error);
    return buildResponse("メモの読み上げに失敗しました。", false);
  }
}

async function handleDeleteAllMemos(
  event: AlexaRequest,
  userId: string
): Promise<AlexaResponse> {
  try {
    const memos = await memoService.getActiveMemos(userId);

    if (memos.length === 0) {
      return buildResponse("削除するメモがありません。", false, {}, true);
    }

    const confirmationMessage = `現在${memos.length}件のメモがあります。本当に削除してもよろしいですか？`;

    return buildResponse(
      confirmationMessage,
      false,
      {
        pendingAction: "deleteAllMemos",
        memoCount: memos.length,
      },
      false
    );
  } catch (error) {
    console.error("Delete all memos confirmation error:", error);
    return buildResponse("確認に失敗しました。", false, {}, true);
  }
}

async function handleYesIntent(
  event: AlexaRequest,
  userId: string
): Promise<AlexaResponse> {
  try {
    const sessionAttributes = event.session.attributes || {};

    if (sessionAttributes.pendingAction === "deleteAllMemos") {
      const memoCount = sessionAttributes.memoCount || 0;
      await memoService.deleteAllMemos(userId);

      return buildResponse(`${memoCount}件全て削除しました。`, false, {}, true);
    }

    return buildResponse(
      "何に対する返事かわかりませんでした。",
      false,
      {},
      true
    );
  } catch (error) {
    console.error("Yes intent error:", error);
    return buildResponse("削除処理に失敗しました。", false, {}, true);
  }
}

async function handleNoIntent(
  event: AlexaRequest,
  userId: string
): Promise<AlexaResponse> {
  try {
    const sessionAttributes = event.session.attributes || {};

    if (sessionAttributes.pendingAction === "deleteAllMemos") {
      return buildResponse("削除をキャンセルしました。", false, {}, true);
    }

    return buildResponse("分かりました。", false, {}, true);
  } catch (error) {
    console.error("No intent error:", error);
    return buildResponse("処理に失敗しました。", false, {}, true);
  }
}

async function handleDeleteMemo(
  event: AlexaRequest,
  userId: string
): Promise<AlexaResponse> {
  try {
    const memoNumber = event.request.intent?.slots?.memoNumber?.value;

    if (!memoNumber) {
      return buildResponse("番号が聞き取れませんでした。", false);
    }

    const memos = await memoService.getActiveMemos(userId);
    const index = parseInt(memoNumber) - 1;

    if (index < 0 || index >= memos.length) {
      return buildResponse("そのメモは存在しません。", false);
    }

    await memoService.deleteMemo(userId, memos[index].memoId);
    return buildResponse(`${index + 1}番目のメモを削除しました。`, false);
  } catch (error) {
    console.error("Delete memo error:", error);
    return buildResponse("削除に失敗しました。", false);
  }
}

function buildResponse(
  outputText: string,
  shouldEndSession: boolean = false,
  sessionAttributes: any = {},
  clearSession: boolean = false
): AlexaResponse {
  const response: AlexaResponse = {
    version: "1.0",
    response: {
      outputSpeech: {
        type: "PlainText",
        text: outputText,
      },
      shouldEndSession,
    },
  };

  if (!clearSession && Object.keys(sessionAttributes).length > 0) {
    response.sessionAttributes = sessionAttributes;
  }

  return response;
}
