// ========================================
// 初期化処理：オープニングムービーを最優先で表示
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("🎬 アプリ起動 - オープニングムービー初期化開始");

    // 1. 全ての画面を一旦隠す（activeクラスの除去）
    const allScreens = document.querySelectorAll('.screen');
    allScreens.forEach(screen => {
        screen.classList.remove('active');
        // インラインスタイルが残っている場合はリセット
        screen.style.display = '';
        screen.style.opacity = '';
    });

    // 2. オープニングムービーを確実に表示（showScreen 相当の処理）
    const openingMovie = document.getElementById('opening-movie');
    if (openingMovie) {
        openingMovie.classList.remove('hidden');
        openingMovie.classList.add('active'); // activeクラスを付与
        openingMovie.style.display = 'flex';
        openingMovie.style.opacity = '1';
        openingMovie.style.visibility = 'visible';
        console.log("✅ オープニングムービーを表示状態に固定しました");
    }

    // 3. キャラクターメッセージの初期設定
    updateCharacterMessage();

    // 4. ゲームデータの初期化
    // setTimeoutを使用して、レンダリングが完了してから実行
    setTimeout(() => {
        initGame();
        // ここで showScreen('home-screen') を呼んでいた場合は、
        // ムービーを確認するためにコメントアウト、または hasSeenOpening 無視でムービー維持
        console.log("🎮 ゲームデータ読み込み中（ムービー表示中）...");
    }, 100);
});

// ========================================
// グローバル変数とゲームデータ
// ========================================

let gameData = {
    player: {
        level: 1,
        exp: 0,
        coins: 0,
        stats: { hp: 100, maxHp: 100, atk: 10, def: 5, focus: 10, intellect: 10, strength: 10 },
        equipment: { weapon: null, armor: null, accessory: null }
    },
    studyLogs: [],
    inventory: [],
    currentSubject: null,
    timer: {
        isRunning: false,
        startTime: null,
        elapsedBeforePause: 0
    },
    hasSeenOpening: false,
    dragon: {
        obtained: false,
        hatched: false,
        type: null // 'red', 'blue', 'green', 'gold'
    }
};

// タイマー関連 (Session state, initialized from gameData at load)
let timerInterval = null;
let elapsedSeconds = 0;
let startTime = null;
let elapsedBeforePause = 0;

// Notification permission request wrapper
function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
}

const TIMER_MESSAGES = {
    PAUSE: [
        "少し休憩しましょう。深呼吸！",
        "ここまでお疲れ様。リフレッシュも大事！",
        "水分補給を忘れずにね。",
        "焦らなくて大丈夫。自分のペースで！",
        "ナイス集中力！一旦ブレイク。",
        "脳を休めるのも勉強のうちだよ。",
        "肩の力を抜いて、リラックス。"
    ],
    RESUME: [
        "さあ、ここからが本番だ！",
        "全集中でいこう！",
        "君ならできる。ファイト！",
        "一歩一歩、確実に積み上げよう。",
        "目指せ、レベルアップ！",
        "集中、集中！ゾーンに入ろう。",
        "その調子！応援してるよ！"
    ]
};

function showTimerMessage(type) {
    const msgBox = document.getElementById('timer-cheer-message');
    if (!msgBox) return;

    // Remove hidden
    msgBox.classList.remove('hidden');

    // Pick random message
    const list = TIMER_MESSAGES[type];
    if (!list) return;
    const msg = list[Math.floor(Math.random() * list.length)];

    // Set text
    msgBox.textContent = msg;

    // For RESUME, hide after few seconds
    if (type === 'RESUME') {
        // Clear previous timeout if any
        if (msgBox.hideTimeout) clearTimeout(msgBox.hideTimeout);

        msgBox.hideTimeout = setTimeout(() => {
            msgBox.classList.add('hidden');
        }, 5000); // Hide after 5 seconds
    } else {
        // For PAUSE, keep displayed
        if (msgBox.hideTimeout) clearTimeout(msgBox.hideTimeout);
    }
}

function startTimer() {
    console.log("🔥 タイムスタンプベースのタイマーを開始します");

    if (!gameData.timer) {
        gameData.timer = { isRunning: false, lastActionTime: null, elapsedBeforePause: 0 };
    }

    requestNotificationPermission();

    if (timerInterval) return;

    // Start/Resume Logic
    gameData.timer.isRunning = true;
    gameData.timer.lastActionTime = Date.now(); // Start counting from NOW

    // Store warning flag to prevent spamming notifications in one session
    gameData.timer.hasWarned45 = false;

    saveGameData();

    // Show Cheer Message only on RESUME (not fresh start)
    if (gameData.timer.elapsedBeforePause > 0) {
        showTimerMessage('RESUME');
    }

    timerInterval = setInterval(() => {
        const now = Date.now();

        // Calculate validation delta
        // Delta = duration since last "Resume" or "Start"
        const sessionDelta = now - gameData.timer.lastActionTime;

        // Total Time = Previously Banked + Current Delta
        const totalMs = gameData.timer.elapsedBeforePause + sessionDelta;
        elapsedSeconds = Math.floor(totalMs / 1000);

        renderTimer(elapsedSeconds);

        // --- 45 Minutes Auto-Stop Logic ---
        const minutesInSession = sessionDelta / 1000 / 60;

        // 1. Warning at 45 minutes
        if (minutesInSession >= 45 && !gameData.timer.hasWarned45) {
            gameData.timer.hasWarned45 = true; // Set flag

            // Push Notification
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("StudyQuest", { body: "45分が経過しました。まだ続けますか？" });
            }

            // On-screen Confirm Modal (YES/NO)
            // YES -> Continue (Bank this 45m and reset delta count so user can do another 45m block)
            // NO -> Stop (Pause)
            showConfirmModal(
                "TIME CHECK",
                "45分が経過しました。<br>まだ続けますか？<br><br><small>※あと1分で自動停止します</small>",
                () => { // YES
                    extendSession();
                },
                () => { // NO
                    // Finish study session ("お疲れ様でした")
                    // stopTimer() handles saving the session, showing results, and resetting stats.
                    stopTimer();
                }
            );
        }

        // 2. Auto Stop at 46 minutes (1 min grace) if no response
        if (minutesInSession >= 46) {
            console.log("🛑 45分超過のため自動停止しました");
            // Force close modal if open
            closeConfirmModal();
            autoStopTimerAtLimit();
        }

    }, 1000);

    // Initial render
    renderTimer(elapsedSeconds);

    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.classList.add('timer-pulsing');

    updateStudyScreenUI();
}

// "Extend" the session (User clicked YES)
function extendSession() {
    // Bank the current time
    const now = Date.now();
    const sessionDelta = now - gameData.timer.lastActionTime;
    gameData.timer.elapsedBeforePause += sessionDelta;

    // Reset "Start" point to NOW (Start a new 45m block)
    gameData.timer.lastActionTime = now;
    gameData.timer.hasWarned45 = false; // Reset warning flag

    saveGameData();
    console.log("✅ Session Extended. New 45m block started.");
}

// Special Pause function that Caps credit at 45 minutes
function autoStopTimerAtLimit() {
    if (!timerInterval) return;
    clearInterval(timerInterval);
    timerInterval = null;

    // Credit ONLY 45 minutes (plus previous bank)
    // We discard the extra minute or hours
    const cappedDelta = 45 * 60 * 1000;

    // Update Bank
    gameData.timer.elapsedBeforePause += cappedDelta;
    gameData.timer.isRunning = false;
    gameData.timer.lastActionTime = null; // Reset

    // Sync global 'elapsedSeconds' for display
    elapsedSeconds = Math.floor(gameData.timer.elapsedBeforePause / 1000);
    renderTimer(elapsedSeconds);

    saveGameData();

    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.classList.remove('timer-pulsing');

    updateStudyScreenUI();

    // Hide Timer Message immediately on auto-stop
    const msgBox = document.getElementById('timer-cheer-message');
    if (msgBox) msgBox.classList.add('hidden');

    showMessageModal("AUTO STOP", "一定時間反応がなかったため、<br>45分でタイマーを停止しました。");
}

function updateTimer() {
    // Legacy support if needed, but setInterval handles updates now.
    renderTimer(elapsedSeconds);
}

function pauseTimer() {
    if (!timerInterval) return;

    clearInterval(timerInterval);
    timerInterval = null;

    // Standard Pause: Bank the exact calculated time
    const now = Date.now();
    const sessionDelta = now - gameData.timer.lastActionTime;
    gameData.timer.elapsedBeforePause += sessionDelta;

    gameData.timer.isRunning = false;
    saveGameData();

    // Show Pause Message
    showTimerMessage('PAUSE');

    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.classList.remove('timer-pulsing');

    updateStudyScreenUI();
}

function handlePauseResume() {
    if (!gameData.currentSubject) {
        showSubjectWarningModal();
        return;
    }

    if (timerInterval || gameData.timer.isRunning) {
        // Run pause
        pauseTimer();
    } else {
        startTimer();
    }
    updateStudyScreenUI();
}

function updateStudyScreenUI() {
    const startBtn = document.getElementById('start-button');
    const stopBtn = document.getElementById('stop-button');
    const pauseBtn = document.getElementById('pause-button');

    // A. 【実行中】（タイマーが動いている）
    if (timerInterval) {
        if (startBtn) startBtn.classList.add('hidden');
        if (stopBtn) stopBtn.classList.remove('hidden');
        if (pauseBtn) {
            pauseBtn.classList.remove('hidden');
            pauseBtn.textContent = 'PAUSE';
            pauseBtn.classList.remove('is-paused'); // オレンジ
            pauseBtn.style.pointerEvents = 'auto'; // クリック可能に
        }
    }
    // B. 【一時停止中】（タイマー停止中 且つ 経過時間がある）
    else if (elapsedBeforePause > 0) {
        if (startBtn) startBtn.classList.add('hidden');
        if (stopBtn) stopBtn.classList.remove('hidden');
        if (pauseBtn) {
            pauseBtn.classList.remove('hidden');
            pauseBtn.textContent = 'RESUME';
            pauseBtn.classList.add('is-paused'); // キャンプの緑
            pauseBtn.style.pointerEvents = 'auto'; // クリック可能に
        }
    }
    // C. 【未開始・リセット後】
    else {
        if (startBtn) startBtn.classList.remove('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');
        if (pauseBtn) pauseBtn.classList.add('hidden');
    }
}


function renderTimer(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const displayMinutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedLCD =
        String(hours).padStart(2, "0") + ':' +
        String(displayMinutes).padStart(2, "0") + ':' +
        String(seconds).padStart(2, "0");

    const timerDisplay = document.getElementById("timer-display");
    if (timerDisplay) {
        timerDisplay.textContent = formattedLCD;
    }
}

// ... (省略された中間の定数や関数は維持されます) ...


// レベルテーブル（レベルアップに必要な累積EXP）
const LEVEL_TABLE = {};
(function () {
    let cumulativeExp = 0;
    for (let i = 1; i <= 99; i++) {
        LEVEL_TABLE[i] = cumulativeExp;
        // Lv(n) -> Lv(n+1) に必要な経験値: 100 + 50 * (n-1)
        cumulativeExp += (100 + 50 * (i - 1));
    }
})();

// ========================================
// アイテム・マスターデータ (5x10マス対応)
// ========================================

const ITEM_CONFIG = {
    folder: "./assets/item/gacha_items/",
    maxCapacity: 50
};

/**
 * アイテム・マスターデータ
 * spriteIndex: 0〜49 (5x10のグリッド位置)
 */
/**
 * アイテムマスターデータ
 * 
 * 【アイテム追加用テンプレート】
 * { id: ID番号, name: "名前", rarity: レア度, file: "画像名.png", type: "種別", effects: { ステータス: 上昇値 }, description: "説明文", discardType: "捨て方" },
 */
const ITEM_MASTER = [
    // ★1 (Rarity 1)
    // visuals: { x: 横位置(%), y: 縦位置(%), scale: 拡大率, width: 幅(任意, 指定なければ100%でscale適用) }
    { id: 0, name: "木の剣", rarity: 1, file: "小さな剣.png", type: "weapon", effects: { focus: 2 }, description: "冒険の始まりといえばこれ。", equipMessage: "木の剣を構えた！少し攻撃的な気分になった！", visuals: { x: 45, y: 55, scale: 0.2 }, equipImage: "./assets/player_sword_fixed.png" },
    { id: 1, name: "布の服", rarity: 1, file: "布の服.png", type: "armor", effects: { strength: 2 }, description: "軽くて動きやすい。", equipMessage: "布の服を身に纏った。防御力がわずかに上がった。", visuals: { x: 0, y: 0, scale: 1.0 } },
    { id: 2, name: "革の靴", rarity: 1, file: "革の靴.png", type: "accessory", effects: { focus: 1 }, description: "長時間の勉強（冒険）でも疲れない。", equipMessage: "革の靴を履いた！足取りが軽くなった気がする。", visuals: { x: 50, y: 92, scale: 0.4 }, equipImage: "./assets/item/gacha_items/革の靴_equipped.png" },
    { id: 3, name: "小さな盾", rarity: 1, file: "小さな盾.png", type: "shield", effects: { strength: 1 }, description: "誘惑を跳ね返すための盾。", equipMessage: "小さな盾を構えた！少しだけ守りが固くなった。", visuals: { x: 55, y: 55, scale: 0.25 }, equipImage: "./assets/item/gacha_items/小さな盾_equipped.png" },
    { id: 4, name: "ポーション", rarity: 1, file: "ポーション.png", type: "consumable", useMessage: "ポーションを飲んだ！疲れが少し取れた気がする。", description: "疲れが少し取れる魔法の薬。" },
    { id: 5, name: "パン", rarity: 1, file: "薬草袋.png", type: "consumable", useMessage: "パンを食べた！お腹が満たされ、やる気が湧いた！", description: "腹が減っては勉強ができぬ。" },
    { id: 12, name: "集中キャンディ", rarity: 1, file: "集中キャンディ.png", type: "consumable", useMessage: "レモン味のキャンディで、集中力が研ぎ澄まされた！", description: "レモン味でリフレッシュ！" },
    { id: 13, name: "ひとくちチョコ", rarity: 1, file: "一口チョコ.png", type: "consumable", useMessage: "チョコの甘みが脳に染み渡る...！知力が一時的に高まった気がする！", description: "疲れた脳には糖分が一番。" },
    { id: 14, name: "サクサクビスケット", rarity: 1, file: "サクサクビスケット.png", type: "consumable", useMessage: "サクサクの食感に心が和む。精神力(STRENGTH)が回復した！", description: "お茶が欲しくなる素朴な味。" },
    { id: 15, name: "三色団子", rarity: 1, file: "３色団子.png", type: "consumable", useMessage: "団子を食べて気分転換。穏やかな気持ちになった。", description: "彩りが可愛い、和みのスイーツ。" },
    { id: 16, name: "消しゴムのカス", rarity: 1, file: "消しゴムのカス.png", type: "trash", description: "頑張った証だけど、捨ててもいいかも。" },
    { id: 17, name: "使い古したノート", rarity: 1, file: "使い古したノート.png", type: "consumable", useMessage: "過去の努力に勇気をもらった！やる気が大幅に上がった！", description: "読み返すとやる気が湧いてくる。" },

    // ★2 (Rarity 2)
    { id: 6, name: "鋼の剣", rarity: 2, file: "鋼の剣.png", type: "weapon", effects: { focus: 10 }, description: "鋭い切れ味で課題を切り裂く。", equipMessage: "鋼の剣を装備した。重厚な刃が心強い！" },
    { id: 7, name: "鎖の鎧", rarity: 2, file: "鎖の鎧.png", type: "armor", effects: { strength: 10 }, description: "集中力を守るための頑丈な鎧。", equipMessage: "鎖の鎧を装着した。守備がガッチリ固まった。" },
    { id: 8, name: "魔法の杖", rarity: 2, file: "魔法の杖.png", type: "weapon", effects: { intellect: 10 }, description: "閃きを呼び起こす不思議な杖。", equipMessage: "魔法の杖を握った。知恵が溢れ出してくる...！", visuals: { x: 50, y: 38, scale: 0.3 }, equipImage: "./assets/item/gacha_items/魔法の杖_equipped.png" },
    { id: 9, name: "魔法の本", rarity: 2, file: "魔法の本.png", type: "accessory", effects: { intellect: 5 }, description: "難しい知識が詰まっている。", equipMessage: "魔法の本を開いた！未知の知識が頭に流れ込む。" },
    { id: 18, name: "癒やしのマカロン", rarity: 2, file: "癒しのマカロン.png", type: "consumable", useMessage: "高級な甘さにうっとり...。心も体も満たされた！", description: "食べるのがもったいない可愛さ。" },
    { id: 19, name: "星屑のコンペイトウ", rarity: 2, file: "星屑のコンペイトウ.png", type: "consumable", useMessage: "カリッと噛むと、頭がシャキッとする！", description: "噛むとキラキラした音がする。" },
    { id: 20, name: "情熱のドーナツ", rarity: 2, file: "情熱のドーナツ.png", type: "consumable", useMessage: "燃え上がるような情熱が腹の底から湧いてくる！", description: "燃えるようなやる気が湧く（気がする）。" },
    { id: 21, name: "銀のヘアピン", rarity: 2, file: "銀のヘアピン.png", type: "accessory", effects: { intellect: 3, strength: 3 }, description: "前髪を留めるのにちょうどいい。", equipMessage: "銀のヘアピンで髪を留めた。清潔感がアップした！", visuals: { x: 55, y: 20, scale: 0.25 }, equipImage: "./assets/item/gacha_items/銀のヘアピン_equipped.png" },
    { id: 22, name: "赤いリボン", rarity: 2, file: "赤いリボン.png", type: "accessory", effects: { strength: 8 }, description: "装備すると気分が華やぐ。", equipMessage: "赤いリボンを結んだ。パワーがみなぎってくる！", visuals: { x: 50, y: 10, scale: 0.35 }, equipImage: "./assets/item/gacha_items/赤いリボン_equipped.png" },
    { id: 23, name: "賢者の羽ペン", rarity: 2, file: "賢者の羽ペン.png", type: "accessory", effects: { intellect: 15 }, description: "スラスラと答えが書ける不思議なペン。", equipMessage: "賢者の羽ペンを構えた。思考の速度が加速する！" },
    { id: 24, name: "静寂の耳栓", rarity: 2, file: "静寂の耳栓.png", type: "accessory", effects: { focus: 15 }, description: "周りの音が聞こえなくなる魔法の耳栓。", equipMessage: "静寂の耳栓を装着。深い没入状態に入った...。" },
    { id: 25, name: "幸運のコイン", rarity: 2, file: "幸運のコイン.png", type: "consumable", useMessage: "コインを弾くと、不思議な幸運に包まれた気がする！", description: "ガチャ運が上がるという噂がある。" },

    // ★3 (Rarity 3)
    { id: 10, name: "伝説の剣", rarity: 3, file: "伝説の剣.png", type: "weapon", effects: { focus: 50 }, description: "選ばれし勉強家だけが持てる黄金の剣。", equipMessage: "伝説の剣を掲げた！まばゆい光が辺りを照らす！" },
    { id: 11, name: "ドラゴンの盾", rarity: 3, file: "ドラゴンの盾.png", type: "shield", effects: { strength: 50 }, description: "あらゆる雑念を無効化する。", equipMessage: "ドラゴンの盾を装備した！最強の守備を手に入れた！" },
    { id: 26, name: "王家のショートケーキ", rarity: 3, file: "王家のショートケーキ.png", type: "consumable", useMessage: "究極の美味！今この瞬間、全能力が極限まで解放された！", description: "今日一番頑張った自分へのご褒美！" },
    { id: 27, name: "聖なる宝冠", rarity: 3, file: "聖なる宝冠.png", type: "accessory", effects: { intellect: 30, strength: 30 }, description: "高貴な輝きを放つティアラ。", equipMessage: "聖なる宝冠を頂いた。崇高な知恵を授かった。", visuals: { x: 50, y: 5, scale: 0.4 }, equipImage: "./assets/item/gacha_items/聖なる宝冠_equipped.png" },
    { id: 28, name: "精霊のドレス", rarity: 3, file: "精霊のドレス.png", type: "infinite", effects: { intellect: 100 }, description: "まるで光を纏っているような服。", useMessage: "精霊のドレスを使った。全身が神秘的な光に包まれ、知力が大幅に上がった！" },
    { id: 29, name: "全知の眼鏡", rarity: 3, file: "全知の眼鏡.png", type: "accessory", effects: { intellect: 200 }, description: "世界のすべてが見通せる伝説の眼鏡。", equipMessage: "全知の眼鏡をかけた。世界の真理がすべて視える...。" }
];

/**
 * 個別画像へのパスを取得するヘルパー
 */
function getItemSpriteStyle(item) {
    // ITEM_MASTER またはインベントリのアイテムオブジェクト
    const fileName = item.file || `${item.name}.png`;
    const fullPath = `${ITEM_CONFIG.folder}${fileName}`;

    // CSS側で背景サイズを細かく調整できるように、URLのみを返す形にシンプル化
    return {
        backgroundImage: `url('${fullPath}')`
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
        // Initialize basic display value
        elapsedBeforePause = gameData.timer.elapsedBeforePause || 0;

        if (gameData.timer.isRunning && gameData.timer.lastActionTime) {
            // Calculate time elapsed while closed/background
            const now = Date.now();
            const sessionDelta = now - gameData.timer.lastActionTime;

            // Check limits immediately
            const totalMs = elapsedBeforePause + sessionDelta;
            const minutesInSession = sessionDelta / 1000 / 60;

            if (minutesInSession >= 46) {
                // Background exceeded limit
                console.log("🛑 アプリ復帰: 45分超過のため停止");

                // Manually trigger the cap logic
                // We fake the timerInterval being present so autoStopTimerAtLimit works, 
                // or we just run the logic manually.
                // Simpler: Just run logic manually.

                const cappedDelta = 45 * 60 * 1000;
                gameData.timer.elapsedBeforePause += cappedDelta;
                gameData.timer.isRunning = false;
                gameData.timer.lastActionTime = null;

                elapsedSeconds = Math.floor(gameData.timer.elapsedBeforePause / 1000);
                renderTimer(elapsedSeconds);
                saveGameData();

                setTimeout(() => {
                    showMessageModal("AUTO STOP", "一定時間反応がなかったため、<br>45分でタイマーを停止しました。");
                }, 500); // Small delay to allow UI init

            } else {
                // Resume normally with correct time
                elapsedSeconds = Math.floor(totalMs / 1000);
                renderTimer(elapsedSeconds);
                startTimer(); // This will pick up 'lastActionTime' and continue counting
            }
        } else {
            // Just paused
            elapsedSeconds = Math.floor(elapsedBeforePause / 1000);
            renderTimer(elapsedSeconds);
        }
    }
    // 勉強ログの更新
    updateLogScreen();

    // Dragon UIの更新
    updateDragonUI();

    // Timer Controlsの初期化を念押し
    initTimerControls()

    console.log("Game initialized!");
}

/* ========================================
   オープニングムービー制御
   ======================================== */
function playOpeningMovie() {
    const movie = document.getElementById('opening-movie');
    if (movie) {
        movie.classList.remove('hidden');
    }
}

function skipOpening() {
    console.log("🚀 オープニングムービー終了 - ホーム画面へ");
    const openingElement = document.getElementById('opening-movie');

    // 1. まずは「ふわっ」とムービーを暗くして消し始める
    openingElement.style.opacity = '0';
    openingElement.style.transition = 'opacity 2.0s ease-out'; // 2秒かけて消す

    // 2. そのまま「3秒」待ってから、トップ画面を表示させる
    setTimeout(() => {
        openingElement.classList.add('hidden'); // オープニングを完全に消す
        showScreen('home-screen'); // ここでトップ画面（ホーム）を呼び出す
    }, 1500); // 3000ミリ秒 ＝ 3秒
    console.log("✅ ホーム画面表示完了");
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
        if (!gameData.player) {
            gameData.player = {
                level: 1,
                exp: 0,
                coins: 0,
                stats: { hp: 100, maxHp: 100, focus: 10, intellect: 10, strength: 10 },
                equipment: { weapon: null, armor: null, accessory: null, shield: null }
            };
        }
        if (!gameData.player.stats) {
            gameData.player.stats = { hp: 100, maxHp: 100, focus: 10, intellect: 10, strength: 10 };
        } else {
            // Migration for focus, intellect, strength (formerly spirit)
            if (gameData.player.stats.focus === undefined) gameData.player.stats.focus = 10;
            if (gameData.player.stats.intellect === undefined) gameData.player.stats.intellect = 10;
            if (gameData.player.stats.strength === undefined) {
                gameData.player.stats.strength = gameData.player.stats.spirit || 10;
                delete gameData.player.stats.spirit;
            }
        }
        if (!gameData.player.equipment) gameData.player.equipment = { weapon: null, armor: null, accessory: null, shield: null };
        if (!gameData.inventory) gameData.inventory = [];
        if (!gameData.studyLogs) gameData.studyLogs = [];

        // オープニング・ドラゴンの初期化
        if (gameData.hasSeenOpening === undefined) gameData.hasSeenOpening = false;
        if (!gameData.dragon) {
            gameData.dragon = { obtained: false, hatched: false, type: null };
        }

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
        // インラインスタイルをリセット
        screen.style.display = '';
        screen.style.opacity = '';
    });

    // 指定された画面を表示
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        target.classList.remove('hidden'); // hiddenクラスがあれば除去
    }

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
    } else if (screenId === 'status-screen') {
        updateStatusScreen();
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
    if (!player) return;

    // レベル表示
    const levelEl = document.getElementById('player-level');
    if (levelEl) levelEl.textContent = player.level;

    // EXP表示
    const currentLevelExp = LEVEL_TABLE[player.level] || 0;
    const nextLevelExp = LEVEL_TABLE[player.level + 1] || (currentLevelExp + 100);
    const expInLevel = player.exp - currentLevelExp;
    const expNeeded = nextLevelExp - currentLevelExp;

    const curExpEl = document.getElementById('current-exp');
    const maxExpEl = document.getElementById('max-exp');
    if (curExpEl) curExpEl.textContent = Math.floor(expInLevel);
    if (maxExpEl) maxExpEl.textContent = expNeeded;

    // EXPバーの幅
    const expBar = document.getElementById('exp-bar');
    if (expBar) {
        const expPercentage = Math.min(100, (expInLevel / expNeeded) * 100);
        expBar.style.width = expPercentage + '%';
    }

    // コイン表示
    const coinEl = document.getElementById('coin-count');
    if (coinEl) coinEl.textContent = player.coins;

    // ドラゴン表示の更新
    updateDragonUI();

    // 装備の見た目更新 (着せ替え)
    updateCharacterAppearance();
}

/**
 * 装備品をキャラクターに重ねて表示する (着せ替え機能)
 */
function updateCharacterAppearance() {
    const layerContainer = document.getElementById('equipment-layers');
    if (!layerContainer) return;

    // reset layers
    layerContainer.innerHTML = '';

    const equipment = gameData.player.equipment;
    if (!equipment) return;

    // Define Render Order (Z-Index equivalent)
    // Armor (Body) -> Shield (Back/Hand) -> Weapon (Hand) -> Accessory (Head/Misc)
    const renderOrder = [
        { slot: 'armor', zIndex: 3 },
        { slot: 'shield', zIndex: 4 },
        { slot: 'weapon', zIndex: 5 },
        { slot: 'accessory', zIndex: 6 }
    ];

    renderOrder.forEach(order => {
        const equippedItem = equipment[order.slot];
        if (equippedItem) {
            const masterItem = ITEM_MASTER.find(mi => mi.id === Number(equippedItem.id));
            // Only render valid equipment types.
            // Items changed to 'infinite' or 'consumable' should not appear even if stuck in equipment data.
            const validTypes = ['weapon', 'armor', 'shield', 'accessory'];

            if (masterItem && validTypes.includes(masterItem.type)) {
                // Determine image source: prefer 'equipImage' if exists, else 'file' (icon)
                // If using 'file' (icon), user might need to adjust scale/position heavily.
                // For this demo, we assume the user might provide a separate 'equipImage' or we use the icon.
                const imgSource = masterItem.equipImage || `${ITEM_CONFIG.folder}${masterItem.file || masterItem.name + '.png'}`;

                const img = document.createElement('img');
                img.src = imgSource;
                img.className = 'equipment-layer';

                // Set Z-Index
                img.style.zIndex = order.zIndex;

                // Apply Coordinate / Scale Specs from Item Data
                // Default: (0,0) with 100% scale (assumes full-body overlay or pre-positioned sprite)
                const visuals = masterItem.visuals || { x: 0, y: 0, scale: 1.0 };

                // Using percentages for responsiveness if possible, or pixels if fixed size
                // We will use 'top' and 'left' percentage relative to the character-wrapper (140x140)
                if (visuals.x !== undefined) img.style.left = `${visuals.x}%`;
                if (visuals.y !== undefined) img.style.top = `${visuals.y}%`;
                if (visuals.scale !== undefined) img.style.transform = `scale(${visuals.scale})`;

                // If specific dimensions are needed
                if (visuals.width) img.style.width = visuals.width;

                layerContainer.appendChild(img);
            }
        }
    });
}

/* ========================================
   ドラゴン・卵の表示制御（修正版）
   ======================================== */
function updateDragonUI() {
    const companion = document.getElementById('dragon-companion');
    const dragonImg = document.getElementById('dragon-img');
    const playerSprite = document.querySelector('.player-sprite');
    const messageEl = document.getElementById("characterMessage");
    const wrapper = document.querySelector('.character-wrapper');

    if (!companion || !dragonImg) return;

    const level = gameData.player.level;
    const dragon = gameData.dragon;

    if (!dragon) return; // 安全策

    // --- 1. 状態フラグの同期 ---
    if (level < 70) {
        dragon.hatched = false;
    } else if (level === 99) {
        dragon.obtained = true;
    }

    // --- 2. クラス管理（ここが重要！） ---
    // CSSの「.dragon-active」が効くように、ここでクラスを付け替えます。
    // JS側での style.width や style.bottom の直接指定はすべて削除しました。
    if (wrapper) {
        if (level >= 99 && dragon.hatched) {
            wrapper.classList.add('dragon-active');
        } else {
            wrapper.classList.remove('dragon-active');
        }
    }

    // --- 3. ビジュアル基本設定 ---
    if (playerSprite) {
        if (level >= 99 && dragon.hatched) {
            playerSprite.classList.add('hidden');
        } else {
            playerSprite.classList.remove('hidden');
        }
    }

    // --- 4. 各レベル帯の表示ロジック（高い順に判定） ---
    if (level >= 99) {
        if (!dragon.hatched) {
            executeDragonBirthAnimation();
            return;
        }
        const type = dragon.type || 'gold';
        dragonImg.src = `./assets/opening_movie/${type}_dragon.png`;
    }
    else if (level >= 90) {
        dragonImg.src = './assets/opening_movie/egg2.png';
        if (messageEl) messageEl.textContent = "なんか最近、卵が割れそう・・・・？";
    }
    else if (level >= 80) {
        dragonImg.src = './assets/opening_movie/egg2.png';
        if (messageEl) messageEl.textContent = "あれ？ 卵に変化が……";
    }
    else if (level >= 70) {
        if (dragon.obtained) {
            dragonImg.src = './assets/opening_movie/egg1.png';
            companion.classList.remove('hidden');
        } else {
            companion.classList.add('hidden');
        }
    }
    else {
        companion.classList.add('hidden');
        updateCharacterMessage(true);
    }
}


/**
 * Lv 70 到達時のドラゴンの卵入手ガチャ演出
 */
function triggerDragonEggGacha() {
    console.log("🐲 ドラゴンの卵入手イベント開始！");
    showScreen('gacha-screen');

    const chestContainer = document.querySelector('.chest-centered');
    const chestImage = document.getElementById('chest-display');
    const flashOverlay = document.getElementById('flash-overlay');
    const tooltip = document.getElementById('pull-tooltip');

    if (tooltip) tooltip.classList.add('hidden');
    if (chestContainer) chestContainer.style.pointerEvents = 'none';

    setTimeout(() => {
        if (chestContainer) chestContainer.classList.add('chest-shaking');

        setTimeout(() => {
            if (chestContainer) chestContainer.classList.remove('chest-shaking');
            if (chestImage) chestImage.src = 'assets/chest_open.png';
            if (flashOverlay) {
                flashOverlay.style.background = 'radial-gradient(circle, #fff 0%, #ffd700 100%)';
                flashOverlay.classList.add('flash-active');
            }

            const eggItem = {
                name: "ドラゴンの卵",
                rarity: 5,
                id: 'dragon_egg_special',
                isSpecial: true
            };

            setTimeout(() => {
                gameData.dragon.obtained = true;
                saveGameData();
                showGachaResult(eggItem);
                if (flashOverlay) flashOverlay.classList.remove('flash-active');
                if (chestContainer) chestContainer.style.pointerEvents = 'auto';
            }, 600);
        }, 1500);
    }, 500);
}

/**
 * Lv 99 到達時の誕生アニメーション
 */
function executeDragonBirthAnimation() {
    const companion = document.getElementById('dragon-companion');
    const dragonImg = document.getElementById('dragon-img');
    const playerSprite = document.querySelector('.player-sprite');
    const flashBg = document.getElementById('birth-flash-bg');

    if (!companion || !dragonImg) return;

    gameData.dragon.hatched = true;
    determineDragonType();

    // 1. 激しく揺れる
    companion.classList.add('birth-shake');

    // 2. 誕生テキストエフェクト
    const effect = document.createElement('div');
    effect.className = 'dragon-birth-text';
    effect.textContent = 'ドラゴン誕生！';
    document.body.appendChild(effect);

    // 3. 背後光エフェクト発動
    if (flashBg) flashBg.classList.add('active');

    // 4. 一定時間後に交代
    setTimeout(() => {
        companion.classList.remove('birth-shake');

        if (playerSprite) playerSprite.classList.add('hidden');
        const wrapper = document.querySelector('.character-wrapper');
        if (wrapper) wrapper.classList.add('dragon-active');

        const type = gameData.dragon.type || 'gold';
        dragonImg.src = `./assets/opening_movie/${type}_dragon.png`;

        saveGameData();

        setTimeout(() => {
            if (flashBg) flashBg.classList.remove('active');
            effect.remove();
        }, 3000);
    }, 2000);
}

function determineDragonType() {
    const stats = gameData.player.stats;
    const focus = stats.focus || 0;
    const intellect = stats.intellect || 0;
    const strength = stats.strength || 0;

    // 全てが高い場合はゴールド
    if (focus >= 100 && intellect >= 100 && strength >= 100) {
        gameData.dragon.type = 'gold';
    } else if (focus >= intellect && focus >= strength) {
        gameData.dragon.type = 'green';
    } else if (intellect >= focus && intellect >= strength) {
        gameData.dragon.type = 'blue';
    } else {
        gameData.dragon.type = 'red';
    }
    saveGameData();
}

function updateStatusScreen() {
    const player = gameData.player;
    const stats = getCurrentStats();
    const statCap = 50 + (player.level * 10);

    const updateStatusItem = (valId, capId, fillId, val) => {
        const valEl = document.getElementById(valId);
        const capEl = document.getElementById(capId);
        const fillEl = document.getElementById(fillId);

        if (valEl) valEl.textContent = Math.floor(val);
        if (capEl) capEl.textContent = statCap;
        if (fillEl) {
            const percentage = Math.min(100, (val / statCap) * 100);
            fillEl.style.width = percentage + '%';
        }
    };

    updateStatusItem('status-val-focus', 'status-cap-focus', 'status-fill-focus', stats.focus);
    updateStatusItem('status-val-intellect', 'status-cap-intellect', 'status-fill-intellect', stats.intellect);
    updateStatusItem('status-val-strength', 'status-cap-strength', 'status-fill-strength', stats.strength);
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

    // パラメーターの上昇量 (1分 = 0.5ポイント)
    const statIncrease = minutes * 0.5;
    const statCap = 50 + (gameData.player.level * 10);

    // 科目に応じて上昇するステータスを決定
    // 資格/語学 -> intellect, ビジネス -> focus, その他 -> strength
    let statKey = 'strength';
    if (gameData.currentSubject === '資格' || gameData.currentSubject === '語学') {
        statKey = 'intellect';
    } else if (gameData.currentSubject === 'ビジネス') {
        statKey = 'focus';
    }

    // ステータス加算と上限チェック
    if (gameData.player.stats[statKey] !== undefined) {
        gameData.player.stats[statKey] = Math.min(statCap, gameData.player.stats[statKey] + statIncrease);
    }

    // 勉強ログに追加
    const log = {
        date: new Date().toISOString(),
        subject: gameData.currentSubject,
        minutes: minutes,
        exp: earnedExp,
        coins: earnedCoins,
        statGrown: { key: statKey, amount: statIncrease }
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

    // 確認メッセージ (レトロなメッセージモーダルへ変更)
    const statNameMap = { focus: '集中力', intellect: '知力', strength: '筋力(STRENGTH)' };
    const studyResultMessage = `
        <div style="text-align: left; line-height: 1.6;">
            📖 ${minutes}分勉強しました<br>
            <br>
            ✨ <span style="color:#ffd43b">+${earnedExp}</span> EXP<br>
            💰 <span style="color:#ffd43b">+${earnedCoins}</span> コイン<br>
            🆙 <span style="color:#ffd43b">+${statIncrease}</span> ${statNameMap[statKey]} (上限: ${statCap})
        </div>
    `;
    showMessageModal("STUDY COMPLETE", studyResultMessage);
}

function checkLevelUp(oldLevel) {
    let newLevel = oldLevel;

    // 1. 最新の累積EXPに基づいて新レベルを算出 (Lv.99上限)
    for (let l = oldLevel + 1; l <= 99; l++) {
        if (gameData.player.exp >= LEVEL_TABLE[l]) {
            newLevel = l;
        } else {
            break;
        }
    }

    // レベルが上がった場合のみチェック
    if (newLevel > oldLevel) {
        gameData.player.level = newLevel;

        console.log(`🆙 レベル判定: 新レベル=${newLevel}, 以前=${oldLevel}, 卵所持=${gameData.dragon.obtained}`);

        // --- 【アンチへの念押し：本番演出フロー】 ---

        // A. レベル99到達：問答無用で誕生演出（ガチャはスキップ）
        if (newLevel === 99) {
            gameData.dragon.obtained = true;
            updateHomeScreen(); // ここで誕生アニメーションが自動トリガー
        }
        // B. レベル70以上 且つ 卵をまだ持っていない：ガチャ実行！
        else if (newLevel >= 70 && !gameData.dragon.obtained) {
            triggerDragonEggGacha();
        }
        // C. それ以外：通常のレベルアップモーダルを表示
        else {
            showLevelUpModal(oldLevel, newLevel);
        }
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
            file: item.file || (item.name + ".png"),
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

    // Icon Handling (Individual PNG Version)
    const style = getItemSpriteStyle(item);
    iconElement.style.display = 'block';
    iconElement.innerHTML = '';
    iconElement.style.backgroundImage = style.backgroundImage;
    iconElement.style.backgroundPosition = style.backgroundPosition;
    iconElement.style.backgroundSize = style.backgroundSize;
    iconElement.classList.add('image-sprite');

    document.getElementById('result-name').textContent = item.name;
    document.getElementById('result-rarity').textContent = '★'.repeat(item.rarity);

    // 特別なアイテム（卵など）の場合の調整
    if (item.isSpecial) {
        iconElement.style.backgroundImage = "url('./assets/opening_movie/egg1.png')";
        iconElement.style.backgroundSize = "contain";
        iconElement.style.backgroundPosition = "center";
        iconElement.style.backgroundRepeat = "no-repeat";
        const resText = document.querySelector('.result-text-mvp');
        if (resText) resText.textContent = "ドラゴンの卵を手に入れた！";
    } else {
        const resText = document.querySelector('.result-text-mvp');
        if (resText) resText.textContent = "獲得！";
    }

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
    const isDragonEgg = modal.querySelector('#result-name').textContent === "ドラゴンの卵";

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

    // もしドラゴンの卵を入手した直後なら、ホーム画面に戻す
    if (isDragonEgg) {
        showScreen('home-screen');
    }
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

        // Always refer to masterItem for canonical display properties
        const masterItem = ITEM_MASTER.find(mi => mi.id === Number(item.id));
        const displayItem = masterItem || item; // Fallback to inventory record

        const equipment = gameData.player.equipment || {};
        const isEquipped = Object.values(equipment).some(eq => eq && Number(eq.id) === Number(item.id));

        card.className = `item-list-card rarity-${displayItem.rarity} ${isEquipped ? 'equipped' : ''}`;
        card.setAttribute('data-id', item.id);

        // Add click listener to show description
        card.onclick = (e) => {
            if (e.target.tagName === 'BUTTON') return;
            showItemDescription(item.id);
        };

        const style = getItemSpriteStyle(displayItem);
        const iconHtml = `<div class="card-icon-box image-sprite" style="background-image: ${style.backgroundImage} !important; background-position: ${style.backgroundPosition} !important; background-size: ${style.backgroundSize} !important; background-repeat: no-repeat !important; image-rendering: pixelated !important;"></div>`;

        let actionBtn = '';
        if (displayItem.type === 'weapon' || displayItem.type === 'armor' || displayItem.type === 'shield' || displayItem.type === 'accessory') {
            const btnText = isEquipped ? 'UNEQUIP' : 'EQUIP';
            const btnClass = isEquipped ? 'unequip' : 'equip';
            actionBtn = `<button class="item-action-btn ${btnClass}" onclick="toggleEquip(${item.id})">${btnText}</button>`;
        } else if (displayItem.type === 'consumable' || displayItem.type === 'infinite') {
            actionBtn = `<button class="item-action-btn use" onclick="useItem(${item.id})">USE</button>`;
        }

        // Add Discard button
        const discardBtn = `<button class="item-action-btn discard" onclick="confirmDiscard(${item.id})">DISCARD</button>`;

        card.innerHTML = `
            ${iconHtml}
            <div class="card-main">
                <div class="card-title">${displayItem.name} ${isEquipped ? '<span class="eq-tag">(E)</span>' : ''}</div>
                <div class="card-subtitle">${'★'.repeat(displayItem.rarity)}</div>
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
    const item = ITEM_MASTER.find(mi => Number(mi.id) === Number(itemId));
    if (!item) return;

    let slot = 'accessory';
    if (item.type === 'weapon') slot = 'weapon';
    else if (item.type === 'armor') slot = 'armor';
    else if (item.type === 'shield') slot = 'shield';
    else if (item.type === 'accessory') slot = 'accessory';

    if (gameData.player.equipment[slot] && Number(gameData.player.equipment[slot].id) === Number(itemId)) {
        gameData.player.equipment[slot] = null;
        showMessageModal("EQUIPMENT", `${item.name}を外しました。`);
    } else {
        gameData.player.equipment[slot] = { id: item.id, name: item.name };
        const message = item.equipMessage || `${item.name}を装備した！`;
        showMessageModal("EQUIPMENT", message);
    }

    saveGameData();
    updateInventoryScreen();
    updateHomeScreen();
}

function getCurrentStats() {
    const baseStats = gameData.player.stats;
    const currentStats = { ...baseStats };

    const equipment = gameData.player.equipment || {};
    Object.values(equipment).forEach(eq => {
        if (eq) {
            const masterItem = ITEM_MASTER.find(mi => mi.id === eq.id);
            if (masterItem && masterItem.effects) {
                Object.keys(masterItem.effects).forEach(stat => {
                    if (currentStats[stat] !== undefined) {
                        currentStats[stat] += masterItem.effects[stat];
                    }
                });
            }
        }
    });

    return currentStats;
}

function useItem(itemId) {
    const inventoryItem = gameData.inventory.find(i => Number(i.id) === Number(itemId));
    if (!inventoryItem || inventoryItem.count <= 0) return;

    const masterItem = ITEM_MASTER.find(mi => Number(mi.id) === Number(itemId));
    if (masterItem && (masterItem.type === 'consumable' || masterItem.type === 'infinite')) {
        const message = masterItem.useMessage || `${masterItem.name}を使用した！`;
        showMessageModal("ITEM USED", message);

        // Apply effects if any (consumables can have effects too)
        if (masterItem.effects) {
            Object.keys(masterItem.effects).forEach(stat => {
                if (gameData.player.stats[stat] !== undefined) {
                    gameData.player.stats[stat] += masterItem.effects[stat];
                }
            });
        }

        // Only decrease count if NOT infinite
        if (masterItem.type !== 'infinite') {
            inventoryItem.count--;
            if (inventoryItem.count === 0) {
                gameData.inventory = gameData.inventory.filter(i => i.id !== itemId);
            }
        }
    }

    saveGameData();
    updateInventoryScreen();
    updateHomeScreen();
}

function confirmReset() {
    showConfirmModal(
        "DATA RESET",
        "いままでの　ぼうけんの　きろくを\nすべて　けして　しまいますか？\n（この　そうさは　とりけせません！）",
        () => {
            localStorage.removeItem('studyQuestData');
            // 完全な初期状態へリセット（dragonやtimerも含める）
            gameData = {
                player: {
                    level: 1,
                    exp: 0,
                    coins: 0,
                    stats: { hp: 100, maxHp: 100, focus: 10, intellect: 10, strength: 10 },
                    equipment: { weapon: null, armor: null, accessory: null, shield: null }
                },
                studyLogs: [],
                inventory: [],
                currentSubject: null,
                timer: { isRunning: false, startTime: null, elapsedBeforePause: 0 },
                hasSeenOpening: false,
                dragon: { obtained: false, hatched: false, type: null }
            };
            saveGameData();
            showScreen('home-screen');

            // 完了トースト
            const toast = document.createElement('div');
            toast.className = 'discard-toast';
            toast.textContent = "✨ ぼうけんの きろくを しょきか しました";
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        }
    );
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
                <div class="card-icon-box ${subjectClass}"></div>
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
/**
 * 確認モーダル制御
 * @param {string} title 
 * @param {string} content 
 * @param {Function} onConfirm - YES callback
 * @param {Function} [onCancel] - NO callback (optional)
 */
function showConfirmModal(title, content, onConfirm, onCancel = null) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const contentEl = document.getElementById('confirm-modal-content');
    const okBtn = document.getElementById('confirm-modal-ok');
    const cancelBtn = modal.querySelector('.cancel-button'); // Get existing Cancel/NO button

    if (modal && titleEl && contentEl && okBtn && cancelBtn) {
        titleEl.textContent = title;
        contentEl.innerHTML = content;

        // Reset and add new listener for YES
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);

        newOkBtn.onclick = () => {
            if (onConfirm) onConfirm();
            closeConfirmModal();
        };

        // Reset and add new listener for NO
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newCancelBtn.onclick = () => {
            if (onCancel) onCancel();
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

        // Reset manual close (NO button) to default behavior just in case
        const cancelBtn = modal.querySelector('.cancel-button');
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                // default: close
                modal.classList.add('hidden');
                modal.style.display = 'none';
            };
        }
    }
}

function confirmDiscard(itemId) {
    const item = gameData.inventory.find(i => i.id === itemId);
    if (!item) return;

    showConfirmModal(
        "どうぐを すてる",
        `${item.name}を　すててしまうのですか？`,
        () => discardItem(itemId)
    );
}

function discardItem(itemId) {
    const index = gameData.inventory.findIndex(i => i.id === itemId);
    if (index === -1) return;

    const inventoryItem = gameData.inventory[index];
    // Find master item to check strict type
    const masterItem = ITEM_MASTER.find(mi => mi.id === inventoryItem.id) || inventoryItem;

    // 1. 演出の実行
    const cardElement = document.querySelector(`.item-list-card[data-id="${itemId}"]`);
    let duration = 700;

    if (cardElement) {
        duration = createDiscardEffect(cardElement, masterItem);
    }

    // 2. 演出が終わるのを待ってから実際に削除
    setTimeout(() => {
        inventoryItem.count--;

        if (inventoryItem.count <= 0) {
            // 装備中なら外す
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
    }, duration);
}

/**
 * アイテム破棄時のエフェクト生成
 */
function createDiscardEffect(element, masterItem) {
    if (!element) return 600;

    const itemName = masterItem.name;
    const type = masterItem.type;
    // テンプレートで指定された discardType があればそれを優先、なければ type を使用
    const discardType = masterItem.discardType || type;

    let animClass = 'anim-drop';
    let message = `${itemName}を　かなたへ　なげすてた！スッキリした！`;
    let duration = 600;

    // タイプ別分岐
    if (discardType === 'trash') {
        animClass = 'anim-drop';
        message = `${itemName}を　かなたへ　なげすてた！スッキリした！`;
        duration = 600;
    } else if (discardType === 'consumable') {
        animClass = 'anim-blink';
        message = `${itemName}を　しょぶんした。また　ひつようなら　てにいれよう。`;
        duration = 600;
    } else if (['weapon', 'armor', 'shield', 'accessory'].includes(discardType) || discardType === 'equipment') {
        animClass = 'anim-rise';
        message = `${itemName}は　ひかりのなかへ　きえていった…いままで　ありがとう！`;
        duration = 800;

        // 装備品の場合のみパーティクル発生
        createDiscardParticles(element);
    }

    // アニメーションクラス付与
    element.classList.add(animClass);

    // メッセージトースト
    setTimeout(() => {
        const toast = document.createElement('div');
        toast.className = 'discard-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }, 300);

    return duration;
}

function createDiscardParticles(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 12; i++) {
        const p = document.createElement('div');
        p.className = 'discard-particle';
        p.style.left = centerX + 'px';
        p.style.top = centerY + 'px';

        // 放射状にランダムに飛ばす
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 60;
        p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
        p.style.setProperty('--ty', Math.sin(angle) * dist + 'px');

        document.body.appendChild(p);
        setTimeout(() => p.remove(), 600);
    }
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

// ========================================
// 🛠️ デバッグ・演出テスト用 隠しコマンド
// ========================================

/**
 * レベルを強制変更して演出を確認する
 * コンソールで使用: setTestLevel(70)
 */
window.setTestLevel = function (level) {
    if (typeof level !== 'number' || level < 1) {
        console.error("❌ 無効なレベルです。数値を入力してください。");
        return;
    }

    const oldLevel = gameData.player.level;
    console.log(`🛠️ デバッグ: レベルを ${oldLevel} -> ${level} に設定します...`);

    gameData.player.level = level;

    // --- デバッグ移動時の優先順位ガード ---

    // 1. レベル99設定時は誕生演出を最優先
    if (level === 99) {
        gameData.dragon.obtained = true;
        updateHomeScreen();
    }
    // 2. レベル70への設定時は、未入手の場合のみガチャを起動
    else if (level === 70 && !gameData.dragon.obtained) {
        triggerDragonEggGacha();
    }
    // 3. レベル70越え移動で且つ「未入手」ならガチャ
    else if (level >= 70 && oldLevel < 70 && !gameData.dragon.obtained) {
        triggerDragonEggGacha();
    }

    else {
        updateHomeScreen();
    }

    saveGameData();
    console.log(`✅ 更新完了。`);
};

/**
 * ガチャおよびドラゴンの成長状態を初期化する
 * Lv70 の演出を再度確認したい場合に使用
 */
window.resetGacha = function () {
    console.log("🐲 ドラゴンとガチャの状態をリセット中...");
    gameData.dragon.obtained = false;
    gameData.dragon.hatched = false;
    gameData.dragon.type = null;

    updateHomeScreen();
    saveGameData();
    console.log("✅ リセット完了！Lv.70に到達すると再びガチャ演出が始まります。");
};

/**
 * ステータスを強制変更する（ドラゴンの分岐テスト用）
 * コンソールで使用: setTestStats(100, 0, 0)
 */
window.setTestStats = function (focus, intellect, strength) {
    if (!gameData.player.stats) gameData.player.stats = {};
    gameData.player.stats.focus = focus || 0;
    gameData.player.stats.intellect = intellect || 0;
    gameData.player.stats.strength = strength || 0;

    console.log(`🛠️ デバッグ: ステータスを変更しました (集中:${focus}, 知力:${intellect}, 筋力:${strength})`);

    // ドラゴン誕生済みの場合は再計算させるために一旦フラグをリセット
    if (gameData.player.level >= 99) {
        gameData.dragon.hatched = false;
    }

    updateHomeScreen();
    saveGameData();
    console.log("✅ ステータスとUIを更新しました。");
};


/**
 * キャラクターのセリフをランダムに変更、またはリセットする
 */
function updateCharacterMessage(force = false) {
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

    // 現在がレベル上げイベント用のセリフでない場合、または強制リセットの場合のみ更新
    const isSpecial = ["あれ？ 卵に変化が……", "なんか最近、卵が割れそう・・・・？"].includes(messageEl.textContent);

    if (!isSpecial || force) {
        const randomIndex = Math.floor(Math.random() * messages.length);
        messageEl.textContent = messages[randomIndex];
    }
}

// ========================================
// 💾 バックアップ機能（準備用）
// ========================================

/**
 * 現在のセーブデータを「ふっかつのじゅもん（Base64文字列）」へ変換する
 * 将来的に「バックアップ機能」としてUIに組み込むための準備関数
 */
window.getBackupCode = function () {
    try {
        const json = JSON.stringify(gameData);
        // 日本語対応のために encodeURIComponent を噛ませてから Base64 化
        const code = btoa(encodeURIComponent(json));
        console.log("📋 バックアップコードを生成しました（コピーして保管してください）:");
        console.log(code);
        return code;
    } catch (e) {
        console.error("❌ バックアップコードの生成に失敗しました", e);
        return null;
    }
};

/**
 * 「ふっかつのじゅもん（Base64文字列）」からデータを復元する
 * @param {string} code - バックアップコード
 */
window.restoreBackupCode = function (code) {
    try {
        if (!code) {
            console.error("❌ 無効なコードです");
            return false;
        }

        // Base64 デコード -> URLデコード -> JSONパース
        const json = decodeURIComponent(atob(code));
        const data = JSON.parse(json);

        // 簡易的なデータ整合性チェック
        if (!data.player || !data.inventory) {
            throw new Error("Invalid Save Data Structure");
        }

        // 復元実行
        gameData = data;
        saveGameData();

        // 画面リロードして反映
        alert("✨ データの復元に成功しました！");
        location.reload();
        return true;
    } catch (e) {
        console.error("❌ データの復元に失敗しました。コードが正しいか確認してください。", e);
        alert("❌ データの復元に失敗しました。コードが間違っている可能性があります。");
        return false;
    }
};
