// API設定
const API_BASE_URL = 'https://99nb4tfwu6.execute-api.ap-northeast-1.amazonaws.com/dev';

// 状態管理
let memos = [];
let isLoading = false;
let isRefreshing = false;

// DOM要素
const memoList = document.getElementById('memo-list');
const emptyState = document.getElementById('empty-state');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const menuBtn = document.getElementById('menu-btn');
const menuOverlay = document.getElementById('menu-overlay');
const menuPanel = document.getElementById('menu-panel');
const addMemoBtn = document.getElementById('add-memo-btn');
const deleteAllBtn = document.getElementById('delete-all-btn');
const permanentDeleteBtn = document.getElementById('permanent-delete-btn');
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeHelpBtn = document.getElementById('close-help-btn');
const pullToRefresh = document.getElementById('pull-to-refresh');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    loadMemos();
    setupEventListeners();
    setupPullToRefresh();
});

// イベントリスナー設定
function setupEventListeners() {
    // メニューボタン
    menuBtn.addEventListener('click', () => {
        openMenu();
    });

    // メニューオーバーレイ
    menuOverlay.addEventListener('click', () => {
        closeMenu();
    });

    // メニューパネル内のクリックイベント
    menuPanel.addEventListener('click', (e) => {
        // メニューアイテム以外をクリックした場合は閉じる
        if (!e.target.classList.contains('menu-item')) {
            closeMenu();
        }
    });

    // メニュー項目
    addMemoBtn.addEventListener('click', () => {
        closeMenu();
        addMemo();
    });

    deleteAllBtn.addEventListener('click', () => {
        closeMenu();
        deleteAllMemos();
    });

    permanentDeleteBtn.addEventListener('click', () => {
        closeMenu();
        permanentDeleteAllMemos();
    });

    helpBtn.addEventListener('click', () => {
        closeMenu();
        showHelp();
    });

    // ヘルプモーダル閉じる
    closeHelpBtn.addEventListener('click', () => {
        hideHelp();
    });

    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            hideHelp();
        }
    });
}

// メニュー開く
function openMenu() {
    menuOverlay.classList.add('active');
    menuPanel.classList.add('active');
}

// メニュー閉じる
function closeMenu() {
    menuOverlay.classList.remove('active');
    menuPanel.classList.remove('active');
}

// ヘルプ表示
function showHelp() {
    helpModal.classList.add('active');
}

// ヘルプ非表示
function hideHelp() {
    helpModal.classList.remove('active');
}

// プルリフレッシュ設定
function setupPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let pulling = false;

    document.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            startY = e.touches[0].clientY;
            pulling = true;
        }
    });

    document.addEventListener('touchmove', (e) => {
        if (!pulling) return;
        
        currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        
        if (pullDistance > 0 && pullDistance < 150) {
            e.preventDefault();
            pullToRefresh.style.top = `${Math.min(pullDistance - 60, 80)}px`;
            
            if (pullDistance > 80) {
                pullToRefresh.classList.add('visible');
            }
        }
    });

    document.addEventListener('touchend', async () => {
        if (!pulling) return;
        
        pulling = false;
        const pullDistance = currentY - startY;
        
        if (pullDistance > 80) {
            await loadMemos();
        }
        
        pullToRefresh.classList.remove('visible');
        pullToRefresh.style.top = '-60px';
    });
}

// メモ読み込み
async function loadMemos() {
    if (isLoading) return;
    
    isLoading = true;
    showLoading();
    hideError();

    try {
        const response = await fetch(`${API_BASE_URL}/api/memos`);
        if (!response.ok) throw new Error('Failed to fetch memos');
        
        memos = await response.json();
        renderMemos();
    } catch (err) {
        console.error('Error loading memos:', err);
        showError();
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// メモ表示
function renderMemos() {
    memoList.innerHTML = '';
    
    if (memos.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    memos.forEach(memo => {
        const memoElement = createMemoElement(memo);
        memoList.appendChild(memoElement);
    });
}

// メモ要素作成
function createMemoElement(memo) {
    const div = document.createElement('div');
    div.className = 'memo-item';
    if (memo.deleted) {
        div.classList.add('deleted');
    }
    div.dataset.memoId = memo.id;
    
    const content = document.createElement('div');
    content.className = 'memo-content';
    content.textContent = memo.content;
    
    const timestamp = document.createElement('div');
    timestamp.className = 'memo-timestamp';
    timestamp.textContent = formatTimestamp(memo.timestamp);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = memo.deleted ? '完全削除' : '削除';
    
    // 削除済みの場合は復元ボタン、通常の場合は編集ボタンを追加
    if (memo.deleted) {
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'restore-btn';
        restoreBtn.textContent = '復元';
        div.appendChild(restoreBtn);
    } else {
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = '編集';
        div.appendChild(editBtn);
    }
    
    div.appendChild(content);
    div.appendChild(timestamp);
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

    element.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        swiping = true;
        element.classList.add('swiping');
    });

    element.addEventListener('touchmove', (e) => {
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

    element.addEventListener('touchend', () => {
        if (!swiping) return;
        
        swiping = false;
        element.classList.remove('swiping');
        
        const diffX = currentX - startX;
        
        // 左スワイプ（全てのメモ）
        if (diffX < -50) {
            element.classList.add('swipe-left');
            element.classList.remove('swipe-right');
            element.style.transform = '';
        } 
        // 右スワイプ
        else if (diffX > 50) {
            element.classList.add('swipe-right');
            element.classList.remove('swipe-left');
            element.style.transform = '';
        } 
        // スワイプキャンセル
        else {
            element.classList.remove('swipe-left');
            element.classList.remove('swipe-right');
            element.style.transform = '';
        }
    });

    // 削除ボタンクリック
    const deleteBtn = element.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteMemo(memoId);
    });

    // 復元ボタンクリック（削除済みの場合のみ）
    if (isDeleted) {
        const restoreBtn = element.querySelector('.restore-btn');
        restoreBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await restoreMemo(memoId);
        });
    } else {
        // 編集ボタンクリック（通常メモの場合のみ）
        const editBtn = element.querySelector('.edit-btn');
        editBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await editMemo(memoId);
        });
    }
}

// メモ削除
async function deleteMemo(memoId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/memos/${memoId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete memo');
        
        const result = await response.json();
        
        if (result.action === 'physical_delete') {
            // 物理削除の場合はリストから削除
            memos = memos.filter(memo => memo.id !== memoId);
        } else {
            // 論理削除の場合は削除フラグを更新
            const memo = memos.find(m => m.id === memoId);
            if (memo) {
                memo.deleted = true;
            }
        }
        renderMemos();
        
    } catch (err) {
        console.error('Error deleting memo:', err);
        alert('削除に失敗しました');
    }
}

// メモ復元
async function restoreMemo(memoId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/memos/${memoId}/restore`, {
            method: 'PUT'
        });
        
        if (!response.ok) throw new Error('Failed to restore memo');
        
        // 成功したらリロード
        await loadMemos();
        
    } catch (err) {
        console.error('Error restoring memo:', err);
        alert('復元に失敗しました');
    }
}

// メモ編集
async function editMemo(memoId) {
    const memo = memos.find(m => m.id === memoId);
    if (!memo) return;
    
    const newContent = prompt('メモを編集:', memo.content);
    if (newContent === null || newContent === memo.content) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/memos/${memoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: newContent })
        });
        
        if (!response.ok) throw new Error('Failed to update memo');
        
        // 成功したら更新
        memo.content = newContent;
        renderMemos();
        
    } catch (err) {
        console.error('Error updating memo:', err);
        alert('更新に失敗しました');
    }
}

// メモ追加
async function addMemo() {
    const content = prompt('新しいメモを入力:');
    if (!content) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/memos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        if (!response.ok) throw new Error('Failed to add memo');
        
        // 成功したらリロード
        await loadMemos();
        
    } catch (err) {
        console.error('Error adding memo:', err);
        alert('追加に失敗しました');
    }
}

// 全件削除（論理削除のみ）
async function deleteAllMemos() {
    const activeMemos = memos.filter(memo => !memo.deleted);
    if (activeMemos.length === 0) {
        alert('削除するメモがありません');
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
        console.error('Error deleting all memos:', err);
        alert('全件削除に失敗しました');
    }
}

// 完全削除（論理削除済みのみ）
async function permanentDeleteAllMemos() {
    const deletedMemos = memos.filter(memo => memo.deleted);
    if (deletedMemos.length === 0) {
        alert('完全削除するメモがありません');
        return;
    }
    
    if (!confirm(`削除済みの${deletedMemos.length}件のメモを完全に削除しますか？\nこの操作は取り消せません。`)) return;
    
    try {
        // 削除済みメモのみ完全削除
        for (const memo of deletedMemos) {
            await deleteMemo(memo.id);
        }
        
        // リロード
        await loadMemos();
        
    } catch (err) {
        console.error('Error permanently deleting memos:', err);
        alert('完全削除に失敗しました');
    }
}

// タイムスタンプフォーマット
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // 1分未満
    if (diff < 60000) {
        return 'たった今';
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
    return date.toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    });
}

// UI制御関数
function showLoading() {
    loading.style.display = 'flex';
}

function hideLoading() {
    loading.style.display = 'none';
}

function showError() {
    error.style.display = 'block';
}

function hideError() {
    error.style.display = 'none';
}