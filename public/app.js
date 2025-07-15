// API設定
const API_BASE_URL =
  "https://99nb4tfwu6.execute-api.ap-northeast-1.amazonaws.com/dev";

// 状態管理
let memos = [];
let isLoading = false;
let isRefreshing = false;
let currentUserId = null;
let currentUserName = null;
let familyMembers = [];

// DOM要素
const memoList = document.getElementById("memo-list");
const emptyState = document.getElementById("empty-state");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const menuBtn = document.getElementById("menu-btn");
const menuOverlay = document.getElementById("menu-overlay");
const menuPanel = document.getElementById("menu-panel");
const addMemoBtn = document.getElementById("add-memo-btn");
const deleteAllBtn = document.getElementById("delete-all-btn");
const permanentDeleteBtn = document.getElementById("permanent-delete-btn");
const helpBtn = document.getElementById("help-btn");
const helpModal = document.getElementById("help-modal");
const closeHelpBtn = document.getElementById("close-help-btn");
const pullToRefresh = document.getElementById("pull-to-refresh");
const voiceBtn = document.getElementById("voice-btn");
const voiceModal = document.getElementById("voice-modal");
const voiceCancelBtn = document.getElementById("voice-cancel-btn");
const voiceStatus = document.querySelector(".voice-status");
const familyInfo = document.getElementById("family-info");
const familyMembersCount = document.getElementById("family-members-count");
const inviteFamilyBtn = document.getElementById("invite-family-btn");
const joinFamilyBtn = document.getElementById("join-family-btn");
const leaveFamilyBtn = document.getElementById("leave-family-btn");
const familyMembersBtn = document.getElementById("family-members-btn");
const inviteModal = document.getElementById("invite-modal");
const inviteCode = document.getElementById("invite-code");
const alexaCode = document.getElementById("alexa-code");
const closeInviteBtn = document.getElementById("close-invite-btn");
const userAvatarImg = document.getElementById("user-avatar-img");
const userAvatarFallback = document.getElementById("user-avatar-fallback");
const userNameEl = document.getElementById("user-name");
const userEmailEl = document.getElementById("user-email");
const versionText = document.getElementById("version-text");
const joinModal = document.getElementById("join-modal");
const joinCodeInput = document.getElementById("join-code-input");
const joinSubmitBtn = document.getElementById("join-submit-btn");
const cancelJoinBtn = document.getElementById("cancel-join-btn");
const membersModal = document.getElementById("members-modal");
const membersList = document.getElementById("members-list");
const closeMembersBtn = document.getElementById("close-members-btn");
const changeNameBtn = document.getElementById("change-name-btn");
const logoutBtn = document.getElementById("logout-btn");

// 音声認識オブジェクト
let recognition = null;

// 全文表示ダイアログ要素
let fullTextDialog = null;
let fullTextContent = null;
let fullTextMetadata = null;
let fullTextOverlay = null;

// 初期化
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  setupPullToRefresh();
  checkVoiceSupport();

  // まず既存ユーザーをチェック（Google Sign-In不要の場合）
  const savedToken = localStorage.getItem("googleToken");
  const savedUserName = localStorage.getItem("userName");

  if (savedToken && savedUserName) {
    // JWTトークンからuserIdを取得
    try {
      const payload = JSON.parse(atob(savedToken.split(".")[1]));

      // トークンの有効期限をチェック
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        console.log("Token expired");
        localStorage.removeItem("googleToken");
        localStorage.removeItem("userName");
        initNewUser();
        return;
      }

      currentUserId = payload.sub;
      currentUserName = savedUserName;

      // ユーザー情報をUIに復元
      updateUserInfo(payload);

      showMainApp();
    } catch (error) {
      console.error("Invalid token:", error);
      localStorage.removeItem("googleToken");
      localStorage.removeItem("userName");
      // 無効トークンの場合は新規ユーザー扱い
      initNewUser();
    }
  } else {
    initNewUser();
  }
});

// 新規ユーザー初期化
function initNewUser() {
  // Google Sign-In ライブラリが読み込まれるまで待つ
  const initGoogleSignIn = () => {
    if (typeof google !== "undefined") {
      initializeGoogleSignIn();
      showLoginScreen();
    } else {
      setTimeout(initGoogleSignIn, 200);
    }
  };

  // 少し遅延させて初期化
  setTimeout(initGoogleSignIn, 100);
}

// Google Sign-In 初期化
function initializeGoogleSignIn() {
  if (typeof google === "undefined") {
    console.log("Google Sign-In library not yet loaded");
    return;
  }

  try {
    google.accounts.id.initialize({
      client_id:
        "940084652550-h58mte04laqb402kfv43ts39tu0n7cgt.apps.googleusercontent.com", // 環境変数からビルド時に置換
      callback: handleGoogleSignIn,
      auto_select: false,
      cancel_on_tap_outside: false,
    });
  } catch (error) {
    console.error("Error initializing Google Sign-In:", error);
  }
}

// 既存ユーザーチェック（廃止：メイン初期化ロジックに統合）
// function checkExistingUser() {
//     const savedUserId = localStorage.getItem('userId');
//     const savedUserName = localStorage.getItem('userName');
//
//     if (savedUserId && savedUserName) {
//         // 既存ユーザー
//         currentUserId = savedUserId;
//         currentUserName = savedUserName;
//         showMainApp();
//     } else {
//         // 新規ユーザー - ログイン画面表示
//         showLoginScreen();
//     }
// }

// Googleログイン処理
function handleGoogleSignIn(response) {
  try {
    // レスポンスとcredentialの検証
    if (!response || !response.credential) {
      console.error("Invalid response:", response);
      alert("ログインに失敗しました。もう一度お試しください。");
      return;
    }

    const credential = response.credential;
    
    // JWTトークンの形式を確認（3つのパートに分かれているか）
    const parts = credential.split(".");
    if (parts.length !== 3) {
      console.error("Invalid JWT format:", credential);
      alert("認証トークンの形式が正しくありません。");
      return;
    }

    // Base64デコードを試みる
    let payload;
    try {
      // URL-safe Base64をstandard Base64に変換してからデコード
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      
      // パディングを追加（必要な場合）
      const pad = base64.length % 4;
      if (pad) {
        if (pad === 1) {
          throw new Error('Invalid base64 string');
        }
        base64 += new Array(5 - pad).join('=');
      }
      
      const jsonPayload = atob(base64);
      payload = JSON.parse(jsonPayload);
    } catch (decodeError) {
      console.error("Error decoding JWT:", decodeError);
      console.error("JWT parts:", parts);
      alert("認証情報の解析に失敗しました。");
      return;
    }

    // ユーザー情報を取得
    currentUserId = payload.sub; // Google ID
    currentUserName = payload.name || payload.email.split("@")[0];

    // JWTトークンをローカルストレージに保存（userIdは保存しない）
    localStorage.setItem("googleToken", credential);
    localStorage.setItem("userName", currentUserName);

    // ユーザー情報をUIに反映
    updateUserInfo(payload);

    // メインアプリを表示
    showMainApp();
  } catch (error) {
    console.error("Error in handleGoogleSignIn:", error);
    alert("ログイン処理中にエラーが発生しました。");
  }
}

// ユーザー情報を更新
function updateUserInfo(payload) {
  // 名前を表示（最大20文字で切り詰め）
  const displayName =
    (payload.name || "ユーザー").length > 20
      ? (payload.name || "ユーザー").substring(0, 17) + "..."
      : payload.name || "ユーザー";
  userNameEl.textContent = displayName;

  // メールアドレスを表示（最大30文字で切り詰め）
  const displayEmail =
    payload.email.length > 30
      ? payload.email.substring(0, 27) + "..."
      : payload.email;
  userEmailEl.textContent = displayEmail;

  // アバター画像があれば表示
  if (payload.picture) {
    userAvatarImg.src = payload.picture;
    userAvatarImg.style.display = "block";
    userAvatarFallback.style.display = "none";
  } else {
    userAvatarImg.style.display = "none";
    userAvatarFallback.style.display = "flex";
    // 名前の最初の文字をアバターとして表示
    userAvatarFallback.textContent = (payload.name || "U")
      .charAt(0)
      .toUpperCase();
  }
}

// ログイン画面表示
function showLoginScreen() {
  document.getElementById("login-screen").style.display = "flex";

  // Googleログインボタンをレンダリング
  if (typeof google !== "undefined") {
    try {
      google.accounts.id.renderButton(
        document.getElementById("googleSignInButton"),
        {
          theme: "filled_blue",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          logo_alignment: "left",
        }
      );
    } catch (error) {
      console.error("Error rendering Google Sign-In button:", error);
      // フォールバック: 簡単なメッセージを表示
      document.getElementById("googleSignInButton").innerHTML =
        "<p>Google Sign-Inの準備中です...</p>";
    }
  } else {
    console.log("Google Sign-In not available yet");
    document.getElementById("googleSignInButton").innerHTML =
      "<p>Google Sign-Inの準備中です...</p>";
  }
}

// メインアプリ表示
function showMainApp() {
  document.getElementById("login-screen").style.display = "none";
  createFullTextDialog();
  displayFamilyMemberIcons(); // 初回表示
  loadMemos();
  loadFamilyMembers();
}

// 全文表示ダイアログを作成
function createFullTextDialog() {
  // オーバーレイ
  fullTextOverlay = document.createElement("div");
  fullTextOverlay.className = "menu-overlay";
  fullTextOverlay.style.display = "none";
  fullTextOverlay.onclick = hideFullTextDialog;

  // ダイアログ
  fullTextDialog = document.createElement("div");
  fullTextDialog.className = "full-text-dialog";

  // 閉じるボタン
  const closeBtn = document.createElement("button");
  closeBtn.className = "full-text-close";
  closeBtn.innerHTML = "×";
  closeBtn.onclick = hideFullTextDialog;

  // コンテンツ
  fullTextContent = document.createElement("div");
  fullTextContent.className = "full-text-content";
  
  // メタデータ（作成日時と作成者）
  fullTextMetadata = document.createElement("div");
  fullTextMetadata.className = "full-text-metadata";

  fullTextDialog.appendChild(closeBtn);
  fullTextDialog.appendChild(fullTextContent);
  fullTextDialog.appendChild(fullTextMetadata);

  document.body.appendChild(fullTextOverlay);
  document.body.appendChild(fullTextDialog);
}

// 全文表示ダイアログを表示
function showFullTextDialog(memo) {
  fullTextContent.textContent = memo.content;
  
  // メタデータを設定
  const timestamp = formatTimestamp(memo.timestamp);
  const creator = memo.createdByName ? `by ${memo.createdByName}` : '';
  fullTextMetadata.textContent = `${timestamp} ${creator}`;
  
  fullTextOverlay.style.display = "block";
  fullTextDialog.classList.add("show");
}

// 全文表示ダイアログを非表示
function hideFullTextDialog() {
  fullTextOverlay.style.display = "none";
  fullTextDialog.classList.remove("show");
}

// 401エラーハンドリング - JWTの期限切れなど
let isHandlingUnauthorized = false;
function handleUnauthorized() {
  // 既に処理中の場合は何もしない（無限ループ防止）
  if (isHandlingUnauthorized) return;

  // ログイン画面が表示されている場合は何もしない
  const loginScreen = document.getElementById("login-screen");
  if (loginScreen && loginScreen.style.display !== "none") {
    return;
  }

  isHandlingUnauthorized = true;

  // トークンとユーザー情報をクリア
  localStorage.removeItem("token");
  localStorage.removeItem("userInfo");
  localStorage.removeItem("googleToken");
  localStorage.removeItem("userName");

  // Google Sign-Inからサインアウト
  if (typeof google !== "undefined" && google.accounts && google.accounts.id) {
    google.accounts.id.disableAutoSelect();
  }

  // ログイン画面に戻る
  setTimeout(() => {
    location.reload();
  }, 100);
}

// APIリクエストのラッパー関数
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem("googleToken");
  if (!token) {
    handleUnauthorized();
    return null;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  // 401エラーの場合は自動ログアウト
  if (response.status === 401) {
    handleUnauthorized();
    return null;
  }

  return response;
}

// ログアウト処理
function logout() {
  if (!confirm("ログアウトしますか？")) {
    return;
  }

  // Google Sign-Inからサインアウト
  if (typeof google !== "undefined" && google.accounts && google.accounts.id) {
    google.accounts.id.disableAutoSelect();
  }

  // ローカルストレージをクリア
  localStorage.removeItem("googleToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");

  // ログイン画面を表示
  showLoginScreen();

  // メモリスト等をクリア
  memos = [];
  currentUserId = null;
  currentUserName = null;
  renderMemos();
}

// ユーザー名変更
async function changeUserName() {
  const newName = prompt("新しい名前を入力してください:", currentUserName);
  if (newName && newName.trim() !== "" && newName !== currentUserName) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/name`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("googleToken")}`,
        },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "名前の変更に失敗しました");
      }

      const result = await response.json();
      currentUserName = result.name;
      localStorage.setItem("userName", currentUserName);

      // ユーザー情報をUIに反映
      const displayName =
        currentUserName.length > 20
          ? currentUserName.substring(0, 17) + "..."
          : currentUserName;
      userNameEl.textContent = displayName;

      // 家族メンバー情報を更新
      await loadFamilyMembers();
      // メモも再読み込み（作成者名の更新のため）
      await loadMemos();

      alert(`名前を「${currentUserName}」に変更しました。`);
    } catch (err) {
      console.error("Error changing user name:", err);
      alert(err.message || "名前の変更に失敗しました");
    }
  }
}

// 音声入力サポートチェック
function checkVoiceSupport() {
  if (
    !("webkitSpeechRecognition" in window) &&
    !("SpeechRecognition" in window)
  ) {
    // サポートしていない場合はボタンを非表示
    voiceBtn.style.display = "none";
    console.log("Web Speech API is not supported in this browser");
  }
}

// イベントリスナー設定
function setupEventListeners() {
  // 音声入力ボタン
  voiceBtn.addEventListener("click", () => {
    startVoiceInput();
  });

  // 音声入力キャンセル
  voiceCancelBtn.addEventListener("click", () => {
    stopVoiceInput();
  });

  // モーダル外クリックでキャンセル
  voiceModal.addEventListener("click", (e) => {
    if (e.target === voiceModal) {
      stopVoiceInput();
    }
  });
  // メニューボタン
  menuBtn.addEventListener("click", () => {
    openMenu();
  });

  // メニューオーバーレイ
  menuOverlay.addEventListener("click", () => {
    closeMenu();
  });

  // メニューパネル内のクリックイベント
  menuPanel.addEventListener("click", (e) => {
    // メニューアイテム以外をクリックした場合は閉じる
    if (!e.target.classList.contains("menu-item")) {
      closeMenu();
    }
  });

  // メニュー項目
  addMemoBtn.addEventListener("click", () => {
    closeMenu();
    addMemo();
  });

  deleteAllBtn.addEventListener("click", () => {
    closeMenu();
    deleteAllMemos();
  });

  permanentDeleteBtn.addEventListener("click", () => {
    closeMenu();
    permanentDeleteAllMemos();
  });

  changeNameBtn.addEventListener("click", () => {
    closeMenu();
    changeUserName();
  });

  helpBtn.addEventListener("click", () => {
    closeMenu();
    showHelp();
  });

  logoutBtn.addEventListener("click", () => {
    closeMenu();
    logout();
  });

  // ヘルプモーダル閉じる
  closeHelpBtn.addEventListener("click", () => {
    hideHelp();
  });

  helpModal.addEventListener("click", (e) => {
    if (e.target === helpModal) {
      hideHelp();
    }
  });

  // 家族機能のイベントリスナー
  inviteFamilyBtn.addEventListener("click", () => {
    closeMenu();
    generateInviteCode();
  });

  joinFamilyBtn.addEventListener("click", () => {
    closeMenu();
    joinModal.style.display = "flex";
    joinCodeInput.value = "";
    joinCodeInput.focus();
  });

  leaveFamilyBtn.addEventListener("click", () => {
    closeMenu();
    leaveFamily();
  });

  familyMembersBtn.addEventListener("click", () => {
    closeMenu();
    showFamilyMembers();
  });

  familyInfo.addEventListener("click", () => {
    showFamilyMembers();
  });

  closeInviteBtn.addEventListener("click", () => {
    inviteModal.style.display = "none";
  });

  inviteModal.addEventListener("click", (e) => {
    if (e.target === inviteModal) {
      inviteModal.style.display = "none";
    }
  });

  joinSubmitBtn.addEventListener("click", () => {
    joinFamily();
  });

  cancelJoinBtn.addEventListener("click", () => {
    joinModal.style.display = "none";
  });

  joinModal.addEventListener("click", (e) => {
    if (e.target === joinModal) {
      joinModal.style.display = "none";
    }
  });

  joinCodeInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      joinFamily();
    }
  });

  closeMembersBtn.addEventListener("click", () => {
    membersModal.style.display = "none";
  });

  membersModal.addEventListener("click", (e) => {
    if (e.target === membersModal) {
      membersModal.style.display = "none";
    }
  });
}

// メニュー開く
function openMenu() {
  menuOverlay.classList.add("active");
  menuPanel.classList.add("active");
}

// メニュー閉じる
function closeMenu() {
  menuOverlay.classList.remove("active");
  menuPanel.classList.remove("active");
}

// ヘルプ表示
function showHelp() {
  helpModal.classList.add("active");
}

// ヘルプ非表示
function hideHelp() {
  helpModal.classList.remove("active");
}

// プルリフレッシュ設定
function setupPullToRefresh() {
  let startY = 0;
  let currentY = 0;
  let pulling = false;

  document.addEventListener("touchstart", (e) => {
    if (window.scrollY === 0) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  });

  document.addEventListener("touchmove", (e) => {
    if (!pulling) return;

    currentY = e.touches[0].clientY;
    const pullDistance = currentY - startY;

    if (pullDistance > 0 && pullDistance < 150) {
      e.preventDefault();
      pullToRefresh.style.top = `${Math.min(pullDistance - 60, 80)}px`;

      if (pullDistance > 80) {
        pullToRefresh.classList.add("visible");
      }
    }
  });

  document.addEventListener("touchend", async () => {
    if (!pulling) return;

    pulling = false;
    const pullDistance = currentY - startY;

    if (pullDistance > 80) {
      await loadMemos();
    }

    pullToRefresh.classList.remove("visible");
    pullToRefresh.style.top = "-60px";
  });
}

// メモ読み込み
async function loadMemos() {
  if (isLoading) return;

  isLoading = true;
  showLoading();
  hideError();

  try {
    const token = localStorage.getItem("googleToken");
    if (!token) {
      throw new Error("No authentication token");
    }

    const response = await fetch(`${API_BASE_URL}/api/memos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // 401エラーの場合は自動ログアウト
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) throw new Error("Failed to fetch memos");

    memos = await response.json();
    renderMemos();
  } catch (err) {
    console.error("Error loading memos:", err);
    showError();
  } finally {
    isLoading = false;
    hideLoading();
  }
}

// メモ表示
function renderMemos() {
  memoList.innerHTML = "";

  if (memos.length === 0) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  memos.forEach((memo) => {
    const memoElement = createMemoElement(memo);
    memoList.appendChild(memoElement);
  });
}

// メモ要素作成
function createMemoElement(memo) {
  const div = document.createElement("div");
  div.className = "memo-item";
  if (memo.deleted) {
    div.classList.add("deleted");
  }
  div.dataset.memoId = memo.id;

  const content = document.createElement("div");
  content.className = "memo-content";
  content.textContent = memo.content;

  // ダブルタップイベントを追加
  let lastTap = 0;
  content.addEventListener("click", (e) => {
    e.stopPropagation();
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 500 && tapLength > 0) {
      // ダブルタップ検出
      showFullTextDialog(memo);
    }
    lastTap = currentTime;
  });

  const timestamp = document.createElement("div");
  timestamp.className = "memo-timestamp";
  timestamp.textContent = formatTimestamp(memo.timestamp);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = memo.deleted ? "完全削除" : "削除";

  // 削除済みの場合は復元ボタン、通常の場合は編集ボタンを追加
  if (memo.deleted) {
    const restoreBtn = document.createElement("button");
    restoreBtn.className = "restore-btn";
    restoreBtn.textContent = "復元";
    div.appendChild(restoreBtn);
  } else {
    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "編集";
    div.appendChild(editBtn);
  }

  div.appendChild(content);

  // メタデータコンテナ（タイムスタンプと作成者を横並び）
  const metadata = document.createElement("div");
  metadata.className = "memo-metadata";
  metadata.appendChild(timestamp);

  // 作成者表示を追加
  if (memo.createdByName) {
    const creator = document.createElement("div");
    creator.className = "memo-creator";
    creator.textContent = `by ${memo.createdByName}`;
    metadata.appendChild(creator);
  }

  div.appendChild(metadata);
  div.appendChild(deleteBtn);

  // スワイプ削除設定
  setupSwipeToDelete(div, memo.id, memo.deleted);

  return div;
}

// スワイプ削除設定
function setupSwipeToDelete(element, memoId, isDeleted) {
  let startX = 0;
  let currentX = 0;
  let swiping = false;

  element.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    swiping = true;
    element.classList.add("swiping");
  });

  element.addEventListener("touchmove", (e) => {
    if (!swiping) return;

    currentX = e.touches[0].clientX;
    const diffX = currentX - startX;

    // 両方向のスワイプを許可
    if (diffX < 0 && diffX > -100) {
      // 左スワイプ
      element.style.transform = `translateX(${diffX}px)`;
    } else if (diffX > 0 && diffX < 100) {
      // 右スワイプ
      element.style.transform = `translateX(${diffX}px)`;
    }
  });

  element.addEventListener("touchend", () => {
    if (!swiping) return;

    swiping = false;
    element.classList.remove("swiping");

    const diffX = currentX - startX;

    // 左スワイプ（全てのメモ）
    if (diffX < -50) {
      element.classList.add("swipe-left");
      element.classList.remove("swipe-right");
      element.style.transform = "";
    }
    // 右スワイプ
    else if (diffX > 50) {
      element.classList.add("swipe-right");
      element.classList.remove("swipe-left");
      element.style.transform = "";
    }
    // スワイプキャンセル
    else {
      element.classList.remove("swipe-left");
      element.classList.remove("swipe-right");
      element.style.transform = "";
    }
  });

  // 削除ボタンクリック
  const deleteBtn = element.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await deleteMemo(memoId);
  });

  // 復元ボタンクリック（削除済みの場合のみ）
  if (isDeleted) {
    const restoreBtn = element.querySelector(".restore-btn");
    restoreBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await restoreMemo(memoId);
    });
  } else {
    // 編集ボタンクリック（通常メモの場合のみ）
    const editBtn = element.querySelector(".edit-btn");
    editBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await editMemo(memoId);
    });
  }
}

// メモ削除
async function deleteMemo(memoId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/memos/${memoId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("googleToken")}`,
      },
    });

    // 401エラーの場合は自動ログアウト
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) throw new Error("Failed to delete memo");

    const result = await response.json();

    if (result.action === "physical_delete") {
      // 物理削除の場合はリストから削除
      memos = memos.filter((memo) => memo.id !== memoId);
    } else {
      // 論理削除の場合は削除フラグを更新
      const memo = memos.find((m) => m.id === memoId);
      if (memo) {
        memo.deleted = true;
      }
    }
    renderMemos();
  } catch (err) {
    console.error("Error deleting memo:", err);
    alert("削除に失敗しました");
  }
}

// メモ復元
async function restoreMemo(memoId) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/memos/${memoId}/restore`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("googleToken")}`,
        },
      }
    );

    if (!response.ok) throw new Error("Failed to restore memo");

    // 成功したらリロード
    await loadMemos();
  } catch (err) {
    console.error("Error restoring memo:", err);
    alert("復元に失敗しました");
  }
}

// メモ編集
async function editMemo(memoId) {
  const memo = memos.find((m) => m.id === memoId);
  if (!memo) return;

  const newContent = prompt("メモを編集:", memo.content);
  if (newContent === null || newContent === memo.content) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/memos/${memoId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("googleToken")}`,
      },
      body: JSON.stringify({ content: newContent }),
    });

    if (!response.ok) throw new Error("Failed to update memo");

    // 成功したら更新
    memo.content = newContent;
    renderMemos();
  } catch (err) {
    console.error("Error updating memo:", err);
    alert("更新に失敗しました");
  }
}

// メモ追加
async function addMemo() {
  const content = prompt("新しいメモを入力:");
  if (!content) return;

  try {
    const token = localStorage.getItem("googleToken");
    if (!token) {
      throw new Error("No authentication token");
    }

    const response = await fetch(`${API_BASE_URL}/api/memos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) throw new Error("Failed to add memo");

    // 成功したらリロード
    await loadMemos();
  } catch (err) {
    console.error("Error adding memo:", err);
    alert("追加に失敗しました");
  }
}

// 全件削除（論理削除のみ）
async function deleteAllMemos() {
  const activeMemos = memos.filter((memo) => !memo.deleted);
  if (activeMemos.length === 0) {
    alert("削除するメモがありません");
    return;
  }

  if (!confirm(`${activeMemos.length}件のメモを削除しますか？`)) return;

  try {
    // アクティブなメモのみ削除（論理削除）
    for (const memo of activeMemos) {
      await deleteMemo(memo.id);
    }

    // リロード
    await loadMemos();
  } catch (err) {
    console.error("Error deleting all memos:", err);
    alert("全件削除に失敗しました");
  }
}

// 完全削除（論理削除済みのみ）
async function permanentDeleteAllMemos() {
  const deletedMemos = memos.filter((memo) => memo.deleted);
  if (deletedMemos.length === 0) {
    alert("完全削除するメモがありません");
    return;
  }

  if (
    !confirm(
      `削除済みの${deletedMemos.length}件のメモを完全に削除しますか？\nこの操作は取り消せません。`
    )
  )
    return;

  try {
    // 削除済みメモのみ完全削除
    for (const memo of deletedMemos) {
      await deleteMemo(memo.id);
    }

    // リロード
    await loadMemos();
  } catch (err) {
    console.error("Error permanently deleting memos:", err);
    alert("完全削除に失敗しました");
  }
}

// タイムスタンプフォーマット
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  // 1分未満
  if (diff < 60000) {
    return "たった今";
  }

  // 1時間未満
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}分前`;
  }

  // 24時間未満
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}時間前`;
  }

  // それ以外
  return date.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}

// UI制御関数
function showLoading() {
  loading.style.display = "flex";
}

function hideLoading() {
  loading.style.display = "none";
}

function showError() {
  error.style.display = "block";
}

function hideError() {
  error.style.display = "none";
}

// 音声入力開始
function startVoiceInput() {
  // Web Speech APIのサポート確認
  if (
    !("webkitSpeechRecognition" in window) &&
    !("SpeechRecognition" in window)
  ) {
    alert("ご利用のブラウザは音声入力に対応していません");
    return;
  }

  // 音声認識オブジェクトの初期化
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  // 設定
  recognition.lang = "ja-JP";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  // モーダル表示
  voiceModal.classList.add("active");
  voiceBtn.classList.add("recording");
  voiceStatus.textContent = "話してください...";

  // 認識結果の処理
  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    voiceStatus.textContent = '認識中: "' + transcript + '"';

    // メモとして追加
    await addMemoFromVoice(transcript);

    // モーダルを閉じる
    setTimeout(() => {
      stopVoiceInput();
    }, 1000);
  };

  // エラー処理
  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    let errorMessage = "エラーが発生しました";

    switch (event.error) {
      case "no-speech":
        errorMessage = "音声が検出されませんでした";
        break;
      case "audio-capture":
        errorMessage = "マイクが使用できません";
        break;
      case "not-allowed":
        errorMessage = "マイクの使用が許可されていません";
        break;
    }

    voiceStatus.textContent = errorMessage;
    setTimeout(() => {
      stopVoiceInput();
    }, 2000);
  };

  // 認識終了時
  recognition.onend = () => {
    voiceBtn.classList.remove("recording");
  };

  // 認識開始
  recognition.start();
}

// 音声入力停止
function stopVoiceInput() {
  if (recognition) {
    recognition.stop();
  }
  voiceModal.classList.remove("active");
  voiceBtn.classList.remove("recording");
}

// 音声からメモ追加
async function addMemoFromVoice(content) {
  if (!content) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/memos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("googleToken")}`,
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) throw new Error("Failed to add memo");

    // 成功メッセージ
    voiceStatus.textContent = "メモを追加しました！";

    // リロード
    await loadMemos();
  } catch (err) {
    console.error("Error adding memo:", err);
    voiceStatus.textContent = "メモの追加に失敗しました";
  }
}

// ========== 家族機能 ==========

// 家族メンバー読み込み
async function loadFamilyMembers() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/family/members`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("googleToken")}`,
      },
    });

    // 401エラーの場合は自動ログアウト
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) throw new Error("Failed to load family members");

    const data = await response.json();
    familyMembers = data.members || [];

    // メンバーのアイコンを表示
    displayFamilyMemberIcons();

    // メニューの表示制御
    updateMenuVisibility();
  } catch (err) {
    console.error("Error loading family members:", err);
  }
}

// 家族メンバーのアイコンを表示
function displayFamilyMemberIcons() {
  familyMembersCount.innerHTML = ""; // クリア

  // アイコンコンテナを作成
  const iconsContainer = document.createElement("div");
  iconsContainer.className = "family-icons-container";

  // 現在のユーザーのアイコンを表示（メニューのアバターと同じものを使用）
  if (userAvatarImg.style.display !== "none" && userAvatarImg.src) {
    // 画像アバターがある場合
    const icon = document.createElement("img");
    icon.className = "family-member-icon";
    icon.src = userAvatarImg.src;
    icon.alt = userAvatarImg.alt || "Me";
    iconsContainer.appendChild(icon);
  } else {
    // イニシャルアバターの場合
    const initial = document.createElement("div");
    initial.className = "family-member-initial";
    initial.textContent = userAvatarFallback.textContent || "U";
    iconsContainer.appendChild(initial);
  }

  // 家族メンバーがいる場合は人数を表示
  if (familyMembers && familyMembers.length > 0) {
    const count = document.createElement("span");
    count.className = "family-count";
    count.textContent = familyMembers.length;
    iconsContainer.appendChild(count);
  }

  familyMembersCount.appendChild(iconsContainer);
}

// メニューの表示制御
function updateMenuVisibility() {
  // familyMembersが空の場合は早期リターン
  if (!familyMembers || familyMembers.length === 0) {
    // 初期状態：全員が招待可能、招待を受けるのみ表示
    inviteFamilyBtn.parentElement.style.display = "block";
    joinFamilyBtn.parentElement.style.display = "block";
    leaveFamilyBtn.parentElement.style.display = "none";
    return;
  }

  const currentUser = familyMembers.find((m) => m.userId === currentUserId);
  const isOwner = currentUser && currentUser.isOwner;
  const isSingleFamily = familyMembers.length === 1;

  // 家族に招く - 誰でも表示
  inviteFamilyBtn.parentElement.style.display = "block";

  // 招待を受ける - 一人家族のみ表示
  joinFamilyBtn.parentElement.style.display = isSingleFamily ? "block" : "none";

  // 独立 - 当主でない人のみ表示
  leaveFamilyBtn.parentElement.style.display =
    !isOwner && !isSingleFamily ? "block" : "none";
}

// バージョン情報を初期化
function initializeVersion() {
  // YYMMDDSS形式でバージョン表示
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");

  versionText.textContent = `build:${yy}${mm}${dd}${hh}`;
}

// 招待コード生成
async function generateInviteCode() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/family/invite-codes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("googleToken")}`,
      },
    });

    if (!response.ok) throw new Error("Failed to generate invite code");

    const data = await response.json();
    inviteCode.textContent = data.code;
    alexaCode.textContent = data.code;
    inviteModal.style.display = "flex";

    // 5分後にモーダルを自動で閉じる
    setTimeout(() => {
      inviteModal.style.display = "none";
    }, 300000);
  } catch (err) {
    console.error("Error generating invite code:", err);
    alert("招待コードの生成に失敗しました");
  }
}

// 家族に参加
async function joinFamily() {
  const code = joinCodeInput.value.trim();
  if (code.length !== 4) {
    alert("4桁の招待コードを入力してください");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/family/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("googleToken")}`,
      },
      body: JSON.stringify({ inviteCode: code }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to join family");
    }

    joinModal.style.display = "none";
    alert("家族に参加しました");

    // リロード
    await loadMemos();
    await loadFamilyMembers();
  } catch (err) {
    console.error("Error joining family:", err);
    alert(err.message || "家族への参加に失敗しました");
  }
}

// 家を出る
async function leaveFamily() {
  if (!confirm("本当に独立しますか? 現在のメモ一覧は全て見えなくなります")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/family/leave`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("googleToken")}`,
      },
    });

    if (!response.ok) throw new Error("Failed to leave family");

    alert("家を出て、独立いたしました");

    // リロード
    await loadMemos();
    await loadFamilyMembers();
  } catch (err) {
    console.error("Error leaving family:", err);
    alert("家族からの退出に失敗しました");
  }
}

// 家督相続
async function transferOwnership(newOwnerUserId, newOwnerName) {
  if (
    !confirm(
      `${newOwnerName}さんに家督を譲りますか？\n\nこの操作は取り消せません。`
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/family/transfer-owner`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("googleToken")}`,
      },
      body: JSON.stringify({ newOwnerUserId }),
    });

    if (!response.ok) throw new Error("Failed to transfer ownership");

    alert(`${newOwnerName}さんが新たな当主となりました`);

    // リロード
    await loadFamilyMembers();
    membersModal.style.display = "none";
    await loadMemos();
  } catch (err) {
    console.error("Error transferring ownership:", err);
    alert("家督相続に失敗しました");
  }
}

// メンバー一覧表示
async function showFamilyMembers() {
  await loadFamilyMembers();

  membersList.innerHTML = "";

  familyMembers.forEach((member) => {
    const memberItem = document.createElement("div");
    memberItem.className = "member-item";

    const memberInfo = document.createElement("div");
    memberInfo.className = "member-info";

    const memberNameWrapper = document.createElement("div");
    memberNameWrapper.style.flex = "1";

    const memberName = document.createElement("div");
    memberName.className = "member-name";
    memberName.textContent = member.name;

    memberNameWrapper.appendChild(memberName);
    memberInfo.appendChild(memberNameWrapper);

    // 現在のユーザーが筆頭者で、このメンバーが筆頭者でない場合、移譲ボタンを表示
    // ただし、Alexaユーザー（Amazon ID）には移譲しない
    const currentUser = familyMembers.find((m) => m.userId === currentUserId);
    const isAlexaUser = member.userId.startsWith("amzn1.ask.account.");
    if (
      currentUser &&
      currentUser.isOwner &&
      !member.isOwner &&
      !isAlexaUser &&
      familyMembers.length > 1
    ) {
      const transferBtn = document.createElement("button");
      transferBtn.className = "transfer-btn";
      transferBtn.textContent = "家督を譲る";
      transferBtn.onclick = () => transferOwnership(member.userId, member.name);
      memberInfo.appendChild(transferBtn);
    }

    const memberBadge = document.createElement("div");
    memberBadge.className = member.isOwner
      ? "member-badge owner"
      : "member-badge";
    memberBadge.textContent = member.isOwner ? "当主" : "家族";
    memberInfo.appendChild(memberBadge);

    memberItem.appendChild(memberInfo);

    membersList.appendChild(memberItem);
  });

  membersModal.style.display = "flex";
}

// 初期化
document.addEventListener("DOMContentLoaded", () => {
  initializeVersion();
});
