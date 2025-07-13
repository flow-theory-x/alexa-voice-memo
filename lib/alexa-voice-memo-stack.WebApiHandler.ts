import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import serverlessExpress from "@codegenie/serverless-express";
import { createHash } from "crypto";
import express from "express";

const app = express();
app.use(express.json());

// CORS設定（全許可）
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.header("Cross-Origin-Embedder-Policy", "unsafe-none");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// JWT検証ミドルウェア
async function verifyGoogleToken(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Missing Authorization header");
      return res.status(401).json({ error: "認証が必要です" });
    }

    const token = authHeader.substring(7);
    console.log("Token length:", token.length);

    // JWTトークンを検証（簡易版：署名検証なし）
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.log("Invalid token format, parts:", parts.length);
      return res.status(401).json({ error: "無効なトークンです" });
    }

    let payload: any;
    try {
      payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      console.log("Token payload:", JSON.stringify(payload, null, 2));

      // 有効期限チェック
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        console.log("Token expired");
        return res
          .status(401)
          .json({ error: "トークンの有効期限が切れています" });
      }

      // Google発行かチェック（複数の可能な発行者を許可）
      const validIssuers = [
        "https://accounts.google.com",
        "accounts.google.com",
      ];
      if (!validIssuers.includes(payload.iss)) {
        console.log("Invalid issuer:", payload.iss);
        return res.status(401).json({ error: "無効な発行者です" });
      }
    } catch (e) {
      console.error("Failed to parse token payload:", e);
      return res.status(401).json({ error: "トークンの解析に失敗しました" });
    }

    // ユーザー情報をリクエストに追加
    req.user = {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
    };

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ error: "認証に失敗しました" });
  }
}

// UserService import
import { UserService } from "./alexa-voice-memo-stack.UserService";

// DynamoDB設定
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-northeast-1",
});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.MEMO_TABLE_NAME!;
const inviteCodeTableName = process.env.INVITE_CODE_TABLE_NAME!;

// UserService instance
const userService = new UserService();

// memoId生成関数
function generateMemoId(userId: string): string {
  const timestamp = Date.now();
  const hash = createHash("sha256")
    .update(userId)
    .digest("hex")
    .substring(0, 4);
  return `${timestamp}${hash}`;
}

// GET /api/memos - メモ一覧取得（家族メモ、削除済み含む）
app.get("/api/memos", verifyGoogleToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const userName = req.user.name;
    const email = req.user.email;

    // ユーザー情報を取得または作成
    const user = await userService.getOrCreateUser(userId, userName, email);
    console.log(`User info for ${userId}:`, JSON.stringify(user, null, 2));
    const familyId = user.familyId;
    console.log(`Resolved familyId: ${familyId}`);

    // familyIdでメモを取得（GSIを使用）
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: "family-timestamp-index",
      KeyConditionExpression: "familyId = :familyId",
      ExpressionAttributeValues: {
        ":familyId": familyId,
      },
      ScanIndexForward: false,
      Limit: 200,
    });

    const result = await docClient.send(command);
    console.log(
      `Query returned ${
        result.Items?.length || 0
      } items for familyId ${familyId}`
    );
    console.log(
      "First 3 items:",
      JSON.stringify(result.Items?.slice(0, 3), null, 2)
    );
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    // 10日以上経過した削除済みメモを物理削除
    const toDelete = (result.Items || []).filter(
      (item) =>
        item.deleted === "true" &&
        item.updatedAt &&
        new Date(item.updatedAt) < tenDaysAgo
    );

    // バッチで物理削除
    for (const item of toDelete) {
      const deleteCommand = new DeleteCommand({
        TableName: tableName,
        Key: {
          userId: item.userId,
          memoId: item.memoId,
        },
      });
      await docClient.send(deleteCommand);
    }

    // 残ったメモを返す（物理削除されたものは除外）
    const filteredItems = (result.Items || [])
      .filter((item) => !toDelete.some((d) => d.memoId === item.memoId))
      .filter((item) => item.userId !== item.memoId); // ユーザー情報レコードを除外
    console.log(
      `After filtering out old deleted items and user records: ${filteredItems.length} items`
    );

    // ユーザー情報をマップ作成
    const userIds = [...new Set(filteredItems.map((item) => item.userId))];
    const userMap = new Map<string, string>();

    for (const uid of userIds) {
      const userData = await userService.getUser(uid);
      if (userData) {
        userMap.set(uid, userData.userName);
      }
    }

    const memos = filteredItems
      .map((item) => ({
        id: item.memoId,
        content: item.text,
        timestamp: item.timestamp,
        userId: item.userId,
        deleted: item.deleted === "true",
        createdByName: userMap.get(item.userId) || "Unknown",
        familyId: item.familyId,
      }))
      .sort((a, b) => {
        // まず削除フラグでソート（削除されていないものが上）
        if (a.deleted !== b.deleted) {
          return a.deleted ? 1 : -1;
        }
        // 同じ削除状態なら新しい順にソート
        return b.timestamp.localeCompare(a.timestamp);
      })
      .slice(0, 100); // 最大100件

    console.log(`Returning ${memos.length} memos to client`);
    res.json(memos);
  } catch (error) {
    console.error("Error fetching memos:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/memos - メモ追加
app.post("/api/memos", verifyGoogleToken, async (req: any, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.userId;
    const userName = req.user.name || req.user.email.split("@")[0];
    const email = req.user.email;

    if (!content) {
      res.status(400).json({ error: "Content is required" });
      return;
    }

    // ユーザー情報を取得または作成
    const user = await userService.getOrCreateUser(userId, userName, email);
    const familyId = user.familyId;

    // memoId生成: timestamp + userId hash
    const timestamp = new Date().toISOString();
    const memoId = generateMemoId(userId);

    const putCommand = new PutCommand({
      TableName: tableName,
      Item: {
        userId,
        memoId,
        text: content,
        timestamp,
        deleted: "false",
        updatedAt: timestamp,
        familyId,
      },
    });

    await docClient.send(putCommand);
    res.json({ success: true, memoId });
  } catch (error) {
    console.error("Error adding memo:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/memos/:id - メモ削除（論理削除または物理削除）
app.delete("/api/memos/:id", verifyGoogleToken, async (req: any, res) => {
  try {
    const { id } = req.params;

    // まず該当のメモを探す（削除済み含む全て）
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: "memoId = :memoId",
      ExpressionAttributeValues: {
        ":memoId": id,
      },
    });

    const scanResult = await docClient.send(scanCommand);
    if (!scanResult.Items || scanResult.Items.length === 0) {
      res.status(404).json({ error: "Memo not found" });
      return;
    }

    const memo = scanResult.Items[0];

    // 既に論理削除されている場合は物理削除
    if (memo.deleted === "true") {
      const deleteCommand = new DeleteCommand({
        TableName: tableName,
        Key: {
          userId: memo.userId,
          memoId: id,
        },
      });

      await docClient.send(deleteCommand);
      res.json({ success: true, action: "physical_delete" });
    } else {
      // まだ削除されていない場合は論理削除
      const updateCommand = new UpdateCommand({
        TableName: tableName,
        Key: {
          userId: memo.userId,
          memoId: id,
        },
        UpdateExpression: "SET deleted = :deleted, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":deleted": "true",
          ":updatedAt": new Date().toISOString(),
        },
      });

      await docClient.send(updateCommand);
      res.json({ success: true, action: "logical_delete" });
    }
  } catch (error) {
    console.error("Error deleting memo:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/memos/:id - メモ更新
app.put("/api/memos/:id", verifyGoogleToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: "Content is required" });
      return;
    }

    // まず該当のメモを探す
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: "memoId = :memoId AND deleted = :deleted",
      ExpressionAttributeValues: {
        ":memoId": id,
        ":deleted": "false",
      },
    });

    const scanResult = await docClient.send(scanCommand);
    if (!scanResult.Items || scanResult.Items.length === 0) {
      res.status(404).json({ error: "Memo not found" });
      return;
    }

    // メモを更新
    const memo = scanResult.Items[0];
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: {
        userId: memo.userId,
        memoId: id,
      },
      UpdateExpression: "SET #text = :content, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#text": "text",
      },
      ExpressionAttributeValues: {
        ":content": content,
        ":updatedAt": new Date().toISOString(),
      },
    });

    await docClient.send(updateCommand);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating memo:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/memos/:id/restore - メモ復元
app.put("/api/memos/:id/restore", verifyGoogleToken, async (req: any, res) => {
  try {
    const { id } = req.params;

    // まず該当のメモを探す（削除済みのもののみ）
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: "memoId = :memoId AND deleted = :deleted",
      ExpressionAttributeValues: {
        ":memoId": id,
        ":deleted": "true",
      },
    });

    const scanResult = await docClient.send(scanCommand);
    if (!scanResult.Items || scanResult.Items.length === 0) {
      res.status(404).json({ error: "Deleted memo not found" });
      return;
    }

    // メモを復元
    const memo = scanResult.Items[0];
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: {
        userId: memo.userId,
        memoId: id,
      },
      UpdateExpression: "SET deleted = :deleted, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":deleted": "false",
        ":updatedAt": new Date().toISOString(),
      },
    });

    await docClient.send(updateCommand);
    res.json({ success: true });
  } catch (error) {
    console.error("Error restoring memo:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ========== 家族管理API ==========

// POST /api/family/invite-codes - 招待コード生成
app.post(
  "/api/family/invite-codes",
  verifyGoogleToken,
  async (req: any, res) => {
    try {
      const userId = req.user.userId;
      const userName = req.user.name || req.user.email.split("@")[0];
      const email = req.user.email;

      // ユーザー情報を取得または作成
      const user = await userService.getOrCreateUser(userId, userName, email);
      const familyId = user.familyId;

      // 4桁の招待コード生成
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const ttl = Math.floor(Date.now() / 1000) + 300; // 5分後に失効

      const putCommand = new PutCommand({
        TableName: inviteCodeTableName,
        Item: {
          code,
          familyId,
          timestamp: new Date().toISOString(),
          ttl,
        },
      });

      await docClient.send(putCommand);
      res.json({ code, expiresIn: 300 });
    } catch (error) {
      console.error("Error creating invite code:", error);
      res.status(500).json({ error: "招待コードの生成に失敗しました" });
    }
  }
);

// POST /api/family/join - 家族に参加
app.post("/api/family/join", verifyGoogleToken, async (req: any, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.userId;
    const userName = req.user.name || req.user.email.split("@")[0];
    const email = req.user.email;

    if (!inviteCode) {
      res.status(400).json({ error: "招待コードが必要です" });
      return;
    }

    // 招待コードを検証
    const getCommand = new GetCommand({
      TableName: inviteCodeTableName,
      Key: { code: inviteCode },
    });

    const codeResult = await docClient.send(getCommand);
    if (!codeResult.Item) {
      res.status(404).json({ error: "招待コードが無効です" });
      return;
    }

    const { familyId } = codeResult.Item;

    // ユーザー情報を取得または作成し、familyIdを更新
    const user = await userService.getOrCreateUser(userId, userName, email);
    await userService.updateUserFamily(userId, familyId);

    // 既存のメモのfamilyIdを更新（結婚時のメモ移行）
    const oldFamilyId = user.userId; // 参加前は自分のuserIdがfamilyId
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: "familyId = :oldFamilyId AND userId = :userId",
      ExpressionAttributeValues: {
        ":oldFamilyId": oldFamilyId,
        ":userId": userId,
      },
    });

    const memosResult = await docClient.send(scanCommand);
    const updatePromises = (memosResult.Items || []).map((item) => {
      const updateCmd = new UpdateCommand({
        TableName: tableName,
        Key: {
          userId: item.userId,
          memoId: item.memoId,
        },
        UpdateExpression: "SET familyId = :newFamilyId, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":newFamilyId": familyId,
          ":updatedAt": new Date().toISOString(),
        },
      });
      return docClient.send(updateCmd);
    });

    await Promise.all(updatePromises);

    // 招待コードを削除
    const deleteCommand = new DeleteCommand({
      TableName: inviteCodeTableName,
      Key: { code: inviteCode },
    });
    await docClient.send(deleteCommand);

    res.json({ success: true, familyId });
  } catch (error) {
    console.error("Error joining family:", error);
    res.status(500).json({ error: "家族への参加に失敗しました" });
  }
});

// POST /api/family/leave - 家族から退出
app.post("/api/family/leave", verifyGoogleToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const userName = req.user.name || req.user.email.split("@")[0];
    const email = req.user.email;

    // ユーザー情報を取得または作成
    const user = await userService.getOrCreateUser(userId, userName, email);
    const currentFamilyId = user.familyId;

    // 筆頭者チェック（familyId === userId）
    if (currentFamilyId === userId) {
      // 他の家族メンバーがいるか確認
      const familyMembers = await userService.getFamilyMembers(currentFamilyId);
      if (familyMembers.length > 1) {
        res.status(403).json({
          error: "筆頭者は家族に他のメンバーがいる場合は退出できません",
        });
        return;
      }
    }

    // ユーザーのfamilyIdを自分のuserIdに戻す
    await userService.updateUserFamily(userId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error leaving family:", error);
    res.status(500).json({ error: "独立にｓ失敗ました" });
  }
});

// POST /api/family/transfer-owner - 筆頭者移譲
app.post(
  "/api/family/transfer-owner",
  verifyGoogleToken,
  async (req: any, res) => {
    try {
      const { newOwnerUserId } = req.body;
      const userId = req.user.userId;
      const userName = req.user.name || req.user.email.split("@")[0];
      const email = req.user.email;

      if (!newOwnerUserId) {
        res.status(400).json({ error: "新しい当主のユーザーIDが必要です" });
        return;
      }

      // ユーザー情報を取得または作成
      const user = await userService.getOrCreateUser(userId, userName, email);
      const currentFamilyId = user.familyId;

      // 筆頭者チェック（familyId === userId）
      if (currentFamilyId !== userId) {
        res.status(403).json({ error: "当主のみが家督を譲れます" });
        return;
      }

      // 移譲先がAlexaユーザー（Amazon ID）でないかチェック
      if (newOwnerUserId.startsWith("amzn1.ask.account.")) {
        res.status(400).json({ error: "Alexaには家督を譲れません" });
        return;
      }

      // 全メンバーのfamilyIdを新しい筆頭者のuserIdに更新
      // 1. User tableの更新
      const familyMembers = await userService.getFamilyMembers(currentFamilyId);
      const userUpdatePromises = familyMembers.map((member) =>
        userService.updateUserFamily(member.userId, newOwnerUserId)
      );
      await Promise.all(userUpdatePromises);

      // 2. Memo tableの更新
      const scanCommand = new ScanCommand({
        TableName: tableName,
        FilterExpression: "familyId = :familyId",
        ExpressionAttributeValues: {
          ":familyId": currentFamilyId,
        },
      });

      const memosResult = await docClient.send(scanCommand);
      const memoUpdatePromises = (memosResult.Items || []).map((item) => {
        const updateCmd = new UpdateCommand({
          TableName: tableName,
          Key: {
            userId: item.userId,
            memoId: item.memoId,
          },
          UpdateExpression:
            "SET familyId = :newFamilyId, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":newFamilyId": newOwnerUserId,
            ":updatedAt": new Date().toISOString(),
          },
        });
        return docClient.send(updateCmd);
      });

      await Promise.all(memoUpdatePromises);
      res.json({ success: true, newFamilyId: newOwnerUserId });
    } catch (error) {
      console.error("Error transferring ownership:", error);
      res.status(500).json({ error: "家督の移譲に失敗しました" });
    }
  }
);

// GET /api/family/members - メンバー一覧
app.get("/api/family/members", verifyGoogleToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const userName = req.user.name || req.user.email.split("@")[0];
    const email = req.user.email;

    // ユーザー情報を取得または作成
    const user = await userService.getOrCreateUser(userId, userName, email);
    const familyId = user.familyId;
    console.log(`Current user familyId: ${familyId}`);

    // 同じfamilyIdを持つユーザーを取得
    const familyMembers = await userService.getFamilyMembers(familyId);
    console.log("Members found:", JSON.stringify(familyMembers, null, 2));

    const members = familyMembers.map((member) => ({
      userId: member.userId,
      name: member.userName,
      isOwner: member.userId === familyId,
    }));

    res.json({ familyId, members });
  } catch (error) {
    console.error("Error fetching family members:", error);
    res.status(500).json({ error: "家族一覧の取得に失敗しました" });
  }
});

// ========== ユーザー管理API ==========

// PUT /api/user/name - 名前変更
app.put("/api/user/name", verifyGoogleToken, async (req: any, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.userId;

    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: "名前は必須です" });
      return;
    }

    if (name.length > 50) {
      res.status(400).json({ error: "名前は50文字以内で入力してください" });
      return;
    }

    // ユーザー名を更新
    await userService.updateUserName(userId, name.trim());

    res.json({ success: true, name: name.trim() });
  } catch (error) {
    console.error("Error updating user name:", error);
    res.status(500).json({ error: "名前の変更に失敗しました" });
  }
});

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Lambda handler
export const handler = serverlessExpress({ app });
