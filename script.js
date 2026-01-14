// ========================================
// グローバル変数とゲームデータ
// ========================================

let gameData = {
    player: {
        level: 1,
        exp: 0,
        coins: 0
    },
    studyLogs: [],
    inventory: []
};

// タイマー関連
let timerInterval = null;
let elapsedSeconds = 0;
let currentSubject = "数学";

let startTime = null;
let elapsedBeforePause = 0;

function startTimer() {
    console.log("🔥 startTimer 呼ばれた");
    if (timerInterval) return;

    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const now = Date.now();
    const elapsedMs = elapsedBeforePause + (now - startTime);
    elapsedSeconds = Math.floor(elapsedMs / 1000);

    renderTimer(elapsedSeconds);
}

function pauseTimer() {
    if (!timerInterval) return;

    clearInterval(timerInterval);
    timerInterval = null;
    elapsedBeforePause += Date.now() - startTime;
}

function renderTimer(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hours = Math.floor(totalSeconds / 3600);
    const displayMinutes = Math.floor((totalSeconds % 3600) / 60);

    const formattedTime =
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0");

    const formattedLCD =
        String(hours).padStart(2, "0") + ':' +
        String(displayMinutes).padStart(2, "0") + ':' +
        String(seconds).padStart(2, "0");

    const timerText = document.getElementById("timer-text");
    if (timerText) {
        timerText.textContent = formattedTime;
    }

    const timerDisplay = document.getElementById("timer-display");
    if (timerDisplay) {
        timerDisplay.textContent = formattedLCD;
    }
}


// レベルテーブル（レベルアップに必要な累積EXP）
const LEVEL_TABLE = {
    1: 0,
    2: 100,
    3: 250,
    4: 450,
    5: 700,
    6: 1000,
    7: 1350,
    8: 1750,
    9: 2200,
    10: 2700
};

// ガチャアイテムデータ
const GACHA_ITEMS = [
    // ★1 (60%) - 6種類
    { id: 1, name: "木の剣", icon: "assets/items_sheet.png", rarity: 1, type: "image", position: "0% 0%" },
    { id: 2, name: "布の服", icon: "assets/items_sheet.png", rarity: 1, type: "image", position: "18% 0%" },
    { id: 3, name: "革の靴", icon: "assets/items_sheet.png", rarity: 1, type: "image", position: "36% 0%" },
    { id: 4, name: "小さな盾", icon: "assets/items_sheet.png", rarity: 1, type: "image", position: "54% 0%" },
    { id: 5, name: "ポーション", icon: "assets/items_sheet.png", rarity: 1, type: "image", position: "72% 0%" },
    { id: 6, name: "パン", icon: "assets/items_sheet.png", rarity: 1, type: "image", position: "90% 0%" },
    // ★2 (30%) - 4種類
    { id: 7, name: "鋼の剣", icon: "assets/items_sheet.png", rarity: 2, type: "image", position: "0% 45%" },
    { id: 8, name: "鎖の鎧", icon: "assets/items_sheet.png", rarity: 2, type: "image", position: "25% 45%" },
    { id: 9, name: "魔法の杖", icon: "assets/items_sheet.png", rarity: 2, type: "image", position: "55% 45%" },
    { id: 10, name: "魔法の本", icon: "assets/items_sheet.png", rarity: 2, type: "image", position: "85% 45%" },
    // ★3 (10%) - 2種類
    { id: 11, name: "伝説の剣", icon: "assets/items_sheet.png", rarity: 3, type: "image", position: "35% 90%" },
    { id: 12, name: "ドラゴンの盾", icon: "assets/items_sheet.png", rarity: 3, type: "image", position: "65% 90%" }
];

// ========================================
// 初期化とデータ読み込み
// ========================================

function initGame() {
    loadGameData();
    updateHomeScreen();
    calculateTodayStats();
    console.log("Game initialized!");
}

function loadGameData() {
    const savedData = localStorage.getItem('studyQuestData');
    if (savedData) {
        gameData = JSON.parse(savedData);
        console.log("Game data loaded:", gameData);
    } else {
        console.log("No saved data, using default");
    }
}

function saveGameData() {
    localStorage.setItem('studyQuestData', JSON.stringify(gameData));
    console.log("Game data saved");
}

// ========================================
// 画面切り替え
// ========================================

function showScreen(screenId) {
    // If leaving study screen, pause timer (as per requirement)
    // We check if we are currently active in study-screen before switching?
    // Simply calling pauseTimer() is safe even if not running, except it sets elapsed.
    // User said "BACK / 画面離脱時には pauseTimer() を必ず呼ぶこと".
    // If we are moving AWAY from study-screen:
    const studyScreen = document.getElementById('study-screen');
    if (studyScreen.classList.contains('active') && screenId !== 'study-screen') {
        pauseTimer();
    }

    // 全ての画面を非表示
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // 指定された画面を表示
    document.getElementById(screenId).classList.add('active');

    // 画面ごとの初期化処理
    if (screenId === 'home-screen') {
        updateHomeScreen();
    } else if (screenId === 'gacha-screen') {
        updateGachaScreen();
    } else if (screenId === 'menu-screen') {
        updateInventoryScreen();
    } else if (screenId === 'log-screen') {
        updateLogScreen();
    } else if (screenId === 'study-screen') {
        calculateTodayStats();
        // Reset UI buttons based on timer state
        if (timerInterval) {
            document.getElementById('start-button').classList.add('hidden');
            document.getElementById('stop-button').classList.remove('hidden');
        } else {
            document.getElementById('start-button').classList.remove('hidden');
            document.getElementById('stop-button').classList.add('hidden');
        }
    }
}

// ========================================
// ホーム画面の更新
// ========================================

function updateHomeScreen() {
    const player = gameData.player;

    // レベル表示
    document.getElementById('player-level').textContent = player.level;

    // EXP表示
    const currentLevelExp = LEVEL_TABLE[player.level] || 0;
    const nextLevelExp = LEVEL_TABLE[player.level + 1] || currentLevelExp;
    const expInLevel = player.exp - currentLevelExp;
    const expNeeded = nextLevelExp - currentLevelExp;

    document.getElementById('current-exp').textContent = expInLevel;
    document.getElementById('max-exp').textContent = expNeeded;

    // EXPバーの幅
    const expPercentage = (expInLevel / expNeeded) * 100;
    document.getElementById('exp-bar').style.width = expPercentage + '%';

    // コイン表示
    document.getElementById('coin-count').textContent = player.coins;
}

// ========================================
// 勉強タイマー機能
// ========================================

function selectSubject(button) {
    // If the button is already active, deselect it
    if (button.classList.contains('active')) {
        button.classList.remove('active');
        currentSubject = null;
        return;
    }

    // Otherwise, deselect all and select this one
    document.querySelectorAll('.subject-btn-mvp').forEach(btn => {
        btn.classList.remove('active');
    });

    button.classList.add('active');
    currentSubject = button.dataset.subject;
}

// Old startTimer removed. New startTimer is defined at top.
// Function to handle UI toggle when starting timer (if not handled in new startTimer)
function activateTimerUI() {
    if (!currentSubject) {
        alert("勉強する科目を選択してください！");
        return false;
    }
    document.getElementById('start-button').classList.add('hidden');
    document.getElementById('stop-button').classList.remove('hidden');
    startTimer(); // Call the new startTimer
    return true;
}


// Jump Animation & Transition
let isStartingStudy = false;

// Jump Animation & Transition
function startStudyWithAnimation() {
    if (isStartingStudy) return; // 二重防止
    isStartingStudy = true;

    const char = document.querySelector('.character-motion');
    if (!char) {
        isStartingStudy = false;
        return;
    }

    char.classList.remove('jump-active');
    void char.offsetWidth;
    char.classList.add('jump-active');

    const onEnd = () => {
        char.removeEventListener('animationend', onEnd);
        showScreen('study-screen');
        // Ensure UI is updated and constraints checked
        if (!currentSubject) {
            // Fallback default if null (or handle error) - but usually subject is set by default? 
            // Global var currentSubject = "数学" is default.
        }
        document.getElementById('start-button').classList.add('hidden');
        document.getElementById('stop-button').classList.remove('hidden');
        startTimer();
    };

    char.addEventListener('animationend', onEnd, { once: true });
}


function stopTimer() {
    if (!timerInterval) return;

    clearInterval(timerInterval);
    timerInterval = null;

    const studyMinutes = Math.floor(elapsedSeconds / 60);

    // 記録を消さない (Save log first)
    // 1分以上なら保存 (Assuming existing logic requires 1 min, but specific user request says just save. I'll keep the 1 min check inside save function or here if cleaner, but user code implies direct save. I will respect my existing wrapper saveStudySession internal check or move it here. saveStudySession uses elapsedSeconds directly, so I should just call it before resetting.)
    if (elapsedSeconds >= 60) {
        saveStudySession();
    }

    // タイマーだけリセット
    elapsedSeconds = 0;
    updateTimerDisplay();

    document.getElementById('start-button').classList.remove('hidden');
    document.getElementById('stop-button').classList.add('hidden');
}

function updateTimerDisplay() {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    const display =
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');

    document.getElementById('timer-display').textContent = display;
}

function saveStudySession() {
    const minutes = Math.floor(elapsedSeconds / 60);
    if (minutes === 0) return; // 1分未満は記録しない

    const earnedExp = minutes * 10;
    const earnedCoins = minutes * 5;

    // 勉強ログに追加
    const log = {
        date: new Date().toISOString(),
        subject: currentSubject,
        minutes: minutes,
        exp: earnedExp,
        coins: earnedCoins
    };
    gameData.studyLogs.push(log);

    // プレイヤーデータ更新
    const oldLevel = gameData.player.level;
    gameData.player.exp += earnedExp;
    gameData.player.coins += earnedCoins;

    // レベルアップチェック
    checkLevelUp(oldLevel);

    // データ保存
    saveGameData();

    // 画面更新
    updateHomeScreen();
    calculateTodayStats();

    // 確認メッセージ
    alert(`勉強お疲れ様！\n${minutes}分勉強しました\n\n+${earnedExp} EXP\n+${earnedCoins} コイン`);
}

function checkLevelUp(oldLevel) {
    let newLevel = oldLevel;

    // レベルアップ判定
    for (let level = oldLevel + 1; level <= 10; level++) {
        if (gameData.player.exp >= LEVEL_TABLE[level]) {
            newLevel = level;
        } else {
            break;
        }
    }

    if (newLevel > oldLevel) {
        gameData.player.level = newLevel;
        showLevelUpModal(oldLevel, newLevel);
    }
}

function showLevelUpModal(oldLevel, newLevel) {
    document.getElementById('old-level').textContent = oldLevel;
    document.getElementById('new-level').textContent = newLevel;
    document.getElementById('levelup-modal').classList.remove('hidden');
}

function closeLevelUpModal() {
    document.getElementById('levelup-modal').classList.add('hidden');
}

function calculateTodayStats() {
    const today = new Date().toDateString();
    let todayMinutes = 0;

    gameData.studyLogs.forEach(log => {
        const logDate = new Date(log.date).toDateString();
        if (logDate === today) {
            todayMinutes += log.minutes;
        }
    });

    const hours = Math.floor(todayMinutes / 60);
    const mins = todayMinutes % 60;
    const display = `${String(hours).padStart(2, '0')}H ${String(mins).padStart(2, '0')}M`;

    const displayElement = document.getElementById('today-stats-display');
    if (displayElement) {
        displayElement.textContent = display;
    }
}

// ========================================
// ガチャ機能
// ========================================

function updateGachaScreen() {
    document.getElementById('gacha-coin-count').textContent = gameData.player.coins;
}

function pullGacha() {
    if (gameData.player.coins < 100) {
        alert('コインが足りません！\n勉強してコインを集めましょう');
        return;
    }

    // コイン消費
    gameData.player.coins -= 100;

    // ガチャ抽選
    const item = drawGachaItem();

    // インベントリに追加
    addItemToInventory(item);

    // データ保存
    saveGameData();

    // 結果表示
    showGachaResult(item);

    // コイン表示更新
    updateGachaScreen();
    updateHomeScreen();
}

function drawGachaItem() {
    const rand = Math.random() * 100;
    let rarity;

    if (rand < 60) {
        rarity = 1; // ★1 (60%)
    } else if (rand < 90) {
        rarity = 2; // ★2 (30%)
    } else {
        rarity = 3; // ★3 (10%)
    }

    // 指定レアリティのアイテムからランダム選択
    const itemsOfRarity = GACHA_ITEMS.filter(item => item.rarity === rarity);
    const randomItem = itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)];

    return randomItem;
}

function addItemToInventory(item) {
    const existing = gameData.inventory.find(inv => inv.id === item.id);

    if (existing) {
        existing.count++;
    } else {
        gameData.inventory.push({
            id: item.id,
            name: item.name,
            icon: item.icon,
            rarity: item.rarity,
            count: 1
        });
    }
}

function showGachaResult(item) {
    const iconElement = document.getElementById('result-icon');
    if (item.type === 'image') {
        iconElement.innerHTML = '';
        iconElement.style.backgroundImage = `url('${item.icon}')`;
        iconElement.style.backgroundPosition = item.position;
        iconElement.classList.add('image-sprite');
    } else {
        iconElement.textContent = item.icon;
        iconElement.style.backgroundImage = 'none';
        iconElement.classList.remove('image-sprite');
    }
    document.getElementById('result-name').textContent = item.name;
    document.getElementById('result-rarity').textContent = '★'.repeat(item.rarity);
    document.getElementById('gacha-result').classList.remove('hidden');

    // Update mini log in gacha screen
    updateGachaMiniLog(item);
}

function updateGachaMiniLog(item) {
    const logContainer = document.getElementById('gacha-mini-log');
    if (!logContainer) return;

    const p = document.createElement('p');
    p.textContent = `You got: ${item.name}`;

    // Keep only last 2-3 logs as shown in reference
    if (logContainer.children.length >= 2) {
        logContainer.removeChild(logContainer.firstChild);
    }
    logContainer.appendChild(p);
}

function closeGachaResult() {
    document.getElementById('gacha-result').classList.add('hidden');
}

// ========================================
// メニュー画面（インベントリ）
// ========================================

function updateInventoryScreen() {
    const container = document.getElementById('inventory-container');

    if (gameData.inventory.length === 0) {
        container.innerHTML = '<p class="empty-message">まだアイテムを持っていません</p>';
        return;
    }

    container.innerHTML = '';

    gameData.inventory.forEach(item => {
        const card = document.createElement('div');
        card.className = `item-list-card rarity-${item.rarity}`;

        let iconHtml = '';
        if (item.icon && (item.icon.includes('assets/') || item.icon.startsWith('http'))) {
            iconHtml = `<div class="card-icon-box image-sprite" style="background-image: url('${item.icon}'); background-position: ${item.position || 'center'}; background-size: 600% auto;"></div>`;
        } else {
            iconHtml = `<div class="card-icon-box" style="font-size: 24px;">${item.icon || '📦'}</div>`;
        }

        card.innerHTML = `
            ${iconHtml}
            <div class="card-main">
                <div class="card-title">${item.name}</div>
                <div class="card-subtitle">${'★'.repeat(item.rarity)}</div>
            </div>
            <div class="card-badge">×${item.count}</div>
        `;
        container.appendChild(card);
    });
}

function confirmReset() {
    const confirmed = confirm('本当にデータをリセットしますか？\nこの操作は取り消せません。');

    if (confirmed) {
        localStorage.removeItem('studyQuestData');
        gameData = {
            player: { level: 1, exp: 0, coins: 0 },
            studyLogs: [],
            inventory: []
        };
        saveGameData();
        showScreen('home-screen');
        alert('データをリセットしました');
    }
}

// ========================================
// ログ画面
// ========================================

function updateLogScreen() {
    // 統計情報の計算
    let totalMinutes = 0;
    let totalExp = 0;

    gameData.studyLogs.forEach(log => {
        totalMinutes += log.minutes;
        totalExp += log.exp;
    });

    document.getElementById('total-time').textContent = totalMinutes;
    document.getElementById('total-exp').textContent = totalExp;

    const container = document.getElementById('log-container');
    if (gameData.studyLogs.length === 0) {
        container.innerHTML = '<p class="empty-message">まだ勉強記録がありません</p>';
        return;
    }

    container.innerHTML = '';
    // reverse to show newest first, but keep track of actual index
    const logsWithIndex = gameData.studyLogs.map((log, index) => ({ ...log, index }));
    const sortedLogs = logsWithIndex.reverse();

    sortedLogs.forEach(log => {
        const date = new Date(log.date);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

        const logItem = document.createElement('div');
        // Usng 'log-item' as requested, keeping 'item-list-card' for fallback or just replacing it if CSS covers it.
        // User explicitly asked for .log-item CSS which I added.
        logItem.className = 'log-item';
        logItem.innerHTML = `
            <div class="card-icon-box" style="font-size: 20px;">📜</div>
            <div class="log-text">
                <div class="card-title">${log.subject}</div>
                <div class="card-subtitle" style="color: #666;">${dateStr}</div>
            </div>
            <div class="card-badge" style="text-align: right; position: relative;">
                <div style="font-size: 11px;">${log.minutes}m / +${log.exp}E</div>
                <div class="log-actions" style="margin-top: 4px;">
                    <button class="log-btn edit" onclick="openEditLogModal(${log.index})">📝</button>
                    <button class="log-btn delete" onclick="deleteLog(${log.index})">🗑️</button>
                </div>
            </div>
        `;
        container.appendChild(logItem);
    });
}

// Log management
let editingLogIndex = null;

function deleteLog(index) {
    if (confirm("この記録を削除しますか？")) {
        gameData.studyLogs.splice(index, 1);
        saveGameData();
        updateLogScreen();
        updateHomeScreen();
        calculateTodayStats();
    }
}

function openEditLogModal(index) {
    editingLogIndex = index;
    const log = gameData.studyLogs[index];
    document.getElementById('edit-log-subject').value = log.subject;
    document.getElementById('edit-log-minutes').value = log.minutes;
    document.getElementById('edit-log-modal').classList.remove('hidden');
}

function closeEditLogModal() {
    document.getElementById('edit-log-modal').classList.add('hidden');
    editingLogIndex = null;
}

function saveEditedLog() {
    if (editingLogIndex === null) return;

    const newSubject = document.getElementById('edit-log-subject').value;
    const newMinutes = parseInt(document.getElementById('edit-log-minutes').value);

    if (isNaN(newMinutes) || newMinutes <= 0) {
        alert("有効な時間を入力してください");
        return;
    }

    const log = gameData.studyLogs[editingLogIndex];
    log.subject = newSubject;
    log.minutes = newMinutes;
    log.exp = newMinutes * 10;
    log.coins = newMinutes * 5;

    saveGameData();
    closeEditLogModal();
    updateLogScreen();
    updateHomeScreen();
    calculateTodayStats();
}

// ========================================
// ページ読み込み時に初期化
// ========================================

window.addEventListener('DOMContentLoaded', initGame);
