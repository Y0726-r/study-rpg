// ========================================
// ランダムキャラクターメッセージ
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    const messages = [
        "きょうも すこしずつ いこう！",
        "5分 できたら だいせいこう！",
        "疲れたら いったん やすも？",
        "きょうの ぼうけん は ここから！",
        "つづけてるの えらいぞ！",
        "あせらなくて だいじょうぶ"
    ];

    const messageEl = document.getElementById("characterMessage");
    if (!messageEl) return;

    const randomIndex = Math.floor(Math.random() * messages.length);
    messageEl.textContent = messages[randomIndex];
});

// ========================================
// グローバル変数とゲームデータ
// ========================================

let gameData = {
    player: {
        level: 1,
        exp: 0,
        coins: 0,
        stats: { hp: 100, maxHp: 100, atk: 10, def: 5 },
        equipment: { weapon: null, armor: null, accessory: null }
    },
    studyLogs: [],
    inventory: [],
    currentSubject: null,
    timer: {
        isRunning: false,
        startTime: null,
        elapsedBeforePause: 0
    }
};

// タイマー関連 (Session state, initialized from gameData at load)
let timerInterval = null;
let elapsedSeconds = 0;
let startTime = null;
let elapsedBeforePause = 0;

function startTimer() {
    console.log("🔥 startTimer 呼ばれた");

    // Guard: Ensure gameData.timer exists to prevent crashes
    if (!gameData.timer) {
        gameData.timer = { isRunning: false, startTime: null, elapsedBeforePause: 0 };
    }

    if (timerInterval) return;

    // 現在時刻から、過去の経過時間を引いた地点を「開始点」にする
    startTime = Date.now() - elapsedBeforePause;

    gameData.timer.isRunning = true;
    gameData.timer.startTime = startTime; // 保存用
    saveGameData();

    timerInterval = setInterval(updateTimer, 1000);
    updateTimer(); // 即時実行して1秒のラグを消す

    // Add pulsing class for visual feedback
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.classList.add('timer-pulsing');
}

function updateTimer() {
    if (!startTime) return;
    const now = Date.now();
    const elapsedMs = now - startTime;
    elapsedSeconds = Math.floor(elapsedMs / 1000);

    renderTimer(elapsedSeconds);
}

function pauseTimer() {
    if (!timerInterval) return;

    clearInterval(timerInterval);
    timerInterval = null;

    // 停止した瞬間の累積時間を保存
    elapsedBeforePause = Date.now() - startTime;

    gameData.timer.elapsedBeforePause = elapsedBeforePause;
    gameData.timer.isRunning = false;
    saveGameData();

    // Remove pulsing class
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.classList.remove('timer-pulsing');

    // UI更新
    updateStudyScreenUI();
}

function handlePauseResume() {
    // 科目選択チェック（これがないとアラートが一瞬で消える原因になる）
    if (!gameData.currentSubject) {
        showSubjectWarningModal();
        return;
    }

    if (timerInterval) {
        pauseTimer();
    } else {
        startTimer();
    }
    updateStudyScreenUI();
}

// UIの状態を一括管理する関数
function updateStudyScreenUI() {
    const startBtn = document.getElementById('start-button');
    const stopBtn = document.getElementById('stop-button');
    const pauseBtn = document.getElementById('pause-button');

    if (timerInterval) {
        // 実行中
        if (startBtn) startBtn.classList.add('hidden');
        if (pauseBtn) {
            pauseBtn.classList.remove('hidden');
            pauseBtn.textContent = 'PAUSE';
        }
        if (stopBtn) stopBtn.classList.remove('hidden');
    } else {
        // 停止中
        if (startBtn) {
            startBtn.classList.remove('hidden');
            startBtn.textContent = elapsedBeforePause > 0 ? 'RESUME' : 'START';
        }
        if (pauseBtn) pauseBtn.classList.add('hidden');

        // 1秒でも進んでいればSTOPボタンを見せる
        if (stopBtn) {
            if (elapsedBeforePause > 0) {
                stopBtn.classList.remove('hidden');
            } else {
                stopBtn.classList.add('hidden');
            }
        }
    }
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

// ========================================
// アイテム・マスターデータ (5x10マス対応)
// ========================================

const ITEM_CONFIG = {
    columns: 5,
    rows: 10,
    sheetPath: "./assets/items_sheet.png",
    maxCapacity: 50
};

/**
 * アイテム・マスターデータ
 * spriteIndex: 0〜49 (5x10のグリッド位置)
 */
const ITEM_MASTER = [
    // ★1 (Rarity 1)
    { id: 1, name: "木の剣", rarity: 1, spriteIndex: 0, type: "weapon", description: "冒険の始まりといえばこれ。" },
    { id: 2, name: "布の服", rarity: 1, spriteIndex: 1, type: "armor", description: "軽くて動きやすい。" },
    { id: 3, name: "革の靴", rarity: 1, spriteIndex: 2, type: "accessory", description: "長時間の勉強（冒険）でも疲れない。" },
    { id: 4, name: "小さな盾", rarity: 1, spriteIndex: 3, type: "shield", description: "誘惑を跳ね返すための盾。" },
    { id: 5, name: "ポーション", rarity: 1, spriteIndex: 4, type: "consumable", description: "疲れが少し取れる魔法の薬。" },
    { id: 6, name: "パン", rarity: 1, spriteIndex: 5, type: "consumable", description: "腹が減っては勉強ができぬ。" },
    { id: 7, name: "集中キャンディ", rarity: 1, spriteIndex: 12, type: "consumable", description: "レモン味でリフレッシュ！" },
    { id: 8, name: "ひとくちチョコ", rarity: 1, spriteIndex: 13, type: "consumable", description: "疲れた脳には糖分が一番。" },
    { id: 9, name: "サクサクビスケット", rarity: 1, spriteIndex: 14, type: "consumable", description: "お茶が欲しくなる素朴な味。" },
    { id: 10, name: "三色団子", rarity: 1, spriteIndex: 15, type: "consumable", description: "彩りが可愛い、和みのスイーツ。" },
    { id: 11, name: "消しゴムのカス", rarity: 1, spriteIndex: 16, type: "trash", description: "頑張った証だけど、捨ててもいいかも。" },
    { id: 12, name: "使い古したノート", rarity: 1, spriteIndex: 17, type: "consumable", description: "読み返すとやる気が湧いてくる。" },

    // ★2 (Rarity 2)
    { id: 13, name: "鋼の剣", rarity: 2, spriteIndex: 6, type: "weapon", description: "鋭い切れ味で課題を切り裂く。" },
    { id: 14, name: "鎖の鎧", rarity: 2, spriteIndex: 7, type: "armor", description: "集中力を守るための頑丈な鎧。" },
    { id: 15, name: "魔法の杖", rarity: 2, spriteIndex: 8, type: "weapon", description: "閃きを呼び起こす不思議な杖。" },
    { id: 16, name: "魔法の本", rarity: 2, spriteIndex: 9, type: "accessory", description: "難しい知識が詰まっている。" },
    { id: 17, name: "癒やしのマカロン", rarity: 2, spriteIndex: 18, type: "consumable", description: "食べるのがもったいない可愛さ。" },
    { id: 18, name: "星屑のコンペイトウ", rarity: 2, spriteIndex: 19, type: "consumable", description: "噛むとキラキラした音がする。" },
    { id: 19, name: "情熱のドーナツ", rarity: 2, spriteIndex: 20, type: "consumable", description: "燃えるようなやる気が湧く（気がする）。" },
    { id: 20, name: "銀のヘアピン", rarity: 2, spriteIndex: 21, type: "accessory", description: "前髪を留めるのにちょうどいい。" },
    { id: 21, name: "赤いリボン", rarity: 2, spriteIndex: 22, type: "accessory", description: "装備すると気分が華やぐ。" },
    { id: 22, name: "賢者の羽ペン", rarity: 2, spriteIndex: 23, type: "accessory", description: "スラスラと答えが書ける不思議なペン。" },
    { id: 23, name: "静寂の耳栓", rarity: 2, spriteIndex: 24, type: "accessory", description: "周りの音が聞こえなくなる魔法の耳栓。" },
    { id: 24, name: "幸運のコイン", rarity: 2, spriteIndex: 25, type: "consumable", description: "ガチャ運が上がるという噂がある。" },

    // ★3 (Rarity 3)
    { id: 25, name: "伝説の剣", rarity: 3, spriteIndex: 10, type: "weapon", description: "選ばれし勉強家だけが持てる黄金の剣。" },
    { id: 26, name: "ドラゴンの盾", rarity: 3, spriteIndex: 11, type: "shield", description: "あらゆる雑念を無効化する。" },
    { id: 27, name: "王家のショートケーキ", rarity: 3, spriteIndex: 26, type: "consumable", description: "今日一番頑張った自分へのご褒美！" },
    { id: 28, name: "聖なる宝冠", rarity: 3, spriteIndex: 27, type: "accessory", description: "高貴な輝きを放つティアラ。" },
    { id: 29, name: "精霊のドレス", rarity: 3, spriteIndex: 28, type: "armor", description: "まるで光を纏っているような服。" },
    { id: 30, name: "全知の眼鏡", rarity: 3, spriteIndex: 29, type: "accessory", description: "世界のすべてが見通せる伝説の眼鏡。" }
];

/**
 * スプライトのスタイル設定を取得するヘルパー
 */
function getItemSpriteStyle(itemIndex) {
    const col = itemIndex % ITEM_CONFIG.columns;
    const row = Math.floor(itemIndex / ITEM_CONFIG.columns);

    // 5x10マスの時の % 位置計算
    // col 0 -> 0%, col 4 -> 100% (4つの間隔があるため 100/4 = 25%刻み)
    const x = (col / (ITEM_CONFIG.columns - 1)) * 100;
    // row 0 -> 0%, row 9 -> 100% 
    const y = (row / (ITEM_CONFIG.rows - 1)) * 100;

    return {
        backgroundImage: `url('${ITEM_CONFIG.sheetPath}')`,
        backgroundPosition: `${x}% ${y}%`,
        backgroundSize: `${ITEM_CONFIG.columns * 100}% auto`
    };
}

// ガチャの抽選用リスト (ITEM_MASTERから生成)
const GACHA_ITEMS = ITEM_MASTER;

/**
 * デバッグ用：コインを消費せずにガチャを引く
 * ブラウザのコンソールで debugGacha() と入力して実行
 */
window.debugGacha = function () {
    console.log("🛠 Debug Gacha Pulled!");
    if (typeof drawGachaItem !== 'function') {
        console.error("drawGachaItem is not defined!");
        return;
    }
    const item = drawGachaItem();
    addItemToInventory(item);
    saveGameData();
    showGachaResult(item);
    updateGachaScreen();
    updateHomeScreen();
};

/**
 * デバッグ用：コインを増やす
 * ブラウザのコンソールで addCoins(1000) と入力して実行
 */
window.addCoins = function (amount = 1000) {
    if (typeof gameData === 'undefined') {
        console.error("gameData is not defined!");
        return;
    }
    gameData.player.coins += amount;
    saveGameData();
    updateHomeScreen();
    updateGachaScreen();
    console.log(`💰 Added ${amount} coins!`);
};

/**
 * デバッグ用：コインを消費せずにガチャを引く
 * ブラウザのコンソールで debugGacha() と入力して実行
 */
window.debugGacha = function () {
    console.log("🛠 Debug Gacha Pulled!");
    const item = drawGachaItem();
    addItemToInventory(item);
    saveGameData();
    showGachaResult(item);
    updateGachaScreen();
    updateHomeScreen();
};

/**
 * デバッグ用：コインを増やす
 * ブラウザのコンソールで addCoins(1000) と入力して実行
 */
window.addCoins = function (amount = 1000) {
    gameData.player.coins += amount;
    saveGameData();
    updateHomeScreen();
    updateGachaScreen();
    console.log(`💰 Added ${amount} coins!`);
};

// ========================================
// 初期化とデータ読み込み
// ========================================

function initGame() {
    loadGameData();
    updateHomeScreen();
    calculateTodayStats();

    // Restore Timer State
    if (gameData.timer) {
        elapsedBeforePause = gameData.timer.elapsedBeforePause || 0;

        if (gameData.timer.isRunning && gameData.timer.startTime) {
            // Restore startTime from saved data
            startTime = gameData.timer.startTime;

            // Resume timer automatically
            timerInterval = setInterval(updateTimer, 1000);
            updateTimer(); // Initial call
        } else {
            // Not running
            elapsedSeconds = Math.floor(elapsedBeforePause / 1000);
            renderTimer(elapsedSeconds);
        }
    }
    // 勉強ログの更新
    updateLogScreen();

    // Timer Controlsの初期化を念押し
    initTimerControls();

    console.log("Game initialized!");
}

function loadGameData() {
    const savedData = localStorage.getItem('studyQuestData');
    if (savedData) {
        gameData = JSON.parse(savedData);
        // Ensure timer object exists (migration for old saves)
        if (!gameData.timer) {
            gameData.timer = { isRunning: false, startTime: null, elapsedBeforePause: 0 };
        }
        // Ensure player and equipment exist
        if (!gameData.player) gameData.player = { level: 1, exp: 0, coins: 0, stats: { hp: 100, maxHp: 100, atk: 10, def: 5 }, equipment: {} };
        if (!gameData.player.equipment) gameData.player.equipment = { weapon: null, armor: null, accessory: null };
        if (!gameData.inventory) gameData.inventory = [];
        if (!gameData.studyLogs) gameData.studyLogs = [];

        console.log("Game data loaded:", gameData);
    } else {
        console.log("No saved data, using default");
    }

    // [Cleanup] Always start with no subject selected to enforce the "Select Subject first" rule.
    gameData.currentSubject = null;
}

function saveGameData() {
    localStorage.setItem('studyQuestData', JSON.stringify(gameData));
    console.log("Game data saved");
}

/**
 * ボタンを押した見た目を強制的に出す
 * @param {HTMLElement} btn - 押したボタン
 */

function goBack(btn) {
    // 押した見た目を付与
    btn.classList.add("pressed");

    // ★ 1フレーム描画させる
    requestAnimationFrame(() => {
        setTimeout(() => {
            showScreen('home-screen');
            btn.classList.remove("pressed");
        }, 150);
    });
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
    // 画面ごとの初期化処理

    // 背景切り替え (Gacha Mode)
    if (screenId === 'gacha-screen') {
        document.body.classList.add('gacha-mode');
    } else {
        document.body.classList.remove('gacha-mode');
    }

    if (screenId === 'home-screen') {
        updateHomeScreen();
    } else if (screenId === 'gacha-screen') {
        updateGachaScreen();
        // Randomize initial flavor text
        const flavorTexts = [
            "へえ、いいもの持ってるじゃん。",
            "運試しの時間だね。",
            "何が出るかな？",
            "今日はいいことあるかも？",
            "さあ、引いてみなよ。",
            "光ってる……！",
            "君の運命やいかに！",
            "..."
        ];
        const randomText = flavorTexts[Math.floor(Math.random() * flavorTexts.length)];
        const logContainer = document.getElementById('gacha-mini-log');
        if (logContainer) {
            // Clear previous or set specific P
            logContainer.innerHTML = `<p>${randomText}</p>`;
        }
    } else if (screenId === 'menu-screen') {
        updateInventoryScreen();
    } else if (screenId === 'log-screen') {
        updateLogScreen();
    } else if (screenId === 'study-screen') {
        calculateTodayStats();
        // ボタンの見た目を現在のタイマー状態に合わせる
        updateStudyScreenUI();

        // Restore active subject button from gameData
        document.querySelectorAll('.subject-btn-mvp').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subject === gameData.currentSubject);
        });
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
    // If the timer is running, we only allow stopping/resetting by clicking the active subject
    if (timerInterval) {
        if (button.classList.contains('active')) {
            // [Final Specification] Toggle off while running = Stop and Reset
            stopTimer();
        } else {
            // Ignore click on other subjects while running
            console.log("Subject change blocked while timer is running.");
        }
        return;
    }

    // If the button is already active, deselect it (Timer is NOT running here)
    if (button.classList.contains('active')) {
        button.classList.remove('active');
        gameData.currentSubject = null;
        saveGameData();
        return;
    }

    // Otherwise, deselect all and select this one (Timer is NOT running here)
    document.querySelectorAll('.subject-btn-mvp').forEach(btn => {
        btn.classList.remove('active');
    });

    button.classList.add('active');
    gameData.currentSubject = button.dataset.subject;
    saveGameData();
}

// Old startTimer removed. New startTimer is defined at top.
// Function to handle UI toggle when starting timer (if not handled in new startTimer)
function activateTimerUI() {
    // Subject selection check
    if (!gameData.currentSubject) {
        console.log("警告モーダルを表示します");
        showSubjectWarningModal();
        return;
    }

    startTimer();
    updateStudyScreenUI();
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
        isStartingStudy = false; // Restore flag reset

        // Manual Start: Do NOT start timer here.
        // UI is reset by showScreen -> initializeStudyScreen logic if needed,
        // or effectively handled by the fact that showScreen handles basic visibility.
        // We rely on user clicking START.
    };

    char.addEventListener('animationend', onEnd, { once: true });
}


function stopTimer() {
    if (!timerInterval && elapsedSeconds === 0) return;

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // 記録を保存 (Save log if elapsed time is significant)
    if (elapsedSeconds >= 60) {
        saveStudySession();
    }

    // Reset selection state
    gameData.currentSubject = null;
    document.querySelectorAll('.subject-btn-mvp').forEach(btn => {
        btn.classList.remove('active');
    });

    // Reset Persisted Timer State
    gameData.timer = {
        isRunning: false,
        startTime: null,
        elapsedBeforePause: 0
    };
    saveGameData();

    // タイマーだけリセット
    elapsedSeconds = 0;
    elapsedBeforePause = 0;
    renderTimer(0);

    // UI更新
    updateStudyScreenUI();
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
        subject: gameData.currentSubject,
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
    const player = gameData.player;
    document.getElementById('gacha-coin-count').textContent = player.coins;

    // Evolving Chest Image
    const chestImage = document.getElementById('chest-display');
    if (chestImage) {
        const player = gameData.player; // player変数が定義されていない場合はgameDataから参照
        let chestType = 'wood';
        //レベル判定ロジック
        if (player.level >= 99) chestType = 'lv99';
        else if (player.level >= 50) chestType = 'lv50';
        else if (player.level >= 20) chestType = 'gold';
        else if (player.level >= 10) chestType = 'silver';
        else if (player.level >= 5) chestType = 'bronze';

        chestImage.src = `./assets/item/chest/chest_${chestType}.png`;
    }
}

function pullGacha() {
    if (gameData.player.coins < 100) {
        showCoinShortageModal();
        return;
    }

    // Lock Button (Removed as button is gone, handled by pointer-events or just ignored)
    // const btn = document.getElementById('pull-button');
    // if (btn) btn.disabled = true;

    // Optional: Prevent double clicks on chest
    const chest = document.querySelector('.chest-centered');
    if (chest) {
        chest.style.pointerEvents = 'none'; // Disable click
        setTimeout(() => {
            chest.style.pointerEvents = 'auto'; // Re-enable after animation
        }, 2000);
    }

    // 所持上限チェック
    const currentTotal = gameData.inventory.reduce((sum, item) => sum + item.count, 0);
    if (currentTotal >= ITEM_CONFIG.maxCapacity) {
        showMessageModal("BAG FULL", "所持品がいっぱいです！<br>アイテムを捨てるか使用してください。");
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

    // 結果表示（アニメーション付き）
    // showGachaResult(item); -> Removed direct call

    // コイン表示更新
    updateGachaScreen();
    updateHomeScreen();

    // アニメーションシーケンス
    playGachaAnimation(item);
}

function playGachaAnimation(item) {
    const chestContainer = document.querySelector('.chest-centered');
    const chestImage = document.getElementById('chest-display');
    const flashOverlay = document.getElementById('flash-overlay');

    // 1. Shake (0ms - 500ms)
    chestContainer.classList.add('chest-shaking');

    // 2. Open & Flash (after 500ms)
    setTimeout(() => {
        chestContainer.classList.remove('chest-shaking');

        // Change to Open Chest
        chestImage.src = 'assets/chest_open.png';

        // Flash Effect
        flashOverlay.classList.add('flash-active');

        // 3. Show Result (after flash peaks - e.g. 200ms more)
        setTimeout(() => {
            showGachaResult(item);

            // Fade out flash
            setTimeout(() => {
                flashOverlay.classList.remove('flash-active');
            }, 500);

        }, 200);

    }, 500);
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
    const currentTotal = gameData.inventory.reduce((sum, item) => sum + item.count, 0);
    if (currentTotal >= ITEM_CONFIG.maxCapacity) return false;

    const existing = gameData.inventory.find(inv => inv.id === item.id);

    if (existing) {
        existing.count++;
    } else {
        gameData.inventory.push({
            id: item.id,
            name: item.name,
            rarity: item.rarity,
            spriteIndex: item.spriteIndex,
            count: 1
        });
    }
    return true;
}

function showGachaResult(item) {
    const iconElement = document.getElementById('result-icon');
    const textIconElement = document.getElementById('result-text-icon');

    // Reset display
    iconElement.style.display = 'none';
    if (textIconElement) textIconElement.style.display = 'none';

    // Icon Handling (Master Data Version)
    const style = getItemSpriteStyle(item.spriteIndex);
    iconElement.style.display = 'block';
    iconElement.innerHTML = '';
    iconElement.style.backgroundImage = style.backgroundImage;
    iconElement.style.backgroundPosition = style.backgroundPosition;
    iconElement.style.backgroundSize = style.backgroundSize;
    iconElement.classList.add('image-sprite');

    document.getElementById('result-name').textContent = item.name;
    document.getElementById('result-rarity').textContent = '★'.repeat(item.rarity);

    // Switch to use "show" class
    document.getElementById('gacha-result').classList.remove('hidden'); // Ensure hidden is removed if present
    document.getElementById('gacha-result').classList.add('show');

    // Update mini log in gacha screen
    updateGachaMiniLog(item);
}

function updateGachaMiniLog(item) {
    const logContainer = document.getElementById('gacha-mini-log');
    if (!logContainer) return;

    const p = document.createElement('p');
    p.textContent = `You got: ${item.name}`;
    p.className = 'gacha-log-entry'; // For floating animation

    // Keep only last 2-3 logs as shown in reference
    if (logContainer.children.length >= 3) {
        logContainer.removeChild(logContainer.firstChild);
    }
    logContainer.appendChild(p);
}

function closeGachaResult() {
    const modal = document.getElementById('gacha-result');
    modal.classList.remove('show');
    modal.classList.add('hidden');

    // Reset Chest to Level-appropriate Closed State
    const chestImage = document.getElementById('chest-display');
    if (chestImage) {
        updateGachaScreen(); // This will set the correct chest image based on level
        chestImage.style.animation = 'chestIdle 3s ease-in-out infinite';
    }

    // Re-enable Pull Button
    const btn = document.getElementById('pull-button');
    if (btn) btn.disabled = false;

    // New flavor text
    updateGachaScreen();
}

// ========================================
// メニュー画面（インベントリ）
// ========================================

function updateInventoryScreen() {
    console.log("Updating inventory screen...");
    const container = document.getElementById('inventory-container');
    const currentCountEl = document.getElementById('current-inv-count');
    const maxCountEl = document.getElementById('max-inv-count');

    if (maxCountEl) maxCountEl.textContent = ITEM_CONFIG.maxCapacity;
    const currentTotal = gameData.inventory.reduce((sum, item) => sum + item.count, 0);
    if (currentCountEl) currentCountEl.textContent = currentTotal;

    if (!container) return;

    if (!gameData.inventory || gameData.inventory.length === 0) {
        container.innerHTML = '<p class="empty-message">まだアイテムを持っていません</p>';
        return;
    }

    container.innerHTML = '';

    gameData.inventory.forEach(item => {
        const card = document.createElement('div');

        const equipment = gameData.player.equipment || {};
        const isEquipped = Object.values(equipment).some(eq => eq && eq.id === item.id);

        card.className = `item-list-card rarity-${item.rarity} ${isEquipped ? 'equipped' : ''}`;

        // Add click listener to show description
        card.onclick = (e) => {
            // Don't trigger if a button was clicked
            if (e.target.tagName === 'BUTTON') return;
            showItemDescription(item.id);
        };

        const style = getItemSpriteStyle(item.spriteIndex);
        const iconHtml = `<div class="card-icon-box image-sprite" style="background-image: ${style.backgroundImage} !important; background-position: ${style.backgroundPosition} !important; background-size: ${style.backgroundSize} !important; background-repeat: no-repeat !important; image-rendering: pixelated !important;"></div>`;

        let actionBtn = '';
        const masterItem = ITEM_MASTER.find(mi => mi.id === item.id);
        if (masterItem) {
            if (['weapon', 'armor', 'shield', 'accessory'].includes(masterItem.type)) {
                actionBtn = `<button class="item-action-btn" onclick="toggleEquip(${item.id})">${isEquipped ? 'REMOVE' : 'EQUIP'}</button>`;
            } else if (masterItem.type === 'consumable') {
                actionBtn = `<button class="item-action-btn" onclick="useItem(${item.id})">USE</button>`;
            }
        }

        // Add Discard button
        const discardBtn = `<button class="item-action-btn discard" onclick="confirmDiscard(${item.id})">DISCARD</button>`;

        card.innerHTML = `
            ${iconHtml}
            <div class="card-main">
                <div class="card-title">${item.name} ${isEquipped ? '<span class="eq-tag">(E)</span>' : ''}</div>
                <div class="card-subtitle">${'★'.repeat(item.rarity)}</div>
            </div>
            <div class="card-right">
                <div class="card-badge">×${item.count}</div>
                <div class="item-actions-row">
                    ${actionBtn}
                    ${discardBtn}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function toggleEquip(itemId) {
    const item = GACHA_ITEMS.find(gi => gi.id === itemId);
    if (!item) return;

    let slot = 'accessory';
    if (item.name.includes('剣') || item.name.includes('杖')) slot = 'weapon';
    else if (item.name.includes('服') || item.name.includes('鎧')) slot = 'armor';
    else if (item.name.includes('盾')) slot = 'shield'; // Adding shield slot conceptually or using accessory

    if (gameData.player.equipment[slot] && gameData.player.equipment[slot].id === itemId) {
        gameData.player.equipment[slot] = null;
    } else {
        gameData.player.equipment[slot] = { id: item.id, name: item.name };
    }

    saveGameData();
    updateInventoryScreen();
    updateHomeScreen();
}

function useItem(itemId) {
    const inventoryItem = gameData.inventory.find(i => i.id === itemId);
    if (!inventoryItem || inventoryItem.count <= 0) return;

    const masterItem = ITEM_MASTER.find(mi => mi.id === itemId);
    if (masterItem && masterItem.type === 'consumable') {
        showMessageModal("ITEM USED", `${masterItem.name}を使用しました！<br>体力が回復した気がする...。`);

        inventoryItem.count--;
        if (inventoryItem.count === 0) {
            gameData.inventory = gameData.inventory.filter(i => i.id !== itemId);
        }
    }

    saveGameData();
    updateInventoryScreen();
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

    // Daily Summary Card Logic
    const today = new Date().toDateString();
    let todayMinutes = 0, todayExp = 0, todayCoins = 0;

    gameData.studyLogs.forEach(log => {
        if (new Date(log.date).toDateString() === today) {
            todayMinutes += log.minutes;
            todayExp += log.exp;
            todayCoins += log.coins;
        }
    });

    if (todayMinutes > 0) {
        const summaryCard = document.createElement('div');
        summaryCard.className = 'summary-card-today';
        summaryCard.innerHTML = `
            <div class="summary-label">TODAY'S ACHIEVEMENT</div>
            <div class="summary-stats">
                <div class="summary-stat-box"><span class="label">TIME</span><span class="value">${todayMinutes}m</span></div>
                <div class="summary-stat-box"><span class="label">EXP</span><span class="value">+${todayExp}</span></div>
                <div class="summary-stat-box"><span class="label">COINS</span><span class="value">+${todayCoins}</span></div>
            </div>
        `;
        container.appendChild(summaryCard);
    }
    // reverse to show newest first, but keep track of actual index
    const logsWithIndex = gameData.studyLogs.map((log, index) => ({ ...log, index }));
    const sortedLogs = logsWithIndex.reverse();

    sortedLogs.forEach(log => {
        const date = new Date(log.date);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

        // Tier Determination
        let tierClass = 'card-bronze';
        let tierLabel = 'BRONZE';
        if (log.minutes >= 45) {
            tierClass = 'card-gold';
            tierLabel = 'GOLD';
        } else if (log.minutes >= 15) {
            tierClass = 'card-silver';
            tierLabel = 'SILVER';
        }

        // Subject to Icon Mapping
        let subjectClass = 'other';
        if (log.subject === '資格') subjectClass = 'math'; // Mapping to existing CSS classes
        else if (log.subject === '語学') subjectClass = 'english';
        else if (log.subject === 'ビジネス') subjectClass = 'science';
        else if (log.subject === 'その他') subjectClass = 'other';

        const logItem = document.createElement('div');
        logItem.className = `study-card ${tierClass}`;
        logItem.innerHTML = `
            <div class="card-header">
                <span class="card-tier">${tierLabel} RECORD</span>
                <span class="card-date">${dateStr}</span>
            </div>
            <div class="card-body">
                <div class="card-icon-box subject-icon ${subjectClass}" style="width: 48px; height: 48px; background-size: 80%; border: 2px solid #6b4400;"></div>
                <div class="card-content">
                    <div class="card-title">${log.subject}</div>
                    <div class="card-stats">
                        <span class="stat-item">⏱️ ${log.minutes}m</span>
                        <span class="stat-item">⭐ ${log.exp} EXP</span>
                        <span class="stat-item">🪙 ${log.coins}</span>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <button class="log-btn edit" onclick="openEditLogModal(${log.index})">EDIT</button>
                <button class="log-btn delete" onclick="deleteLog(${log.index})">DEL</button>
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


function closeOpening() {
    const opening = document.getElementById('opening-screen');
    if (!opening || !opening.classList.contains('active')) return;

    opening.classList.add('screen-fade-out');

    // アニメーションが終わった後にホームへ
    setTimeout(() => {
        showScreen('home-screen');
    }, 800);
}

window.addEventListener('DOMContentLoaded', initGame);

/* ========================================
   コイン不足モーダル制御
   ======================================== */
function showCoinShortageModal() {
    document.getElementById('coin-shortage-modal').classList.remove('hidden');
}

function closeCoinShortageModal() {
    document.getElementById('coin-shortage-modal').classList.add('hidden');
}

/* ========================================
   確認モーダル制御
   ======================================== */
function showConfirmModal(title, content, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const contentEl = document.getElementById('confirm-modal-content');
    const okBtn = document.getElementById('confirm-modal-ok');

    if (modal && titleEl && contentEl && okBtn) {
        titleEl.textContent = title;
        contentEl.innerHTML = content;

        // Reset and add new listener
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);

        newOkBtn.onclick = () => {
            onConfirm();
            closeConfirmModal();
        };

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.zIndex = '20001';
    }
}

function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function confirmDiscard(itemId) {
    const item = gameData.inventory.find(i => i.id === itemId);
    if (!item) return;

    showConfirmModal(
        "DISCARD ITEM",
        `${item.name}を1つ捨てますか？`,
        () => discardItem(itemId)
    );
}

function discardItem(itemId) {
    const index = gameData.inventory.findIndex(i => i.id === itemId);
    if (index === -1) return;

    const item = gameData.inventory[index];
    item.count--;

    if (item.count <= 0) {
        // If equipped, remove it first
        const equipment = gameData.player.equipment || {};
        Object.keys(equipment).forEach(slot => {
            if (equipment[slot] && equipment[slot].id === itemId) {
                gameData.player.equipment[slot] = null;
            }
        });
        gameData.inventory.splice(index, 1);
    }

    saveGameData();
    updateInventoryScreen();
    updateHomeScreen();
}

function showItemDescription(itemId) {
    const item = ITEM_MASTER.find(mi => mi.id === itemId);
    if (!item) return;

    showMessageModal(item.name, `[レア度: ★${item.rarity}]<br><br>${item.description}`);
}

/* ========================================
   汎用メッセージモーダル制御
   ======================================== */
function showMessageModal(title, content) {
    const modal = document.getElementById('message-modal');
    const titleEl = document.getElementById('message-modal-title');
    const contentEl = document.getElementById('message-modal-content');

    if (modal && titleEl && contentEl) {
        titleEl.textContent = title;
        contentEl.innerHTML = content;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.zIndex = '20000';
    }
}

function closeMessageModal() {
    const modal = document.getElementById('message-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

/* ========================================
   科目未選択モーダル制御 (Alert replacement)
   ======================================== */
function showSubjectWarningModal() {
    const modal = document.getElementById('subject-warning-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex'; // 強制的に表示
        modal.style.zIndex = '20000'; // 他の何よりも前面に出す
        console.log("モーダルを表示しました。ID:", modal.id);
    }
}

function closeSubjectWarningModal() {
    document.getElementById('subject-warning-modal').classList.add('hidden');
}

/* ========================================
   Timer Control Initialization (Event Listeners)
   ======================================== */
function initTimerControls() {
    console.log("Initializing Timer Controls...");
    // Redundant listeners for Start/Pause/Stop removed because they are handled by onclick in HTML.
    // This prevents the "Double Toggle" bug where a button click would Pause and immediately Resume.

    // Subject buttons do not have onclick in HTML, so we keep these listeners.
    document.querySelectorAll('.subject-btn-mvp').forEach(btn => {
        // Remove existing to be safe if called multiple times
        btn.removeEventListener('click', subjectBtnHandler);
        btn.addEventListener('click', subjectBtnHandler);
    });
}

// Named handler to allow removal if needed
function subjectBtnHandler(e) {
    selectSubject(e.currentTarget);
}


