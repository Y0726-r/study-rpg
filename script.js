document.addEventListener("DOMContentLoaded", () => {
    console.log("🎬 アプリ起動 - オープニングムービーを最優先で開始します");

    // 0. ゲームデータを先に読み込む（同期的に）
    loadGameData();
    window.isSelectingJob = gameData.isSelectingJob;

    // 1. 全ての画面を一旦隠す（リセット）
    const allScreens = document.querySelectorAll('.screen');
    allScreens.forEach(screen => {
        screen.classList.remove('active');
    });

    // 2. 起動時は必ずオープニングムービーから開始する（みつきさんこだわりの演出）
    const openingMovie = document.getElementById('opening-movie');
    if (openingMovie) {
        openingMovie.classList.add('active'); // activeクラスを付けて見えるようにする
        openingMovie.style.display = 'flex';  // 確実に表示させる
        openingMovie.style.opacity = '1';     // 透明度を1にする
        console.log("🎬 起動演出：龍の舞台を整えました。冒険の始まりです！");

        // 🔴 チュートリアル：職業選択前は全ボタンを無効化
        controlNavigationButtons('disable-all');
    }

    // 3. 裏側でひっそりゲームデータを読み込む
    updateCharacterMessage();
    setTimeout(() => {
        initGame();
        updateTimeBackgroundEffect();
        updateCelestialCycle();

        setInterval(() => {
            updateTimeBackgroundEffect();
            updateCelestialCycle();
        }, 60000);
        console.log("🎮 ゲームデータの準備が完了しました");
    }, 100);
});

// ========================================
// グローバル変数とゲームデータ
// ========================================

const BASE_CHARACTER_SIZE = 64;
// 🔴 修理：フラグはゲームデータと同期させる
window.isSelectingJob = true;
// チュートリアル用のメッセージタイマーを一括管理する
window.onboardingTimers = [];

// ========================================
// 🎭 職業別プリセット定義
// ========================================
const OCCUPATION_PRESETS = {
    'student': { label: '学生', q: '国語の聖典', l: '英語の詠唱', b: '数学の魔導', o: '自由研究' },
    'business': { label: '社会人', q: '資格の試練', l: '語学の修行', b: '実務の鍛錬', o: '自己研鑽' },
    'freeman': { label: '自由人', q: '探求の旅', l: '異界の言葉', b: '錬金術の儀', o: '日々の習慣' }
};

// ========================================
// 🎯 チュートリアル：ナビゲーションボタンの制御
// ========================================

/**
 * ナビゲーションボタンを無効化・有効化する
 * @param {string} mode - 'disable-all' | 'enable-study-only' | 'enable-all'
 */
window.controlNavigationButtons = function (mode) {
    const navButtons = document.querySelectorAll('.nav-button');

    if (mode === 'disable-all') {
        // 全てのボタンを無効化
        navButtons.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('nav-disabled');
        });
        console.log('🔒 全てのナビゲーションボタンを無効化しました');
    }
    else if (mode === 'enable-study-only') {
        // 「まなぶ」ボタン（最初のボタン）だけを有効化
        navButtons.forEach((btn, index) => {
            if (index === 0) {
                // 最初のボタン（まなぶ）を有効化
                btn.disabled = false;
                btn.classList.remove('nav-disabled');
            } else {
                // 他のボタンは無効化
                btn.disabled = true;
                btn.classList.add('nav-disabled');
            }
        });
        console.log('✅ 「まなぶ」ボタンだけを有効化しました');
    }
    else if (mode === 'enable-all') {
        // 全てのボタンを有効化
        navButtons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('nav-disabled');
        });
        console.log('✅ 全てのナビゲーションボタンを有効化しました');
    }
};

window.applyOccupation = function (jobKey) {
    const preset = OCCUPATION_PRESETS[jobKey];
    if (!preset) return;

    // データの保存
    localStorage.setItem('subject_qualification_label', preset.q);
    localStorage.setItem('subject_language_label', preset.l);
    localStorage.setItem('subject_business_label', preset.b);
    localStorage.setItem('subject_other_label', preset.o);

    localStorage.setItem('player_occupation', jobKey);

    // 🔴 1. メモリ上の目録（STUDY_SUBJECTS）を即座に更新
    STUDY_SUBJECTS.find(s => s.id === 'subject-qualification').label = preset.q;
    STUDY_SUBJECTS.find(s => s.id === 'subject-language').label = preset.l;
    STUDY_SUBJECTS.find(s => s.id === 'subject-business').label = preset.b;
    STUDY_SUBJECTS.find(s => s.id === 'subject-other').label = preset.o;

    // 🔴 2. 修行画面のボタンを再描画（リロードなしで反映）
    if (typeof generateSubjectButtons === 'function') {
        generateSubjectButtons();
    }

    // 🔴 重要：職業が確定した瞬間にオンボーディングフラグを更新
    // ※ ここではまだ true にしておく（「まなぶ」を押した時のセリフ判定に使うため）
    window.isSelectingJob = true;
    gameData.isSelectingJob = true;
    gameData.hasSeenOpening = true;

    // 🎯 チュートリアル進行: Stage 1 へ
    if (!gameData.tutorialProgress) {
        gameData.tutorialProgress = { stage: 0, hasCompletedFirstQuest: false, hasReceivedWelcomeReward: false };
    }
    gameData.tutorialProgress.stage = 1;
    saveGameData();

    // 🔴 チュートリアル：「まなぶ」ボタンだけを有効化
    controlNavigationButtons('enable-study-only');

    console.log(`✨ 職業「${preset.label}」の修行目録をセットしました`);

    // 🔴 修正：リロードせず、ボタンを隠して「決定後の演出」へ
    const jobUi = document.getElementById("job-selection-ui");
    const msgEl = document.getElementById("characterMessage");

    if (jobUi) {
        jobUi.classList.add('hidden'); // ボタン窓を即・消去
        jobUi.innerHTML = "";          // 中身も空にする
    }
    if (msgEl) {
        // 1. 最初の感謝
        msgEl.textContent = `「${preset.label}の道だね！ありがとう、これから一緒にがんばろう！」`;

        // 2. 2.5秒後に準備を促す
        const t1 = setTimeout(() => {
            msgEl.textContent = "「まずは修行の準備を整えようか！」";

            // 3. さらに2.5秒後にボタンを光らせて誘導
            const t2 = setTimeout(() => {
                msgEl.textContent = "「一番左の【まなぶ】ボタンを押して、作戦会議を開こう！」";

                const studyBtn = document.querySelector('.nav-button'); // 最初のボタンがSTUDY
                if (studyBtn) {
                    studyBtn.classList.add('tutorial-highlight');
                    console.log("✨ チュートリアル：STUDYボタンをハイライトしました");
                }
            }, 3500);
            window.onboardingTimers.push(t2);
        }, 3500);
        window.onboardingTimers.push(t1);
    }
}; // 🔴 applyOccupation関数の終わり

// 勉強科目の定義（カスタマイズ可能）
const STUDY_SUBJECTS = [
    { id: 'subject-qualification', label: localStorage.getItem('subject_qualification_label') || '資格', targetMinutes: parseInt(localStorage.getItem('subject_qualification_target') || '0'), currentDamage: parseInt(localStorage.getItem('subject_qualification_damage') || '0'), type: 'qualification' },
    { id: 'subject-language', label: localStorage.getItem('subject_language_label') || '語学', targetMinutes: parseInt(localStorage.getItem('subject_language_target') || '0'), currentDamage: parseInt(localStorage.getItem('subject_language_damage') || '0'), type: 'language' },
    { id: 'subject-business', label: localStorage.getItem('subject_business_label') || 'ビジネス', targetMinutes: parseInt(localStorage.getItem('subject_business_target') || '0'), currentDamage: parseInt(localStorage.getItem('subject_business_damage') || '0'), type: 'business' },
    { id: 'subject-other', label: localStorage.getItem('subject_other_label') || 'その他', targetMinutes: parseInt(localStorage.getItem('subject_other_target') || '0'), currentDamage: parseInt(localStorage.getItem('subject_other_damage') || '0'), type: 'other' }
];

const RANK_REWARDS = {
    'F-ERANK': { coins: 100, exp: 300, medal: "初心者の証" },
    'D-CRANK': { coins: 300, exp: 1500, medal: "努力の勲章" },
    'B-ARANK': { coins: 1000, exp: 3000, medal: "継続の証", title: "修行者" },
    'SRANK': { coins: 2000, exp: 8000, medal: "超越の勲章", title: "求道者" },
    'SSRANK': { coins: 5000, exp: 15000, medal: "伝説の勲章", title: "不屈の戦士" },
    'EXRANK': { coins: 10000, exp: 30000, medal: "刻喰い征服者", title: "時の支配者", isSpecial: true }
};

const MONSTER_MASTER = {
    'F-ERANK': [
        { name: "刻蝕のヒトガタ", weakness: "なし", desc: "怠け心を囁く低級存在" },
        { name: "時腐りスライム", weakness: "光属性", desc: "やる気が吸い取られる腐泥" },
        { name: "時空ネズミ", weakness: "火", desc: "書類やタスクをかじる不吉な獣" },
        { name: "時喰い蟲スワーム", weakness: "集中の光", desc: "時計の針のような触角" },
        { name: "怠惰のゴブリン", weakness: "最初の一歩", desc: "だらしない姿勢" },
        { name: "時間泥棒コソドロ", weakness: "タイマーの音", desc: "小さな盗賊" }
    ],
    'D-CRANK': [
        { name: "怠惰のエテイン", weakness: "意志バフ", desc: "「今じゃなくてもいい」と唱える巨人" },
        { name: "時間喰いコボルト", weakness: "一撃の集中", desc: "時間を金貨のように盗む小鬼" },
        { name: "刻裂のカラス", weakness: "無属性攻撃", desc: "気が散る幻を見せる魔鳥" },
        { name: "時歪みの魔導師ワープ", weakness: "スケジュール管理", desc: "クロノ・ディストーション" },
        { name: "刻奪のバンパイア", weakness: "朝日（朝の習慣）", desc: "吸血鬼、黒マント" },
        { name: "時縛りの傀儡マリオネット", weakness: "自由意志（自分で決める力）", desc: "操り人形" }
    ],
    'B-ARANK': [
        { name: "進捗断ちの番犬フェンリル", weakness: "連続作業", desc: "連続性を噛み砕く獣" },
        { name: "時溺れの魔書", weakness: "記録", desc: "積み上げが滞ると閉じる呪本" },
        { name: "迷刻のミノタウロス", weakness: "優先順位づけ", desc: "やることを迷わせる牛頭の魔人" },
        { name: "焦燥のデーモン・ラッシュ", weakness: "計画的な進捗（余裕を持つ）", desc: "赤い悪魔" },
        { name: "時喰いキマイラ", weakness: "一点集中", desc: "3つの頭（ライオン・ヤギ・蛇）" },
        { name: "刻断のエクスキューショナー", weakness: "継続の力（諦めない心）", desc: "時計の仮面をつけた処刑人" }
    ],
    'SRANK': [
        { name: "焦燥の魔女ヘルミナ", weakness: "深呼吸", desc: "未来への不安を煽る女魔導士" },
        { name: "刻界のガーディアン・グラディウス", weakness: "短い集中乱打", desc: "巨大な砂時計を盾に戦う守護者" },
        { name: "時廻竜アークバーン", weakness: "小さな成功体験", desc: "時を逆流させる古代竜" }
    ],
    'SSRANK': [
        { name: "刻喰い皇妃メリアノス", weakness: "目的への回帰", desc: "努力や記録を美酒として嗜む女王" },
        { name: "終刻の騎士レクイエム", weakness: "進捗の炎", desc: "剣は諦めの形をしている亡霊騎士" }
    ],
    'EXRANK': [
        { name: "刻喰い王ゼロ＝クロノス", weakness: "継続", desc: "全てを無に還す時の王", isEX: true }
    ]
};

let gameData = {
    player: {
        level: 1,
        exp: 0,
        coins: 0,
        stats: { hp: 100, maxHp: 100, atk: 10, def: 5, focus: 10, intellect: 10, strength: 10 },
        equipment: { weapon: null, armor: null, accessory: null, legs: null, head: null, foot: null, shield: null, cloak: null },
        titles: [],
        medals: []
    },
    studyLogs: [],
    inventory: [],
    currentSubject: null,
    timer: {
        isRunning: false,
        startTime: null,
        pausedAt: null
    },
    hasSeenOpening: false,
    isSelectingJob: true,
    // NEW: Two-tier Boss System
    // 1. Grand Boss: Quest-level boss (overall target, e.g., 800 hours)
    grandBoss: null, // { rank: string, monster: object, targetMinutes: number, currentDamage: number }
    // 2. Daily Monster: Session-level monster (today's target, e.g., 2 hours)
    activeQuest: null, // { rank: string, monster: object, targetMinutes: number, currentDamage: number }
    dailySession: {
        targetMinutes: 0,
        startTime: null,
        pausedTime: null,
        elapsedAtPause: 0,
        isCompleted: false
    },
    dragon: {
        obtained: false,
        hatched: false,
        type: null // 'red', 'blue', 'green', 'gold'
    },
    dragonMilestones: {
        scaleAwarded: false
    },
    // NEW: Pending effect for item usage
    pendingEffect: null, // { active: boolean, message: string, floatTexts: [{text, color}] }

    // NEW: Tutorial Progress System
    tutorialProgress: {
        stage: 0,  // 0: 未開始, 1: 職業選択済み, 2: 命名式完了, 3: 初回修行中, 4: 完全終了
        hasCompletedFirstQuest: false,
        hasReceivedWelcomeReward: false
    },

    // NEW: Chapter System
    chapters: {} // [chapterName]: { targetMinutes, completedMinutes, progress, boss, bossRank, bossImage, firstTime, ... }
};

// タイマー関連 (Session state, initialized from gameData at load)
let timerInterval = null;

// ========================================
// 🎯 ボス自動選択システム
// ========================================

/**
 * 目標時間に応じて適切なボスを選択する
 * @param {number} targetMinutes - 目標時間（分単位）
 * @returns {Object} ボス情報 { name, rank, image }
 */
function selectBoss(targetMinutes) {
    const targetHours = targetMinutes / 60;

    // selectMonsterForQuest とランク判定を統一 (2026/01/26)
    const bossTable = [
        { maxHours: 10, name: "刻蝕のヒトガタ", rank: "F-ERANK", image: "assets/monster/F-ERANK_刻蝕のヒトガタ.png" },
        { maxHours: 30, name: "怠惰のエテイン", rank: "D-CRANK", image: "assets/monster/D-CRANK_怠惰のエテイン.png" },
        { maxHours: 50, name: "進捗断ちの番犬フェンリル", rank: "B-ARANK", image: "assets/monster/B-ARANK_進捗断ちの番犬フェンリル.png" },
        { maxHours: 80, name: "時廻竜アークバーン", rank: "SRANK", image: "assets/monster/SRANK_時廻竜アークバーン.png" },
        { maxHours: 100, name: "刻喰い皇妃メリアノス", rank: "SSRANK", image: "assets/monster/SSRANK_刻喰い皇妃メリアノス.png" },
        { maxHours: Infinity, name: "刻喰い王ゼロ＝クロノス", rank: "EXRANK", image: "assets/monster/EXRANK_刻喰い王ゼロ＝クロノス.png" }
    ];

    for (let boss of bossTable) {
        if (targetHours <= boss.maxHours) {
            return boss;
        }
    }
    return bossTable[0];
}

/**
 * 聖なる命名式で目標時間を確定・章データを更新する
 */
window.handleTargetTimeConfirm = function (chapterName, targetHours) {
    const targetMinutes = targetHours * 60;
    const boss = selectBoss(targetMinutes);

    if (!gameData.chapters) gameData.chapters = {};

    const existing = gameData.chapters[chapterName] || {};

    // 🔴 修正：既存のダメージ（科目データ）があればそれを優先して引き継ぐ
    const subj = STUDY_SUBJECTS.find(s => s.label === chapterName);
    const initialDamage = existing.completedMinutes || (subj ? subj.currentDamage : 0);

    gameData.chapters[chapterName] = {
        name: chapterName,
        targetMinutes: targetMinutes,
        completedMinutes: initialDamage,
        progress: initialDamage / targetMinutes,
        boss: boss.name,
        bossRank: boss.rank,
        bossImage: boss.image,
        firstTime: existing.firstTime !== false, // デフォルト true
        startDate: existing.startDate || new Date().toISOString(),
        lastStudyDate: existing.lastStudyDate || null
    };

    saveGameData();
    console.log(`📖 章データ更新: ${chapterName} -> Boss: ${boss.name}`);
};
let elapsedSeconds = 0;
let startTime = null;
let elapsedBeforePause = 0;

// タイマーのアラート音
// タイマーのアラート音
const alertSound = new Audio('./assets/sounds/alart.mp3');

// Notification permission request wrapper
function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
}

// Helper: Trigger Pending Effect on Home Screen
function triggerPendingEffect() {
    if (!gameData.pendingEffect || !gameData.pendingEffect.active) return;

    const effectData = gameData.pendingEffect;

    console.log("✨ Triggering Pending Effect...", effectData);

    // 1. Visual Effect (Normal or Ultra Rare)
    if (effectData.rarity && effectData.rarity >= 3) {
        createUltraRareEffect();
    } else {
        createSparkleEffect();
    }

    // 2. Character Speech Bubble (Temporary)
    const msgEl = document.getElementById("characterMessage");
    if (msgEl && effectData.message) {
        msgEl.textContent = effectData.message;

        // 5秒後に元の挨拶に戻すタイマーをセット
        setTimeout(() => {
            updateCharacterMessage(true); // 強制的にランダム挨拶を再セット
        }, 3000);
    }

    // 3. Dragon Jump reaction
    const dragon = document.querySelector('.dragon-companion');
    if (dragon) {
        dragon.classList.remove('jump-active');
        void dragon.offsetWidth; // trigger reflow
        dragon.classList.add('jump-active');
        // Remove class after animation
        setTimeout(() => dragon.classList.remove('jump-active'), 1000);
    }

    // 4. Floating Texts
    if (effectData.floatTexts && Array.isArray(effectData.floatTexts)) {
        effectData.floatTexts.forEach((ft, i) => {
            // Stagger slightly
            setTimeout(() => {
                showFloatingText(ft.text, ft.color);
            }, i * 300);
        });
    }

    console.log("✨ Pending Effect Triggered Successfully DONE.");

    // Reset Flag
    gameData.pendingEffect = null;
    saveGameData();
}

/**
 * 時間連動背景システム：現在時刻に合わせて背景エフェクトを更新する
 */
function updateTimeBackgroundEffect() {
    const hour = new Date().getHours();
    const overlay = document.getElementById('time-effect-layer');
    if (!overlay) return;

    // クラスを一旦全削除
    overlay.classList.remove('time-morning', 'time-day', 'time-evening', 'time-night');

    let timeClass = '';
    if (hour >= 4 && hour < 8) {
        timeClass = 'time-morning';
    } else if (hour >= 8 && hour < 16) {
        timeClass = 'time-day';
    } else if (hour >= 16 && hour < 19) {
        timeClass = 'time-evening';
    } else {
        timeClass = 'time-night';
    }

    overlay.classList.add(timeClass);
    console.log(`🕒 Time-based background updated: ${hour}時 -> ${timeClass}`);
}

/**
 * 天体サイクルシステム：太陽と月の位置を更新する
 */
function updateCelestialCycle() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const totalMinutes = hour * 60 + minute;



    // --- HTML要素の存在保証 (Force Creation) ---
    // 親レイヤーの確認・作成
    let celestialLayer = document.getElementById('celestial-layer');
    if (!celestialLayer) {
        console.warn("⚠️ celestial-layer missing, creating...");
        celestialLayer = document.createElement('div');
        celestialLayer.id = 'celestial-layer';
        celestialLayer.classList.add('celestial-overlay');
        celestialLayer.style.setProperty('background', 'transparent', 'important');
        celestialLayer.style.setProperty('pointer-events', 'none', 'important');
        celestialLayer.style.zIndex = "5";
        document.body.appendChild(celestialLayer);
    }

    // 太陽の確認・作成
    let sunEl = document.getElementById('sun-element');
    if (!sunEl) {
        console.warn("⚠️ sun-element missing, creating...");
        sunEl = document.createElement('img');
        sunEl.id = 'sun-element';
        sunEl.src = './assets/sun.png';
        sunEl.className = 'celestial-body sun sky-element hidden';
        sunEl.style.setProperty('background', 'none', 'important'); // Create時も即適用
        celestialLayer.appendChild(sunEl);
    }

    // 月の確認・作成
    let moonEl = document.getElementById('moon-element');
    if (!moonEl) {
        console.warn("⚠️ moon-element missing, creating...");
        moonEl = document.createElement('img');
        moonEl.id = 'moon-element';
        moonEl.src = './assets/moon.png';
        moonEl.className = 'celestial-body moon sky-element hidden';
        moonEl.style.setProperty('background', 'none', 'important'); // Create時も即適用
        celestialLayer.appendChild(moonEl);
    }
    // -------------------------------------------

    if (!sunEl || !moonEl) return; // Should not happen now

    // ユーザー要望: JS側でも確実に sky-element クラスを付与して透明化を強制的
    sunEl.classList.add('sky-element');
    moonEl.classList.add('sky-element');

    // 背景色の強制排除と表示補正（ユーザー指定: background: none !important）
    sunEl.style.setProperty('background', 'none', 'important');
    sunEl.style.setProperty('background-color', 'transparent', 'important');
    sunEl.style.border = 'none';
    sunEl.style.outline = 'none';
    sunEl.style.objectFit = 'contain';
    sunEl.style.padding = '0';
    sunEl.style.margin = '0';

    moonEl.style.setProperty('background', 'none', 'important');
    moonEl.style.setProperty('background-color', 'transparent', 'important');
    moonEl.style.border = 'none';
    moonEl.style.outline = 'none';
    moonEl.style.objectFit = 'contain';
    moonEl.style.padding = '0';
    moonEl.style.margin = '0';

    // 太陽: 6:00 ～ 18:59 (19時手前まで)
    // 月: 19:00 ～ 5:59



    if (hour >= 6 && hour < 19) {
        // 太陽を表示
        sunEl.classList.remove('hidden');
        moonEl.classList.add('hidden');

        // 6:00を0%、19:00を100%とした進捗
        const start = 6 * 60;
        const end = 19 * 60;
        const progress = Math.max(0, Math.min(1, (totalMinutes - start) / (end - start)));

        // --- ☀️ 12時半（progress 0.5）に中央(50%)へ来る計算 ---
        const x = 20 + 60 * progress;
        const y = 30 - 20 * Math.sin(Math.PI * progress);

        sunEl.style.left = `${x}%`;
        sunEl.style.top = `${y}%`;
        sunEl.style.transform = `translate(-50%, -50%)`;

        // 昼間は月の光をリセットしておく
        moonEl.classList.remove('moon-glow');

    } else {
        // 月を表示
        sunEl.classList.add('hidden');
        moonEl.classList.remove('hidden');

        // 19:00を0%、翌6:00を100%とした進捗
        let progress;
        if (hour >= 19) {
            progress = (totalMinutes - 19 * 60) / 660;
        } else {
            progress = (totalMinutes + (24 * 60) - (19 * 60)) / 660;
        }
        progress = Math.max(0, Math.min(1, progress));

        // --- 🌙 月は右側に表示 ---
        const x = 75 + 15 * progress;
        const y = 25 - 10 * Math.sin(Math.PI * progress);

        moonEl.style.left = `${x}%`;
        moonEl.style.top = `${y}%`;
        moonEl.style.transform = `translate(-50%, -50%)`;

        // --- ✨ 23時の時だけ光らせる特殊命令 ---
        if (hour === 23) {
            moonEl.classList.add('moon-glow');
            moonEl.style.width = '70px';  // 23時だけ大きくする
            moonEl.style.height = '70px';
        } else {
            moonEl.classList.remove('moon-glow'); moonEl.style.width = '60px';   // 通常サイズに戻す
            moonEl.style.height = '60px';
        }
    }
    // 座標セットの「直後」にこれを配置して背景を強制抹殺（最強権限で上書き）
    sunEl.style.setProperty('background', 'none', 'important');
    sunEl.style.setProperty('background-color', 'transparent', 'important');
    sunEl.style.setProperty('box-shadow', 'none', 'important');
    sunEl.style.setProperty('border', 'none', 'important');
    sunEl.style.setProperty('outline', 'none', 'important');

    moonEl.style.setProperty('background', 'none', 'important');
    moonEl.style.setProperty('background-color', 'transparent', 'important');
    moonEl.style.setProperty('box-shadow', 'none', 'important');
    moonEl.style.setProperty('border', 'none', 'important');
    moonEl.style.setProperty('outline', 'none', 'important');

    // --- ☁️ 雲の伏線演出 (Lv30+) ---
    const cloud1 = document.getElementById('cloud-element-1');
    const cloud2 = document.getElementById('cloud-element-2');
    if (cloud1 && cloud2 && gameData.player.level >= 30) {
        // 10%の確率で羽の形の雲にする（定期更新のタイミングで判定）
        if (Math.random() < 0.1) {
            cloud1.src = 'assets/feather_cloud.png';
            cloud1.classList.add('feather-cloud');
            console.log("🐲 Rare Event: Feather Cloud appeared!");
        } else if (minute % 15 === 0) { // 15分ごとに通常に戻るチャンス
            cloud1.src = 'assets/cloud2.png';
            cloud1.classList.remove('feather-cloud');
        }
    }

    console.log(`🌙 Celestial cycle updated: hour=${hour}, minute=${minute}`);
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
    ],
    STOP: [
        "お疲れ様でした！よく頑張ったね！",
        "素晴らしい集中力だった！",
        "今日も一歩前進！お疲れ様！",
        "ナイスファイト！休憩しよう。",
        "よく頑張った！自分を褒めてあげて。",
        "お疲れ様！着実に成長してるよ。",
        "今日もお疲れ様でした！"
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

    // For RESUME and STOP, hide after 5 seconds
    if (type === 'RESUME' || type === 'STOP') {
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

function selectMonsterForQuest() {
    console.log("Selecting monsters for:", gameData.currentSubject);
    const subj = STUDY_SUBJECTS.find(s => s.label === gameData.currentSubject);

    // Safety check: if subject not found, use default target or 60m
    const questTarget = (subj && subj.targetMinutes > 0) ? subj.targetMinutes : 60;
    const sessionTarget = gameData.dailySession.targetMinutes || 60;

    // 1. 大ボス（Grand Boss）の固定ロード (クエスト単位の主)
    let grandRank = 'F-ERANK';
    let grandMonster = null;

    // 章（Chapter）データを確認。すでにボスが決定している場合はそれを絶対に使用する
    const currentSubject = gameData.currentSubject;
    if (gameData.chapters && gameData.chapters[currentSubject]) {
        const ch = gameData.chapters[currentSubject];
        grandRank = ch.bossRank;
        // マスタから名前が一致するモンスターデータを呼び戻す
        const pool = MONSTER_MASTER[grandRank] || [];
        grandMonster = pool.find(m => m.name === ch.boss);

        if (grandMonster) {
            console.log(`🏰 クエストの主「${grandMonster.name}」を配置しました`);
        }
        // まだボスが未定の場合（初回のクエスト開始時など）のみ新規抽選を行う
        if (!grandMonster) {
            // 1. 目標時間に基づいた「正しい」ボス情報を selectBoss から取得
            const bossInfo = selectBoss(questTarget);

            grandRank = bossInfo.rank;
            const grandPool = MONSTER_MASTER[grandRank] || MONSTER_MASTER['F-ERANK'];
            grandMonster = grandPool.find(m => m.name === bossInfo.name) || grandPool[0];

            console.log(`📜 このクエストの主を${grandMonster.name}（${grandRank}）に任命しました`);

            // 3. 章データ（chapters）を更新
            if (gameData.chapters && gameData.chapters[currentSubject]) {
                gameData.chapters[currentSubject].boss = bossInfo.name;
                gameData.chapters[currentSubject].bossRank = bossInfo.rank;
                gameData.chapters[currentSubject].bossImage = bossInfo.image; // selectBossの正しいパスを使う
            }
        }
    }




    // gameData.grandBoss に「今戦っている大ボス」の情報を完全に固定
    gameData.grandBoss = {
        rank: grandRank,
        monster: grandMonster,
        targetMinutes: questTarget,
        currentDamage: (subj && subj.currentDamage) ? subj.currentDamage : 0
    };

    // 演出システム（HPバーなど）の基準値も同期
    gameData.currentChallenge = {
        quest: {
            targetMinutes: questTarget,
            completedMinutes: gameData.grandBoss.currentDamage
        }
    };

    // 2. Select Daily Monster (今日のセッション時間に応じたランク)
    // 【重要：大ボスとデイリーの重複回避・ランク逆転防止ルール】
    const rankOrder = ['F-ERANK', 'D-CRANK', 'B-ARANK', 'SRANK', 'SSRANK', 'EXRANK'];
    const grandRankIndex = rankOrder.indexOf(grandRank);

    // セッション目標時間に基づく暫定ランク（デイリーは修行・雑念の役割なので上限を設ける）
    let dailyRankIndex = 0;
    if (sessionTarget >= 120) dailyRankIndex = 2; // B-ARANK (2時間以上で最大)
    else if (sessionTarget >= 60) dailyRankIndex = 1; // D-CRANK (1時間以上)
    else dailyRankIndex = 0; // F-ERANK (1時間未満)

    // ルール1: 今日のモンスターのランクは大ボスよりも常に低いものにする
    if (dailyRankIndex >= grandRankIndex) {
        dailyRankIndex = Math.max(0, grandRankIndex - 1);
    }

    // ルール2: デイリーにSランク以上は絶対に出さない (最大 B-ARANK = 2)
    if (dailyRankIndex > 2) dailyRankIndex = 2;

    const dailyRank = rankOrder[dailyRankIndex];
    console.log("Daily Monster Rank restricted:", dailyRank, "Session Target:", sessionTarget);

    // ルール3: 大ボスと同じモンスターはデイリーに出現させない
    const basePool = MONSTER_MASTER[dailyRank] || MONSTER_MASTER['F-ERANK'];
    const dailyPool = basePool.filter(m => m.name !== grandMonster.name);

    // 万が一フィルタリングで空になった場合は全プールから（基本ありえないがセーフティとして）
    const finalPool = dailyPool.length > 0 ? dailyPool : basePool;

    saveGameData();

    // --- 🔍 追加：コンソールでの確認用ログ ---
    console.log("-----------------------------------------");
    console.log(`👾 モンスター選択開始: ランク[${dailyRank}]`);
    console.log("出現候補リスト:", finalPool.map(m => m.name).join(", "));
    if (basePool.length !== dailyPool.length) {
        console.log(`※大ボス「${grandMonster.name}」は重複回避のため除外されました`);
    }

    const dailyMonster = finalPool[Math.floor(Math.random() * finalPool.length)];

    console.log("✨ 抽選結果:", dailyMonster.name);

    // --- 🖼️ コンソールに画像を表示する演出 ---
    const imgPath = `assets/monster/${dailyRank}_${dailyMonster.name}.png`;
    console.log(
        `%c `,
        `font-size: 1px; 
         padding: 80px 80px; 
         background-image: url('${imgPath}'); 
         background-size: contain; 
         background-repeat: no-repeat; 
         background-position: center;
         border: 2px solid #555;
         border-radius: 10px;`
    );
    console.log("-----------------------------------------");

    gameData.activeQuest = {
        rank: dailyRank,
        monster: dailyMonster,
        targetMinutes: sessionTarget,
        currentDamage: 0 // Daily monster starts fresh each session
    };

    saveGameData();
    updateGrandBossUI();
    updateMonsterUI();
}

let lastUpdateGrandBossData = null;

function updateGrandBossUI() {
    const layer = document.getElementById('grand-boss-layer');
    if (!layer || !gameData.grandBoss) return;

    const { rank, monster, targetMinutes, currentDamage } = gameData.grandBoss;

    // パフォーマンス向上：前回の更新と同じデータならスキップ (2026/01/26)
    const currentDataKey = `${rank}-${monster.name}-${currentDamage}-${targetMinutes}`;
    if (lastUpdateGrandBossData === currentDataKey) return;
    lastUpdateGrandBossData = currentDataKey;

    layer.classList.remove('hidden');

    // 大ボス名のラベルを更新
    const label = document.querySelector('.grand-boss-label');
    if (label) {
        label.textContent = `${monster.name} 討伐までの道のり・・・`;
    }

    const sprite = document.getElementById('grand-boss-sprite');
    if (sprite) {
        const expectedSrc = `assets/monster/${rank}_${monster.name}.png`;
        if (sprite.getAttribute('src') !== expectedSrc) {
            sprite.src = expectedSrc;
        }

        const progress = Math.min(1, currentDamage / targetMinutes);
        const progressPercent = progress * 100;

        sprite.classList.remove('reveal-10', 'reveal-25', 'reveal-50', 'reveal-75', 'reveal-100', 'defeated');

        if (progressPercent >= 100) {
            sprite.classList.add('reveal-100', 'defeated');
        } else if (progressPercent >= 75) {
            sprite.classList.add('reveal-75');
        } else if (progressPercent >= 50) {
            sprite.classList.add('reveal-50');
        } else if (progressPercent >= 25) {
            sprite.classList.add('reveal-25');
        } else if (progressPercent >= 10) {
            sprite.classList.add('reveal-10');
        }
    }

    const fill = document.getElementById('grand-boss-hp-fill');
    if (fill) {
        const progress = Math.min(1, currentDamage / targetMinutes);
        fill.style.width = `${(1 - progress) * 100}%`;
    }

    const hpText = document.getElementById('grand-boss-hp-text');
    if (hpText) {
        const remainingMin = Math.max(0, targetMinutes - currentDamage);
        hpText.textContent = `${Math.ceil(remainingMin)} / ${targetMinutes} min`;
    }
}

function updateMonsterUI() {

    const stage = document.getElementById('monster-stage');
    if (!stage || !gameData.activeQuest) return;

    stage.classList.remove('hidden');
    const { rank, monster, targetMinutes, currentDamage } = gameData.activeQuest;

    // Display basic info
    document.getElementById('monster-rank-badge').textContent = rank;
    document.getElementById('monster-name').textContent = monster.name;
    document.getElementById('monster-weakness-text').textContent = monster.weakness;

    // Set image path
    const sprite = document.getElementById('monster-sprite');
    if (sprite) {
        sprite.src = `assets/monster/${rank}_${monster.name}.png`;
        sprite.classList.remove('monster-defeat', 'monster-retreat');
        console.log(`👾 Monster Loaded: ${rank}_${monster.name}`);
    }

    // Handle EX rank special UI
    const hpContainer = document.getElementById('monster-hp-container');
    const hourglassContainer = document.getElementById('ex-hourglass-container');

    if (monster.isEX) {
        if (hpContainer) hpContainer.classList.add('hidden');
        if (hourglassContainer) {
            hourglassContainer.classList.remove('hidden');
            hourglassContainer.style.display = 'flex';
        }
        stage.classList.add('rank-ex');
        updateHourglassUI();
    } else {
        if (hpContainer) hpContainer.classList.remove('hidden');
        if (hourglassContainer) {
            hourglassContainer.classList.add('hidden');
            hourglassContainer.style.display = 'none'; // 明示的に隠す
        }
        stage.classList.remove('rank-ex');
        updateHPBarUI();
    }
}

function updateHPBarUI() {
    if (!gameData.dailySession || !gameData.dailySession.startTime) return; // セッション開始前は動かさない

    const { targetMinutes } = gameData.dailySession; // 今日の目標分
    const now = Date.now();

    // 今の修行が始まってから、純粋に何秒経ったかだけを計算する
    const elapsedMs = now - gameData.dailySession.startTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const elapsedMinutes = elapsedSeconds / 60;

    // 進捗率を「今日の目標」だけで出す (0.0 ～ 1.0)
    const progress = Math.min(1, elapsedMinutes / targetMinutes);
    const hpPercent = (1 - progress) * 100;

    // ゲージの見た目を更新
    const fill = document.getElementById('monster-hp-fill');
    if (fill) fill.style.width = `${hpPercent}%`;

    // テキストの更新
    const hpText = document.getElementById('monster-hp-text');
    if (hpText) {
        const remainingMin = Math.max(0, targetMinutes - Math.floor(elapsedMinutes));
        hpText.textContent = `${remainingMin} / ${targetMinutes} min`;
    }
}
function updateHourglassUI() {
    if (!gameData.activeQuest) return;
    const { targetMinutes, currentDamage } = gameData.activeQuest;

    // sessionEarnedSeconds の計算を安全にする
    const now = Date.now();
    const elapsedMs = gameData.dailySession.startTime ? (now - gameData.dailySession.startTime) : gameData.dailySession.elapsedAtPause;
    const sessionEarnedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));

    const totalCurrentMinutes = (currentDamage || 0) + (sessionEarnedSeconds / 60);
    const progress = Math.min(1, totalCurrentMinutes / (targetMinutes || 1));

    console.log(`Hourglass Progress: ${progress.toFixed(4)} (TotalMin: ${totalCurrentMinutes})`);

    // 砂時計の画像を更新
    updateHourglassHP(totalCurrentMinutes, targetMinutes);

    // タイマーが動いている時だけ「砂の流れ」クラスを付与
    const container = document.querySelector('.ex-hourglass-container');
    if (container) {
        if (gameData.timer.isRunning && progress < 1) {
            container.classList.add('timer-active');
        } else {
            container.classList.remove('timer-active');
        }
    }
}

// 砂時計HP更新関数 (User Request)
function updateHourglassHP(consumedMinutes, totalMinutes) {
    const sandUpper = document.getElementById('sandUpper');
    const sandLower = document.getElementById('sandLower');

    if (!sandUpper || !sandLower) return;

    // 残りHP％と消費HP％を計算
    const remainingPercent = ((totalMinutes - consumedMinutes) / totalMinutes) * 100;
    const consumedPercent = (consumedMinutes / totalMinutes) * 100;

    // 上の砂：上から切り取る（残りだけ表示）
    // clip-path: inset(top right bottom left)
    // 100 - remainingPercent = 
    //   remaining=100 -> inset(0% ...) -> full
    //   remaining=0 -> inset(100% ...) -> empty
    sandUpper.style.clipPath = `inset(${100 - remainingPercent}% 0 0 0)`;

    // 下の砂：下から積み上げる（消費分だけ表示）
    //   consumed=0 -> inset(100% ...) -> empty
    //   consumed=100 -> inset(0% ...) -> full
    sandLower.style.clipPath = `inset(${100 - consumedPercent}% 0 0 0)`;
}


function startTimer() {
    closeMessageModal(); // 再開時にメッセージを消す
    const msgBox = document.getElementById('timer-cheer-message');
    if (msgBox) msgBox.classList.add('hidden'); // 励ましメッセージも消す
    console.log("🔥 カウントダウンタイマーを開始します");

    if (!gameData.timer) {
        gameData.timer = { isRunning: false, startTime: null, pausedAt: null };
    }
    if (!gameData.dailySession) {
        console.error("❌ dailySessionが未設定です");
        return;
    }

    requestNotificationPermission();
    if (timerInterval) return;

    const now = Date.now();

    // 初回開始 or 再開の判定
    if (!gameData.dailySession.startTime) {
        // 初回開始
        gameData.dailySession.startTime = now;
        gameData.dailySession.elapsedAtPause = 0;
        console.log("⏱️ タイマー初回開始");
    } else if (gameData.dailySession.pausedTime) {
        // 一時停止からの再開
        const elapsedSeconds = Math.floor(gameData.dailySession.elapsedAtPause / 1000);
        console.log(`▶️ タイマー再開（一時停止から復帰）: 保存されていた経過時間 ${elapsedSeconds}秒`);
        gameData.dailySession.startTime = now - gameData.dailySession.elapsedAtPause;
        gameData.dailySession.pausedTime = null;
        console.log(`📍 新しい startTime を設定: ${new Date(gameData.dailySession.startTime).toLocaleTimeString()}`);
    }

    gameData.timer.isRunning = true;
    saveGameData();

    // Show Cheer Message only on RESUME
    const targetSeconds = gameData.dailySession.targetMinutes * 60;
    const elapsed = gameData.dailySession.elapsedAtPause / 1000;
    if (elapsed > 0) {
        showTimerMessage('RESUME');
    }

    // タイトルの更新（再開時やリロード時用）
    const titleElement = document.getElementById('study-screen-title');
    if (titleElement && gameData.dailySession && gameData.dailySession.subjectLabel) {
        titleElement.textContent = `${gameData.dailySession.subjectLabel}の試練`;
    }

    // タイマー更新ループ (requestAnimationFrameでスムーズに)
    const timerLoop = () => {
        if (!gameData.timer.isRunning) return;
        updateTimerFromElapsed();
        requestAnimationFrame(timerLoop);
    };
    requestAnimationFrame(timerLoop);

    updateTimerFromElapsed(); // 即座に表示更新
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.classList.add('timer-pulsing');
    updateStudyScreenUI();

    // 🎯 チュートリアル初回修行の特別処理 (Stage 2 → 3)
    if (gameData.tutorialProgress && gameData.tutorialProgress.stage === 2) {
        gameData.tutorialProgress.stage = 3;
        saveGameData();

        // 🔴 作戦会議ボタンのハイライトを削除
        const settingsWrapper = document.querySelector('.settings-btn-wrapper');
        if (settingsWrapper) {
            settingsWrapper.classList.remove('tutorial-highlight');
            settingsWrapper.removeAttribute('data-tutorial-hint');
        }

        // 🔴 演出開始：ヘッダーを隠して画面をスッキリさせる
        const header = document.querySelector('#study-screen .screen-header');
        if (header) header.style.visibility = 'hidden';

        // 🔴 イベントメッセージの表示
        const magicOverlay = document.getElementById("tutorial-magic-overlay");
        const magicTextEl = document.getElementById("magic-message-text");
        const introText = `よし、修行開始だ！……でも今回は特別に、<br>僕が『時の魔法』で時間を進めてあげるね。`;
        const magicSpell = `エイ！！`;

        if (magicOverlay && magicTextEl) {
            magicTextEl.innerHTML = introText; // 最初のセリフ
            magicOverlay.classList.remove('hidden');
        }

        console.log("✨ チュートリアル：時の魔法の準備中...");

        // 🔴 修正：2.2秒後に「エイ！！」と叫んで、高速カウントダウンを開始
        setTimeout(() => {
            if (magicTextEl) {
                magicTextEl.innerHTML = `僕が『時の魔法』で時間を進めてあげるね。<br><span style="font-size: 26px; color: #ffd700; text-shadow: 0 0 10px #fff;">${magicSpell}</span>`;
            }
            console.log("⏰ 魔法発動！カウントダウン開始");
            requestAnimationFrame(fastForwardAnimation);
        }, 2200);

        // 🔴 演出：タイマーとHPバーを高速で減らす (3.5秒の魔法)
        let totalSeconds = 25 * 60; // 25分 = 1500秒
        const animDuration = 3500;  // 3.5秒
        const animStartTime = Date.now() + 2200; // 2.2秒後に開始予定

        const fastForwardAnimation = () => {
            const now = Date.now();
            const elapsed = now - animStartTime; // 1000ms（開始前）などはマイナスになるが、progress計算でガードされる
            const progress = Math.max(0, Math.min(1, elapsed / animDuration));

            // タイマー表示を更新
            const remaining = Math.floor(totalSeconds * (1 - progress));
            renderTimer(remaining);

            // HPバー表示を連動させるため、一時的にセッション情報をハック
            if (gameData.dailySession) {
                // 現在時刻から「経過すべき ms」を逆算して startTime をハックする
                const fakeElapsedMs = totalSeconds * 1000 * progress;
                gameData.dailySession.startTime = Date.now() - fakeElapsedMs;
                updateHPBarUI();
                updateGrandBossUI();
            }

            if (progress < 1) {
                requestAnimationFrame(fastForwardAnimation);
            } else {
                console.log("⏰ 時の魔法が発動完了！");
                renderTimer(0);

                // 演出終了：メッセージを隠し、ヘッダーを戻す
                if (magicOverlay) magicOverlay.classList.add('hidden');
                if (header) header.style.visibility = 'visible';

                setTimeout(() => stopTimer(true), 500); // 最後に少し余韻を置いて完遂
            }
        };

        requestAnimationFrame(fastForwardAnimation);

        // 🔴 重要：チュートリアル中はタイマーループを開始せず、ここで早期リターン
        return;
    }
}

// スリープ対応：Date.now()ベースで経過時間を計算
function updateTimerFromElapsed() {
    if (!gameData.dailySession || !gameData.dailySession.startTime) return;

    const now = Date.now();
    const elapsedMs = now - gameData.dailySession.startTime;
    const targetMs = gameData.dailySession.targetMinutes * 60 * 1000;
    const remainingMs = Math.max(0, targetMs - elapsedMs);
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    if (remainingMs <= 0) {
        // タイマー完了
        gameData.dailySession.isCompleted = true;
        renderTimer(0);
        stopTimer(true); // 完遂として停止
        return;
    }

    renderTimer(remainingSeconds);
    updateHPBarUI(); // ダメージ連動
    updateGrandBossUI(); // 大ボスのHP更新

    // 砂時計（EXランクのみ）
    if (gameData.activeQuest && gameData.activeQuest.monster.isEX) {
        updateHourglassUI();
    }
}


// -----------------------------------------------------------------------------
// Legacy Functions Removed (extendSession, autoStopTimerAtLimit, updateTimer)
// -----------------------------------------------------------------------------

function pauseTimer() {
    // 🔴 修正：timerInterval のチェックを外す（requestAnimationFrame対応）
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // 🔴 重要：一時停止時点での「実際の経過時間」を保存
    // バックグラウンド復帰時に時間が飛ばないよう、pausedTime を基準にする
    const now = Date.now();
    if (gameData.dailySession && gameData.dailySession.startTime) {
        // 一時停止時点での経過時間を計算
        const actualElapsed = now - gameData.dailySession.startTime;
        gameData.dailySession.elapsedAtPause = actualElapsed;
        gameData.dailySession.pausedTime = now; // 一時停止した時刻を記録

        console.log(`⏸️ タイマー一時停止: 経過時間 ${Math.floor(actualElapsed / 1000)}秒`);
    }

    gameData.timer.isRunning = false;
    gameData.timer.pausedAt = now;
    saveGameData();

    // Show Pause Message
    showTimerMessage('PAUSE');

    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.classList.remove('timer-pulsing');

    updateStudyScreenUI();
}

function handlePauseResume() {
    const isRunning = timerInterval || (gameData.timer && gameData.timer.isRunning);
    const hasActiveSession = gameData.dailySession && gameData.dailySession.targetMinutes > 0;

    // 🔴 修正：タイマーが動いているか、セッションがあるなら科目チェックを無視して「停止/再開」を許可する
    if (isRunning || hasActiveSession) {
        if (isRunning) {
            pauseTimer();
        } else {
            // もし科目が外れていたらセッションデータから無理やり復元
            if (!gameData.currentSubject && gameData.dailySession.subjectLabel) {
                gameData.currentSubject = gameData.dailySession.subjectLabel;
            }
            startTimer();
        }
        updateStudyScreenUI();
        return;
    }

    // 未開始の時だけ警告を出す
    if (!gameData.currentSubject) {
        showSubjectWarningModal();
        return;
    }
}

function updateStudyScreenUI() {
    const startBtn = document.getElementById('start-adventure-btn');
    const stopBtn = document.getElementById('stop-button');
    const pauseBtn = document.getElementById('pause-button');
    const preBattle = document.getElementById('pre-battle-ui');
    const battle = document.getElementById('battle-ui');

    // 🔴 強制復元：科目が消えていたらセッションから引っ張ってくる
    if (!gameData.currentSubject && gameData.dailySession && gameData.dailySession.subjectLabel) {
        gameData.currentSubject = gameData.dailySession.subjectLabel;
    }

    // ボタンのハイライト
    if (gameData.currentSubject) {
        document.querySelectorAll('.subject-btn-mvp').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subject === gameData.currentSubject);
        });
    }

    const hasActiveSession = gameData.dailySession && gameData.dailySession.targetMinutes > 0;
    const isRunning = timerInterval || (gameData.timer && gameData.timer.isRunning);

    // 🎯 チュートリアル中（Stage 2-3）かどうかをチェック
    const isTutorial = gameData.tutorialProgress &&
        (gameData.tutorialProgress.stage === 2 || gameData.tutorialProgress.stage === 3);

    if (isRunning) {
        if (pauseBtn) {
            pauseBtn.classList.remove('hidden');
            pauseBtn.textContent = 'ひとやすみ';
            pauseBtn.classList.remove('is-paused');

            // 🎯 チュートリアル中は無効化
            if (isTutorial) {
                pauseBtn.disabled = true;
                pauseBtn.style.opacity = '0.4';
                pauseBtn.style.cursor = 'not-allowed';
                pauseBtn.style.pointerEvents = 'none';
            } else {
                pauseBtn.disabled = false;
                pauseBtn.style.opacity = '';
                pauseBtn.style.cursor = '';
                pauseBtn.style.pointerEvents = '';
            }
        }

        // 🎯 「おわる」ボタンもチュートリアル中は無効化
        if (stopBtn) {
            if (isTutorial) {
                stopBtn.disabled = true;
                stopBtn.style.opacity = '0.4';
                stopBtn.style.cursor = 'not-allowed';
                stopBtn.style.pointerEvents = 'none';
            } else {
                stopBtn.disabled = false;
                stopBtn.style.opacity = '';
                stopBtn.style.cursor = '';
                stopBtn.style.pointerEvents = '';
            }
        }

        if (preBattle) preBattle.classList.add('hidden');
        if (battle) battle.classList.remove('hidden');
    } else if (hasActiveSession) {
        if (pauseBtn) {
            pauseBtn.classList.remove('hidden');
            pauseBtn.textContent = 'つづける';
            pauseBtn.classList.add('is-paused');

            // 🎯 チュートリアル中は無効化
            if (isTutorial) {
                pauseBtn.disabled = true;
                pauseBtn.style.opacity = '0.4';
                pauseBtn.style.cursor = 'not-allowed';
                pauseBtn.style.pointerEvents = 'none';
            } else {
                pauseBtn.disabled = false;
                pauseBtn.style.opacity = '';
                pauseBtn.style.cursor = '';
                pauseBtn.style.pointerEvents = '';
            }
        }
        if (preBattle) preBattle.classList.add('hidden');
        if (battle) battle.classList.remove('hidden');
    } else {
        // 未開始状態...
        if (startBtn) startBtn.classList.remove('hidden');
        if (preBattle) preBattle.classList.remove('hidden');
        if (battle) battle.classList.add('hidden');
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
        // 420時間の修行（ボーナス報酬込）でLv.99に達するよう重めに調整
        // Lv.2: 200 EXP / Lv.99: 1,920,800 EXP
        cumulativeExp += (200 + 420 * (i - 1));
    }
})();

// ========================================
// アイテム・マスターデータ (5x10マス対応)
// ========================================

const ITEM_CONFIG = {
    folder: "assets/item/gacha_items/",
    maxCapacity: 100
};

let isStopProcessing = false; // 連打・重複処理防止フラグ

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
    { id: 0, name: "木の剣", rarity: 1, file: "small_sword.png", type: "weapon", effects: { focus: 2 }, description: "冒険の始まりといえばこれ。", equipMessage: "木の剣を構えた！少し攻撃的な気分になった！", visuals: { x: 30, y: 35, width: 15 }, equipImage: "assets/player_sword_fixed.png" },
    { id: 1, name: "布の服", rarity: 1, file: "cloth_armor.png", type: "armor", effects: { strength: 2 }, description: "軽くて動きやすい。", equipMessage: "布の服を身に纏った。防御力がわずかに上がった。", visuals: { x: 5, y: 24, width: 100, origin: "left" }, equipImage: "assets/item/gacha_equipment/cloth_armor_equip.png" },
    { id: 2, name: "革の靴", rarity: 1, file: "leather_boots.png", type: "foot", effects: { focus: 1 }, description: "長時間の勉強（冒険）でも疲れない。", equipMessage: "革の靴を履いた！足取りが軽くなった気がする。", visuals: { x_L: 38, x_R: 58, y: 87.5, width: 16 }, equipImage: "assets/item/gacha_equipment/Boots2M.png", equipImageR: "assets/item/gacha_equipment/Boots2M.png" },
    { id: 3, name: "小さな盾", rarity: 1, file: "small_shield.png", type: "shield", effects: { strength: 1 }, description: "誘惑を跳ね返すための盾。", equipMessage: "小さな盾を構えた！少しだけ守りが固くなった。", visuals: { x: 25, y: 70, width: 30 }, equipImage: "assets/item/gacha_items/small_shield_equipped.png" },
    { id: 4, name: "ポーション", rarity: 1, file: "potion.png", type: "consumable", useMessage: "ポーションを使った！", description: "疲れが少し取れる魔法の薬。" },
    { id: 5, name: "パン", rarity: 1, file: "bread.png", type: "consumable", useMessage: "お腹いっぱい！", description: "腹が減っては勉強ができぬ。" },
    { id: 12, name: "集中キャンディ", rarity: 1, file: "candy.png", type: "consumable", useMessage: "レモンの酸味で、集中力が研ぎ澄まされた！", description: "レモン味でリフレッシュ！" },
    { id: 13, name: "ひとくちチョコ", rarity: 1, file: "chocolate_mini.png", type: "consumable", useMessage: "糖分補給完了！脳が活性化していく…！", description: "疲れた脳には糖分が一番。" },
    { id: 14, name: "サクサクビスケット", rarity: 1, file: "biscuit.png", type: "consumable", useMessage: "お腹いっぱい！", description: "お茶が欲しくなる素朴な味。" },
    { id: 15, name: "三色団子", rarity: 1, file: "dango_3color.png", type: "consumable", useMessage: "お腹いっぱい！", description: "彩りが可愛い、和みのスイーツ。" },
    { id: 16, name: "消しゴムのカス", rarity: 3, file: "eraser_dust.png", type: "consumable", useMessage: "これは君の努力の結晶だ。試験合格へ一歩近づいたよ！", description: "沢山の勉強を積み重ねた証。光り輝いている。", effects: { focus: 50, intellect: 50, strength: 50 } },
    { id: 17, name: "使い古したノート", rarity: 1, file: "worn_notebook.png", type: "consumable", useMessage: "これまでの努力が思い出される…よし、もう一踏ん張り！", description: "読み返すとやる気が湧いてくる。" },
    { id: 31, name: "布のズボン", rarity: 1, file: "cloth_pants.png", type: "legs", effects: { strength: 2 }, description: "素朴で動きやすい旅人用ズボン。まずは“続ける力”を支えてくれる。", equipMessage: "布のズボンを装着した。準備完了。さあ、クエスト（勉強）に出発だ。", visuals: { x: 10, y: 35, width: 97 }, equipImage: "assets/item/gacha_equipment/cloth_pants_equip.png" },
    { id: 40, name: "麦わら帽子", rarity: 1, file: "straw_hat.png", type: "head", effects: { strength: 2 }, description: "日差しから頭を守る。集中力が途切れにくい。", equipMessage: "麦わら帽子を被った。涼しくて快適だ！", iconSize: "240%", visuals: { x: 0, y: -20, scale: 10 } },
    { id: 41, name: "木の杖", rarity: 1, file: "wooden_staff.png", type: "weapon", effects: { intellect: 2 }, description: "初心者魔法使いの相棒。", equipMessage: "木の杖を握った。魔力が少し感じられる。", iconSize: "240%", },
    { id: 42, name: "旅人のマント", rarity: 1, file: "traveler_cloak.png", type: "cloak", effects: { focus: 2 }, description: "長旅に耐える丈夫なマント。", equipMessage: "旅人のマントを羽織った。冒険の準備は万全だ！", iconSize: "240%", visuals: { x: 0, y: 0, scale: 0.5 }, equipImage: "assets/item/gacha_equipment/traveler_cloak_equip.png" },
    { id: 43, name: "おにぎり", rarity: 1, file: "onigiri.png", type: "consumable", useMessage: "お腹いっぱい！", description: "シンプルだけど最高の一品。" },
    { id: 44, name: "野菜スープ", rarity: 1, file: "vegetable_soup.png", type: "consumable", useMessage: "体が温まった！栄養満点だ！", description: "母の味。疲れが癒える。" },


    // ★2 (Rarity 2)
    { id: 6, name: "鋼の剣", rarity: 2, file: "steel_sword.png", type: "weapon", effects: { focus: 10 }, description: "鋭い切れ味で課題を切り裂く。", equipMessage: "鋼の剣を装備した。重厚な刃が心強い！", visuals: { x: 45, y: 10, scale: 1.0 }, equipImage: "assets/item/gacha_equipment/steel_sword_equip.png" },
    { id: 7, name: "鎖の鎧", rarity: 2, file: "chain_mail.png", type: "armor", effects: { strength: 10 }, description: "集中力を守るための頑丈な鎧。", equipMessage: "鎖の鎧を装着した。守備がガッチリ固まった。", visuals: { x: 5, y: 16, scale: 1.0 }, equipImage: "assets/item/gacha_equipment/steel_armor_equip.png" },
    { id: 8, name: "魔法の杖", rarity: 2, file: "magic_staff.png", type: "weapon", effects: { intellect: 10 }, description: "閃きを呼び起こす不思議な杖。", equipMessage: "魔法の杖を握った。知恵が溢れ出してくる...！", visuals: { x: 37, y: 15, scale: 0.3 }, equipImage: "assets/item/gacha_equipment/magic_staff_equip.png" },
    { id: 9, name: "魔法の本", rarity: 2, file: "magic_book.png", type: "consumable", effects: { intellect: 10, focus: 10, strength: 10 }, description: "難しい知識が詰まっている。", useMessage: "魔法の本を読んだ！未知の知識が頭に流れ込む…全能力が上昇した！" },
    { id: 18, name: "癒やしのマカロン", rarity: 2, file: "healing_macaron.png", type: "consumable", useMessage: "お腹いっぱい！", description: "食べるのがもったいない可愛さ。" },
    { id: 19, name: "星屑のコンペイトウ", rarity: 2, file: "stardust_konnpeitou.png", type: "consumable", useMessage: "お腹いっぱい！", description: "噛むとキラキラした音がする。" },
    { id: 20, name: "情熱のドーナツ", rarity: 2, file: "passion_donut.png", type: "consumable", useMessage: "お腹いっぱい！", description: "燃えるようなやる気が湧く（気がする）。" },
    { id: 21, name: "銀のヘアピン", rarity: 2, file: "silver_hairpin.png", type: "accessory", effects: { intellect: 3, strength: 3 }, description: "前髪を留めるのにちょうどいい。", equipMessage: "銀のヘアピンで髪を留めた。清潔感がアップした！", visuals: { x: 0, y: -50, scale: 0.4 }, equipImage: "assets/item/gacha_equipment/silver_hairpin_equip.png" },
    { id: 22, name: "赤いリボン", rarity: 2, file: "red_ribbon.png", type: "accessory", effects: { strength: 8 }, description: "装備すると気分が華やぐ。", equipMessage: "赤いリボンを結んだ。パワーがみなぎってくる！", visuals: { x: -10, y: -30, scale: 0.4 }, equipImage: "assets/item/gacha_equipment/red_ribbon_equip.png" },
    { id: 23, name: "賢者の羽ペン", rarity: 2, file: "pen_of_genius.png", type: "consumable", effects: { intellect: 20 }, description: "スラスラと答えが書ける不思議なペン。", useMessage: "賢者の羽ペンで書いた！思考の速度が加速する…知力が大幅に上昇した！" },
    { id: 24, name: "静寂の耳栓", rarity: 2, file: "silence_earplugs.png", type: "consumable", effects: { focus: 20 }, description: "周りの音が聞こえなくなる魔法の耳栓。", useMessage: "静寂の耳栓を装着。深い没入状態に入った...世界が静まり返る。", specialEffect: "silence" },
    { id: 25, name: "幸運のコイン", rarity: 2, file: "lucky_coin.png", type: "consumable", useMessage: "幸運のコインを使った！", description: "ガチャ運が上がるという噂がある。" },
    { id: 32, name: "革のズボン", rarity: 2, file: "leather_pants.png", type: "legs", effects: { strength: 8 }, description: "擦れに強い革製。足元が安定して、集中が途切れにくくなる。", equipMessage: "革のズボンを装着した。足さばきが良い…安定して集中できる。", visuals: { x: 6, y: 37, width: 97 }, equipImage: "assets/item/gacha_equipment/leather_pants_equip.png" },
    { id: 50, name: "銀の腕輪", rarity: 2, file: "silver_bracelet.png", type: "accessory", effects: { intellect: 5, focus: 5 }, description: "魔力を増幅させる腕輪。", equipMessage: "銀の腕輪を装着した。魔力が高まる！", visuals: { x: -14, y: 26, scale: 0.2 }, equipImage: "assets/item/gacha_equipment/silver_bracelet_equip.png" },
    { id: 51, name: "魔導書の断章", rarity: 2, file: "magic_scroll.png", type: "consumable", effects: { intellect: 15 }, description: "古代魔法の一部が記された巻物。", useMessage: "魔導書の断章を読んだ！未知の魔法が頭に刻まれた！" },

    // ★3 (Rarity 3)
    { id: 10, name: "伝説の剣", rarity: 3, file: "legendary_sword.png", type: "weapon", effects: { focus: 50 }, description: "選ばれし勉強家だけが持てる黄金の剣。", equipMessage: "伝説の剣を掲げた！まばゆい光が辺りを照らす！", visuals: { x: 44, y: 9, scale: 1.0 }, equipImage: "assets/item/gacha_equipment/legendary_sword_equip.png" },
    { id: 11, name: "ドラゴンの盾", rarity: 3, file: "dragon_shield.png", type: "shield", effects: { strength: 50 }, description: "あらゆる雑念を無効化する。", equipMessage: "ドラゴンの盾を装備した！最強の守備を手に入れた！", visuals: { x: -3, y: 30, scale: 1.0 }, equipImage: "assets/item/gacha_equipment/dragon_shield_equip.png" },
    { id: 26, name: "王家のショートケーキ", rarity: 3, file: "royal_shortcake.png", type: "consumable", useMessage: "究極の美味！今この瞬間、全能力が極限まで解放された！", description: "今日一番頑張った自分へのご褒美！" },
    { id: 27, name: "聖なる宝冠", rarity: 3, file: "holy_crown.png", type: "accessory", effects: { intellect: 30, strength: 30 }, description: "高貴な輝きを放つティアラ。", equipMessage: "聖なる宝冠を頂いた。崇高な知恵を授かった。", visuals: { x: 0, y: -50, scale: 0.4 }, equipImage: "assets/item/gacha_equipment/holy_crown_equip.png" },
    { id: 28, name: "精霊のドレス", rarity: 3, file: "spirit_dress.png", type: "consumable", effects: { intellect: 100 }, description: "まるで光を纏っているような服。一度袖を通せば、聖なる知恵が魂に刻まれる。", useMessage: "聖なる光に包まれた…！知力が永続的に上昇した！" },
    { id: 29, name: "全知の眼鏡", rarity: 3, file: "omniscience_glasses.png", type: "accessory", effects: { intellect: 200 }, description: "世界のすべてが見通せる伝説の眼鏡。", equipMessage: "全知の眼鏡をかけた。世界の真理がすべて視える...。", visuals: { x: 7, y: -4, scale: 1.0 }, equipImage: "assets/item/gacha_equipment/omniscience_glasses_equip.png" },
    { id: 30, name: "虹色の鱗", rarity: 3, file: "rainbow.png", type: "consumable", useMessage: "虹色の鱗から微かな鼓動を感じる……。", description: "いつか、大きな力が必要な時に道を示してくれるだろう。虹色に輝くドラゴンの鱗。" },
    { id: 33, name: "竜鱗の脚当て（金縁）", rarity: 3, file: "dragon_scale_greaves.png", type: "legs", effects: { strength: 40, focus: 20 }, description: "竜の鱗を編み上げた脚当て。揺るがない集中と、伝説級の格を与える。", equipMessage: "竜鱗の脚当てを装着した。伝説の装備だ。ここからが本番。", visuals: { x: 8, y: 40, width: 98 }, equipImage: "assets/item/gacha_equipment/dragon_scale_greaves_equip.png" },
    { id: 60, name: "賢者のローブ", rarity: 3, file: "sage_robe.png", type: "armor", effects: { intellect: 40, focus: 20 }, description: "知恵を極めし者が纏う神秘の衣。", equipMessage: "賢者のローブを纏った。叡智が体を巡る！", visuals: { x: -2, y: 0, scale: 1.0 }, equipImage: "assets/item/gacha_equipment/sage_robe_equip.png" },
    { id: 61, name: "竜の牙のペンダント", rarity: 3, file: "dragon_fang_pendant.png", type: "accessory", effects: { strength: 35, focus: 15 }, description: "竜の牙から作られた勇者の証。", equipMessage: "竜の牙のペンダントを首にかけた. 勇気が湧き上がる！", visuals: { x: 0, y: 0, scale: 0.4 }, equipImage: "assets/item/gacha_equipment/dragon_fang_pendant_equip.png" },
    { id: 62, name: "時を超える砂時計", rarity: 3, file: "hourglass_of_time.png", type: "consumable", effects: { focus: 50, intellect: 30 }, description: "一度だけ時の流れを操れる伝説の砂時計。", useMessage: "砂時計を逆さまにした...時が巻き戻る感覚！全能力が覚醒した！" },
    { id: 63, name: "不屈の指輪", rarity: 3, file: "indomitable_ring.png", type: "consumable", effects: { strength: 45 }, description: "どんな困難にも挫けない意志を与える。", useMessage: "不屈の指輪を嵌めた。心が鋼のように強くなった！" },

    // ★4 (Rarity 4)
    { id: 70, name: "神話の大剣", rarity: 4, file: "mythic_greatsword.png", type: "weapon", effects: { focus: 100, strength: 50 }, description: "神々が鍛えたと言われる伝説の大剣。", equipMessage: "神話の大剣を掲げた！天空に雷鳴が轟く！", visuals: { x: 45, y: 8, scale: 1.1 }, equipImage: "assets/item/gacha_items/mythic_greatsword.png" },
    { id: 71, name: "星霊の鎧", rarity: 4, file: "starlight_armor.png", type: "armor", effects: { intellect: 80, strength: 70 }, description: "星の力を宿した神聖なる鎧。", equipMessage: "星霊の鎧を纏った。星々の加護を感じる！", visuals: { x: 5, y: 22, scale: 1.0 }, equipImage: "assets/item/gacha_equipment/starlight_armor.png" },
    { id: 72, name: "天空の翼", rarity: 4, file: "sky_wings.png", type: "accessory", effects: { focus: 120 }, description: "空を飛べる幻の翼。集中力が極限まで高まる。", equipMessage: "天空の翼が背中に現れた！限界を超える力を手に入れた！", visuals: { x: 0, y: 0, scale: 0.3 }, equipImage: "assets/item/gacha_equipment/sky_wings.png" },
    { id: 73, name: "叡智の王冠", rarity: 4, file: "crown_of_wisdom.png", type: "head", effects: { intellect: 150 }, description: "知の頂点に立つ者だけが被れる王冠。", equipMessage: "叡智の王冠を戴いた。全ての知識が手の内に！", visuals: { x: 0, y: -57, scale: 1.0 }, equipImage: "assets/item/gacha_equipment/crown_of_wisdom.png" },
    { id: 74, name: "エリクサー", rarity: 4, file: "elixir.png", type: "consumable", effects: { intellect: 100, focus: 100, strength: 100 }, description: "全ての能力を極限まで引き上げる万能薬。", useMessage: "エリクサーを飲んだ！体が光り輝く...全能力が爆発的に上昇した！" },
    { id: 75, name: "魔導の書・完全版", rarity: 4, file: "complete_grimoire.png", type: "consumable", effects: { intellect: 200 }, description: "全ての魔法が記された究極の書物。", useMessage: "魔導の書を読破した！世界の真理を理解した..." },

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
        backgroundImage: `url('${fullPath}')`,
        backgroundSize: item.iconSize || 'contain' // ★ここを追加！
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
    console.log(`💰 Added ${amount} coins. Current: ${gameData.player.coins}`);
};

/**
 * デバッグ用：指定したIDのアイテムを強制的に取得して演出を確認する
 * コンソールで testItem(40) のように実行
 */
window.testItem = function (id) {
    const item = ITEM_MASTER.find(it => it.id === id);
    if (!item) {
        console.error(`❌ ID:${id} のアイテムが見つかりません`);
        return;
    }
    console.log(`🎁 Testing item: ${item.name} (ID: ${id})`);

    // インベントリに追加
    addItemToInventory(item);
    saveGameData();

    // ガチャ演出を開始
    if (typeof playGachaAnimation === 'function') {
        playGachaAnimation(item);
    } else {
        showGachaResult(item);
    }

    updateGachaScreen();
    updateHomeScreen();
};

/**
 * デバッグ用：装備の配置デバッグ数値をリセットする
 * 例: resetItemVisuals(2) // 革の靴を 64x64 フルサイズ重ねにリセット
 */
window.resetItemVisuals = function (id) {
    const item = ITEM_MASTER.find(mi => mi.id === id);
    if (!item) return console.error("Item not found");
    // 64x64 キャンバスへの「重ねるだけ」設定にリセット
    if (item.type === 'foot') {
        item.visuals = { x: 0, y: 0, width: 64 };
    } else {
        item.visuals = { x: 0, y: 0, width: 64 };
    }
    updateCharacterAppearance();
    console.log(`✅ Item ${id} (${item.name}) visuals reset to 64x64 overlay.`);
};


// ========================================
// 初期化とデータ読み込み
// ========================================

function initGame() {
    loadGameData();
    updateHomeScreen();
    calculateTodayStats();

    // スリープから復帰した時のタイマー状態復元
    if (gameData.timer && gameData.timer.isRunning && gameData.dailySession && gameData.dailySession.startTime) {
        console.log("⏰ スリープから復帰：タイマー状態を復元します");

        const now = Date.now();
        const elapsedMs = now - gameData.dailySession.startTime;
        const targetMs = gameData.dailySession.targetMinutes * 60 * 1000;
        const remainingMs = targetMs - elapsedMs;

        if (remainingMs <= 0) {
            // スリープ中にタイマーが完了していた
            console.log("✅ スリープ中にタイマーが完了していました");
            gameData.dailySession.isCompleted = true;
            renderTimer(0);
            // タイマーを自動停止してリザルトを表示
            setTimeout(() => {
                stopTimer(true);
            }, 500);
        } else {
            // まだ時間が残っている - タイマーを再開
            console.log(`⏱️ 残り時間: ${Math.ceil(remainingMs / 1000)}秒`);

            // モンスター表示を復元
            if (gameData.activeQuest) {
                updateMonsterUI();
            }

            // タイマーを再開
            startTimer();
        }
    } else if (gameData.dailySession && gameData.dailySession.pausedTime) {
        // 一時停止中の状態を復元
        console.log("⏸️ 一時停止状態を復元します");
        const elapsedSeconds = Math.ceil(gameData.dailySession.elapsedAtPause / 1000);
        const targetSeconds = gameData.dailySession.targetMinutes * 60;
        const remainingSeconds = targetSeconds - elapsedSeconds;
        renderTimer(Math.max(0, remainingSeconds));

        // モンスター表示を復元
        if (gameData.activeQuest) {
            updateMonsterUI();
        }
    }
    // 勉強ログの更新
    updateLogScreen();

    // Timer Controlsの初期化を念押し
    initTimerControls();

    // --- Legacy check for Dragon Milestones ---
    if (gameData.player.level >= 45 && (!gameData.dragonMilestones || !gameData.dragonMilestones.scaleAwarded)) {
        if (!gameData.dragonMilestones) gameData.dragonMilestones = { scaleAwarded: false };
        const hasIt = gameData.inventory.some(inv => inv.id === 30);
        if (!hasIt) {
            awardRainbowScale();
        } else {
            gameData.dragonMilestones.scaleAwarded = true;
            saveGameData();
        }
    }

    // 🎯 チュートリアル状態に応じてナビゲーションボタンを制御
    const tutorialStage = gameData.tutorialProgress ? gameData.tutorialProgress.stage : 0;

    if (tutorialStage === 0) {
        // Stage 0: オープニング中 - 全ボタン無効
        controlNavigationButtons('disable-all');
        console.log('🎯 チュートリアル Stage 0: 全ボタン無効化');
    } else if (tutorialStage === 1 || tutorialStage === 2 || tutorialStage === 3) {
        // Stage 1-3: チュートリアル中 - まなぶボタンのみ有効
        controlNavigationButtons('enable-study-only');
        console.log('🎯 チュートリアル Stage 1-3: まなぶボタンのみ有効化');
    } else {
        // Stage 4以降: チュートリアル完了 - 全ボタン有効
        controlNavigationButtons('enable-all');
        console.log('🎯 チュートリアル完了: 全ボタン有効化');
    }

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
    console.log("🚀 オープニング終了 - 完璧な演出を開始します");

    // 1. まずはお喋りガードを即座に有効化
    gameData.hasSeenOpening = true;
    saveGameData();

    const openingElement = document.getElementById('opening-movie');
    if (openingElement) openingElement.style.display = 'none';

    showScreen('home-screen');

    // すでに職業を選んでいる場合はここで終了（ガード）
    const storedJob = localStorage.getItem('player_occupation');
    if (storedJob) {
        window.isSelectingJob = false;
        gameData.isSelectingJob = false;
        saveGameData();
        updateCharacterMessage(true);
        console.log("🛡️ スキップガード：職業設定済みのためチュートリアルを回避しました");
        return;
    }

    window.isSelectingJob = true;
    gameData.isSelectingJob = true;
    saveGameData();

    // 🔴 ここが重要：700ms待たずに「今すぐ」書き換える！
    const msgEl = document.getElementById("characterMessage");
    const jobUi = document.getElementById("job-selection-ui");

    if (msgEl) {
        msgEl.textContent = "「よくきたね！待っていたよ」";
    }

    // 2. そのあとの「職業を教えて」と「ボタン出現」だけ時間差（タイマー）にする
    setTimeout(() => {
        if (msgEl) {
            msgEl.textContent = "「これから共に歩む君の『職業』を教えてほしいんだ」";
        }

        setTimeout(() => {
            if (jobUi) {
                // 表示の準備（位置やスタイルの設定）
                jobUi.classList.remove('hidden');
                jobUi.style.position = "absolute";
                jobUi.style.top = "5%"; // みつきさん指定の「もっと上」の位置
                jobUi.style.left = "50%";
                jobUi.style.transform = "translateX(-50%)";
                jobUi.style.pointerEvents = "none";
                jobUi.style.opacity = "0";

                jobUi.innerHTML = `
                    <div class="job-choice-box" style="background: rgba(44, 24, 16, 0.9); border: 3px double #f3e5ab; padding: 10px; display: flex; gap: 10px; border-radius: 4px; box-shadow: 0 0 15px rgba(0,0,0,0.8); pointer-events: auto;">
                        <button class="settings-btn job-opt" 
                            onmouseover="document.getElementById('characterMessage').textContent='「学校の勉強にはもってこいだよ！」'" 
                            onmouseout="document.getElementById('characterMessage').textContent='「これから共に歩む君の『職業』を教えてほしいんだ」'"
                            onclick="applyOccupation('student')" 
                            style="position:static; transform:none; padding:8px 10px; font-size:14px; min-width:70px; color:#f3e5ab; cursor:pointer; background:none; border:1px solid #f3e5ab;">学生</button>
                        <button class="settings-btn job-opt" 
                            onmouseover="document.getElementById('characterMessage').textContent='「実務や資格の修行に励むんだね！」'" 
                            onmouseout="document.getElementById('characterMessage').textContent='「これから共に歩む君の『職業』を教えてほしいんだ」'"
                            onclick="applyOccupation('business')" 
                            style="position:static; transform:none; padding:8px 10px; font-size:14px; min-width:70px; color:#f3e5ab; cursor:pointer; background:none; border:1px solid #f3e5ab;">社会人</button>
                        <button class="settings-btn job-opt" 
                            onmouseover="document.getElementById('characterMessage').textContent='「自由な探求こそ、真の冒険だよ！」'" 
                            onmouseout="document.getElementById('characterMessage').textContent='「これから共に歩む君の『職業』を教えてほしいんだ」'"
                            onclick="applyOccupation('freeman')" 
                            style="position:static; transform:none; padding:8px 10px; font-size:14px; min-width:70px; color:#f3e5ab; cursor:pointer; background:none; border:1px solid #f3e5ab;">自由人</button>
                    </div>
                `;

                jobUi.style.transition = "opacity 0.8s ease-in";
                setTimeout(() => { jobUi.style.opacity = "1"; }, 10);
            }
        }, 1600); // 職業を聞いてからボタンが出るまでの「間」

    }, 3000); // 「よくきたね！」を読んでから次のセリフにいくまでの「間」
}

function loadGameData() {
    const savedData = localStorage.getItem('studyQuestData');
    if (savedData) {
        gameData = JSON.parse(savedData);
        // Ensure timer object exists (migration for old saves)
        if (!gameData.timer) {
            gameData.timer = { isRunning: false, startTime: null, pausedAt: null };
        }
        if (!gameData.dailySession) {
            gameData.dailySession = {
                targetMinutes: 0,
                startTime: null,
                pausedTime: null,
                elapsedAtPause: 0,
                isCompleted: false
            };
        }
        // Ensure player and equipment exist
        if (!gameData.player) {
            gameData.player = {
                level: 1,
                exp: 0,
                coins: 0,
                stats: { hp: 100, maxHp: 100, focus: 10, intellect: 10, strength: 10 },
                equipment: { head: null, armor: null, weapon: null, accessory: null, shield: null, legs: null, foot: null, cloak: null }
            };
        }
        if (!gameData.dragonMilestones) {
            gameData.dragonMilestones = { scaleAwarded: false };
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
        if (!gameData.player.titles) gameData.player.titles = [];
        if (!gameData.player.medals) gameData.player.medals = [];

        if (!gameData.player.equipment) {
            gameData.player.equipment = { head: null, armor: null, weapon: null, accessory: null, shield: null };
        } else {
            // Force strict object structure for equipment slots
            gameData.player.equipment = {
                head: gameData.player.equipment.head || null,
                weapon: gameData.player.equipment.weapon || null,
                armor: gameData.player.equipment.armor || null,
                shield: gameData.player.equipment.shield || null,
                accessory: gameData.player.equipment.accessory || null,
                foot: gameData.player.equipment.foot || null,
                legs: gameData.player.equipment.legs || null
            };
        }
        if (!gameData.inventory || !Array.isArray(gameData.inventory)) {
            gameData.inventory = [];
        } else {
            // インベントリの各アイテムの型を正常化
            gameData.inventory.forEach(item => {
                if (item) {
                    item.id = Number(item.id);
                    if (item.count === undefined) item.count = 1;
                }
            });
        }
        if (!gameData.studyLogs) gameData.studyLogs = [];

        // Ensure pendingEffect capability exists
        if (gameData.pendingEffect === undefined) {
            gameData.pendingEffect = null;
        }

        // Initialize Eraser Dust Counter
        if (gameData.eraserDustAwardedCount === undefined) {
            gameData.eraserDustAwardedCount = 0;
        }

        // オープニング・ドラゴンの初期化
        if (gameData.hasSeenOpening === undefined) gameData.hasSeenOpening = false;
        if (gameData.isSelectingJob === undefined) gameData.isSelectingJob = true;
        window.isSelectingJob = gameData.isSelectingJob;
        if (!gameData.dragon) {
            gameData.dragon = { obtained: false, hatched: false, type: null };
        }

        // Tutorial Progress System initialization
        if (!gameData.tutorialProgress) {
            gameData.tutorialProgress = {
                stage: 0,
                hasCompletedFirstQuest: false,
                hasReceivedWelcomeReward: false
            };
        }

        // NEW: Monster Quest System initialization
        if (!gameData.activeQuest) gameData.activeQuest = null;
        if (!gameData.dailySession) {
            gameData.dailySession = {
                targetMinutes: 0,
                remainingSeconds: 0,
                isCompleted: false
            };
        }

        if (!gameData.currentChallenge) {
            gameData.currentChallenge = {
                quest: {
                    targetMinutes: (gameData.grandBoss && gameData.grandBoss.targetMinutes) ? gameData.grandBoss.targetMinutes : 60,
                    completedMinutes: (gameData.grandBoss && gameData.grandBoss.currentDamage) ? gameData.grandBoss.currentDamage : 0
                }
            };
        }

        console.log("Game data loaded:", gameData);
    } else {
        console.log("No saved data, using default");
    }

    // [REMOVED] Always start with no subject selected to enforce the "Select Subject first" rule.
    // gameData.currentSubject = null; 
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

    // 全ての画面を非表示(物理的に消す)
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
        screen.style.display = 'none'; // 明示的にnoneを入れる
    });

    // 指定された画面を表示
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        target.classList.remove('hidden');
        target.style.display = 'flex'; // 明示的にflexで出す
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
        // 🔴 ガード強化：既に職業が決まっているならオンボーディングは強制終了
        if (localStorage.getItem('player_occupation')) {
            window.isSelectingJob = false;
            gameData.isSelectingJob = false;
        }

        // データを読み直さず、今の状態のまま表示を更新
        updateHomeScreen();

        // 🎯 チュートリアル最終段階 (Stage 3 → 4)
        if (gameData.tutorialProgress && gameData.tutorialProgress.stage === 3 &&
            gameData.tutorialProgress.hasReceivedWelcomeReward) {

            setTimeout(() => {
                const msgEl = document.getElementById("characterMessage");
                if (msgEl) {
                    msgEl.textContent = `「すごい、修行の成果で レベル2 になったよ！お祝いでガチャ1回分のコインも用意しておいたから、左から二番目の【たからばこ】を覗いてみてね！」`;
                }

                // 🔴 重要：全てのナビゲーションボタンのハイライトを削除
                const navButtons = document.querySelectorAll('.nav-button');
                navButtons.forEach(btn => {
                    btn.classList.remove('tutorial-highlight');
                    btn.removeAttribute('data-tutorial-hint');
                });

                // 🔴 重要：「たからばこ」ボタンだけを光らせる（左から2番目のナビゲーションボタン）
                if (navButtons.length >= 2) {
                    const gachaBtn = navButtons[1]; // 0: まなぶ, 1: たからばこ
                    gachaBtn.classList.add('tutorial-highlight');
                    gachaBtn.setAttribute('data-tutorial-hint', '👆ここだよ！');
                }

                // チュートリアル完全終了
                gameData.tutorialProgress.stage = 4;
                window.isSelectingJob = false;
                gameData.isSelectingJob = false;
                saveGameData();

                // 🔴 重要：全てのナビゲーションボタンを有効化
                controlNavigationButtons('enable-all');
                console.log('🎉 チュートリアル完了: 全ボタンを有効化しました');

                // 通常のランダムセリフモードへ移行
                setTimeout(() => {
                    updateCharacterMessage(true);

                    // ハイライトを解除
                    const navButtons = document.querySelectorAll('.nav-button');
                    navButtons.forEach(btn => {
                        btn.classList.remove('tutorial-highlight');
                        btn.removeAttribute('data-tutorial-hint');
                    });
                }, 8000);
            }, 1000);
        }

        // 確実に画面が出てから、一回だけ呼ぶ
        setTimeout(() => {
            triggerPendingEffect();
        }, 300);
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
    } else if (screenId === 'menu-screen') { // Original was 'menu-screen', instruction implies 'inventory-screen'
        updateInventoryScreen();
    } else if (screenId === 'log-screen') {
        updateLogScreen();
    } else if (screenId === 'study-screen') {
        // タイトルを初期状態に戻す
        const titleElement = document.getElementById('study-screen-title');
        if (titleElement) titleElement.textContent = "刻（とき）の試練";

        generateSubjectButtons();
        calculateTodayStats();
        // ボタンの見た目を現在のタイマー状態に合わせる
        updateStudyScreenUI();

        // Restore active subject button from gameData
        document.querySelectorAll('.subject-btn-mvp').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subject === gameData.currentSubject);
        });

        // 🎯 チュートリアルStage 1: 設定ボタン以外を全て無効化
        const isTutorialStage1 = gameData.tutorialProgress && gameData.tutorialProgress.stage === 1;
        const isTutorialStage2 = gameData.tutorialProgress && gameData.tutorialProgress.stage === 2;

        console.log('🎯 チュートリアルステージ確認:', {
            stage: gameData.tutorialProgress?.stage,
            isTutorialStage1,
            isTutorialStage2
        });

        if (isTutorialStage1) {
            console.log('🎯 チュートリアルStage 1: 全ボタンを無効化');
            // 戻るボタンを無効化
            const backBtn = document.querySelector('#study-screen .pixel-back-btn');
            if (backBtn) {
                backBtn.disabled = true;
                backBtn.classList.add('tutorial-disabled-btn');
            }

            // 冒険に出るボタンを無効化
            const adventureBtn = document.querySelector('.start-adventure-btn');
            if (adventureBtn) {
                adventureBtn.disabled = true;
                adventureBtn.classList.add('tutorial-disabled-btn');
            }

            // 修復ボタンを無効化
            const repairBtn = document.querySelector('.repair-mini-btn');
            if (repairBtn) {
                repairBtn.disabled = true;
                repairBtn.classList.add('tutorial-disabled-btn');
            }

            // 全ての科目ボタンを無効化
            document.querySelectorAll('.subject-btn-mvp').forEach(btn => {
                btn.disabled = true;
                btn.classList.add('tutorial-disabled');
            });
            document.querySelectorAll('.subject-label-mvp').forEach(label => {
                label.classList.add('tutorial-disabled');
            });
        } else if (isTutorialStage2) {
            console.log('🎯 チュートリアルStage 2: 冒険に出るボタンを有効化');
            // Stage 2: 戻るボタンと修復ボタンは無効化、冒険に出るボタンは有効化
            const backBtn = document.querySelector('#study-screen .pixel-back-btn');
            if (backBtn) {
                backBtn.disabled = true;
                backBtn.classList.add('tutorial-disabled-btn');
            }

            const adventureBtn = document.querySelector('.start-adventure-btn');
            if (adventureBtn) {
                console.log('🎯 冒険に出るボタンを有効化:', adventureBtn);
                adventureBtn.disabled = false;
                adventureBtn.classList.remove('tutorial-disabled-btn');
                // 🔴 強制的にスタイルを削除
                adventureBtn.style.opacity = '';
                adventureBtn.style.pointerEvents = '';
                adventureBtn.style.cursor = '';
                adventureBtn.style.filter = '';
                console.log('🎯 冒険に出るボタンのクラス:', adventureBtn.className);
                console.log('🎯 冒険に出るボタンのdisabled:', adventureBtn.disabled);
            }

            const repairBtn = document.querySelector('.repair-mini-btn');
            if (repairBtn) {
                repairBtn.disabled = true;
                repairBtn.classList.add('tutorial-disabled-btn');
            }

            // 科目ボタンはgenerateSubjectButtons()で制御済み（最初の科目のみ有効）
        } else {
            console.log('🎯 チュートリアル完了: 全ボタンを有効化');
            // チュートリアル完了後は無効化を解除
            const backBtn = document.querySelector('#study-screen .pixel-back-btn');
            if (backBtn) {
                backBtn.disabled = false;
                backBtn.classList.remove('tutorial-disabled-btn');
            }

            const adventureBtn = document.querySelector('.start-adventure-btn');
            if (adventureBtn) {
                adventureBtn.disabled = false;
                adventureBtn.classList.remove('tutorial-disabled-btn');
            }

            const repairBtn = document.querySelector('.repair-mini-btn');
            if (repairBtn) {
                repairBtn.disabled = false;
                repairBtn.classList.remove('tutorial-disabled-btn');
            }
        }

        // 🎯 チュートリアル：設定ボタンのハイライト（Stage 1のみ）
        if (isTutorialStage1) {
            const settingsWrapper = document.querySelector('.settings-btn-wrapper');
            if (settingsWrapper) {
                settingsWrapper.classList.add('tutorial-highlight');
                settingsWrapper.setAttribute('data-tutorial-hint', '👆ここだよ！');
            }
        } else {
            // Stage 2以降はハイライトを削除
            const settingsWrapper = document.querySelector('.settings-btn-wrapper');
            if (settingsWrapper) {
                settingsWrapper.classList.remove('tutorial-highlight');
                settingsWrapper.removeAttribute('data-tutorial-hint');
            }
        }
    }
    // 🎯 チュートリアル：ホーム画面用の変数定義
    const isNoOccupation = window.isSelectingJob && STUDY_SUBJECTS.length > 0 && !localStorage.getItem('player_occupation');
    let firstSubjName = (STUDY_SUBJECTS.length > 0) ? STUDY_SUBJECTS[0].label : "科目";

    // 吹き出しの初期化
    const studyBubble = document.getElementById('characterMessageStudy');
    if (studyBubble) {
        // 通常は隠しておく（チュートリアル演出中だけ出す）
        studyBubble.parentElement.style.display = 'none';

        // Stage 2（科目選んで冒険に出る段階）ならヒントとして出す
        if (gameData.tutorialProgress && gameData.tutorialProgress.stage === 2) {
            studyBubble.textContent = `「${firstSubjName}」のボタンを押して選んでから、「冒険に出る」ボタンを押してね！`;
            studyBubble.parentElement.style.display = 'block';
        }
    }

    // ホーム画面のメッセージ（職業未設定の場合のみ）
    if (isNoOccupation) {
        const msgEl = document.getElementById("characterMessage");
        if (msgEl) {
            msgEl.textContent = `「君のために冒険をセットしておいたよ！まずは練習で『${firstSubjName}』をやってみよう！」`;
        }
    }

    // 天体レイヤーの表示制御（ホーム画面のみ表示）
    const celestial = document.getElementById('celestial-layer');
    if (celestial) {
        if (screenId === 'home-screen') {
            celestial.style.display = 'block';
        } else {
            celestial.style.display = 'none';
        }
    }

    // 画面切り替え時に天体サイクルも更新（オープニングスキップ後の表示復帰などに対応）
    updateCelestialCycle();

    // 確実に画面が出てから、一回だけ呼ぶ（gacha用などの演出トリガー）
    if (screenId === 'home-screen') {
        setTimeout(() => {
            triggerPendingEffect();
        }, 300);
    }
}

window.openSubjectSettings = function () {
    // 1. ⚙️ボタンの光を消して、視線を巻物へ集中させる
    const settingsBtn = document.querySelector('.settings-btn-wrapper');
    if (settingsBtn) {
        settingsBtn.classList.remove('tutorial-highlight');
    }

    // 🔴 2. 場面転換！巻物が開いた「あと」の天の声
    if (window.isSelectingJob && STUDY_SUBJECTS.length > 0) {
        const firstSubjectName = STUDY_SUBJECTS[0].label;
        const msgEl = document.getElementById("characterMessage");
        if (msgEl && (!gameData.tutorialProgress || gameData.tutorialProgress.stage !== 1)) {
            // 巻物の内容を指し示すセリフに更新（命名式以外の時のみ）
            msgEl.textContent = `「よし、まずは『${firstSubjectName}』を選んで、修行の目標を刻もう！」`;
        }
    }

    // 3. 巻物（モーダル）の中身を作成
    let html = `
        <div style="text-align:center; width:100%; display:flex; flex-direction:column; align-items:center;">
            <p style="margin-bottom:30px; font-size:12.5px; color:#2c1810; font-weight:bold;">
                次の冒険に向けて、どの作戦会議をする？
            </p>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; width:100%; max-width:200px; margin-bottom:35px;">
    `;

    // 科目ボタンをループで生成
    STUDY_SUBJECTS.forEach((subj, index) => {
        // 🔴 修正：index が 0（1番目）かつチュートリアル中ならハイライト
        const isTutorialTarget = (window.isSelectingJob && index === 0);
        const highlightClass = isTutorialTarget ? "tutorial-highlight" : "";

        html += `
            <button class="settings-btn ${highlightClass}" style="width:85px; height:42px;" 
                onclick="window.startRenamingSubject('${subj.id}', '${subj.label}')">
                ${subj.label}
            </button>
        `;
    });

    html += `
            </div>
            <button class="scroll-cancel-btn" onclick="closeMessageModal()">〜やめる〜</button>
        </div>
    `;

    showMessageModal("-冒険の作戦会議室-", html, true);
}; // ⬅ 正しく関数を閉じる


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
    console.log("👗 Updating character appearance...");
    const layerContainer = document.getElementById('equipment-layers');
    const footLayer = document.getElementById('foot-layer'); // NEW: 靴専用レイヤー

    if (!layerContainer) return;

    // reset layers (Aggressive clear to prevent residuals)
    layerContainer.innerHTML = '';
    if (footLayer) {
        footLayer.innerHTML = ''; // NEW: 靴レイヤーもクリア

        // ユーザー指示: 親コンテナ（#foot-layer）自体が白い箱にならないよう、JSで物理的にスタイルをねじ込む
        footLayer.style.setProperty('background', 'none', 'important');
        footLayer.style.setProperty('border', 'none', 'important');
        footLayer.style.setProperty('box-shadow', 'none', 'important');
    }

    const equipment = gameData.player.equipment;
    if (!equipment) return;

    // --- ✨ Lv60+ ドラゴンの気配エフェクト ---
    if (gameData.player.level >= 60) {
        const aura = document.createElement('div');
        aura.className = 'dragon-aura';
        // パーティクルを数個生成
        for (let i = 0; i < 5; i++) {
            const p = document.createElement('div');
            p.className = 'aura-particle';
            p.style.animationDelay = `${i * 0.4}s`;
            aura.appendChild(p);
        }
        layerContainer.appendChild(aura);
    }

    // Define Render Order (Z-Index equivalent)
    // Armor (Body) -> Cloak (Over Armor) -> Shield (Back/Hand) -> Weapon (Hand) -> Accessory (Misc) -> Head (Top)
    const renderOrder = [
        { slot: 'foot', zIndex: 2 },
        { slot: 'legs', zIndex: 3 },
        { slot: 'armor', zIndex: 4 },
        { slot: 'cloak', zIndex: 5 },  // マントはarmorの上に表示
        { slot: 'shield', zIndex: 6 },
        { slot: 'weapon', zIndex: 7 },
        { slot: 'accessory', zIndex: 8 },
        { slot: 'head', zIndex: 9 }
    ];

    renderOrder.forEach(order => {
        const equippedItem = equipment[order.slot];
        if (equippedItem) {
            const masterItem = ITEM_MASTER.find(mi => mi.id === Number(equippedItem.id));
            const validTypes = ['weapon', 'armor', 'shield', 'accessory', 'head', 'foot', 'legs', 'cloak'];

            if (masterItem && validTypes.includes(masterItem.type)) {
                const visuals = masterItem.visuals || { x: 0, y: 0, width: BASE_CHARACTER_SIZE };

                // Determine default source
                const defaultSrc = masterItem.equipImage || `${ITEM_CONFIG.folder}${masterItem.file || masterItem.name + '.png'}`;

                // 左右分割描画が必要か判定 (x_L と x_R が存在) - 反転ロジックは完全廃止し、画像の指定に従う
                const renderParts = (visuals.x_L !== undefined && visuals.x_R !== undefined)
                    ? [
                        { x: visuals.x_L, src: defaultSrc }, // Left uses standard equipImage
                        { x: visuals.x_R, src: (masterItem.equipImageR || defaultSrc) } // Right uses equipImageR if available
                    ]
                    : [
                        { x: visuals.x, src: defaultSrc }
                    ];

                renderParts.forEach(part => {
                    const img = document.createElement('img');

                    // キャッシュバスター
                    const cacheBuster = `?t=${new Date().getTime()}`;
                    img.src = part.src + cacheBuster;

                    // アニメーション適用（全装備共通で勇者と一緒に跳ねる）
                    img.classList.add('forelockBounce');

                    // クラス設定（.equipment-sprite-onlyで透過設定済み）
                    img.className += ' equipment-sprite-only';

                    // 配置設定
                    const w = visuals.width || 100;
                    const x = (part.x !== undefined) ? part.x : (visuals.x || 0);
                    const y = (visuals.y !== undefined) ? visuals.y : 0;

                    img.style.width = w + '%';
                    img.style.height = 'auto';
                    img.style.left = x + '%';
                    img.style.top = y + '%';
                    img.style.position = 'absolute';
                    img.style.zIndex = order.zIndex;
                    img.style.pointerEvents = 'none';
                    img.style.zIndex = order.zIndex;
                    img.style.pointerEvents = 'none';
                    // ここから追加！
                    img.style.transformOrigin = 'left center';
                    img.style.transform = `scale(${visuals.scale || 1})`;

                    // 読み込み監視
                    img.onload = () => console.log(`✅ Gear [${order.slot}] Loaded: ${img.src}`);
                    img.onerror = () => {
                        console.error(`❌ Gear [${order.slot}] Failed: ${img.src}`);
                        img.style.display = 'none';
                    };

                    // 全装備、共通のコンテナ（#equipment-layers）に直接入れる
                    layerContainer.appendChild(img);
                });
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
        // 自動で obtained = false にする処理も、セーブデータの整合性のために削除するか慎重に扱う。
        // ここでは、Lv70未満で孵化しているのはおかしいので戻すだけに留める。
    }

    // --- 2. クラス管理（ここが重要！） ---
    if (wrapper) {
        if (level >= 99 && dragon.hatched) {
            wrapper.classList.add('dragon-active');
        } else {
            wrapper.classList.remove('dragon-active');
        }
    }

    // --- 3. ビジュアル基本設定 ---
    const layersContainer = document.querySelector('.player-layers-container');

    if (layersContainer) {
        if (level >= 99 && dragon.hatched) {
            layersContainer.classList.add('hidden');
        } else {
            layersContainer.classList.remove('hidden');
        }
    }

    // --- 4. 各レベル帯の表示ロジック ---
    if (level >= 99) {
        // dragon.obtained のチェックを確実にする
        if (!dragon.obtained) {
            // 万が一持っていないままLv99になった場合の救済
            dragon.obtained = true;
        }

        companion.classList.remove('hidden');
        if (!dragon.hatched) {
            executeDragonBirthAnimation();
            return;
        }
        const type = dragon.type || 'gold';
        dragonImg.src = `./assets/opening_movie/${type}_dragon.png`;
    }
    else if (level >= 90) {
        if (dragon.obtained) {
            dragonImg.src = './assets/opening_movie/egg2.png';
            companion.classList.remove('hidden');
            if (messageEl) messageEl.textContent = "なんか最近、卵が割れそう・・・・？";
        } else {
            companion.classList.add('hidden');
        }
    }
    else if (level >= 80) {
        if (dragon.obtained) {
            dragonImg.src = './assets/opening_movie/egg2.png';
            companion.classList.remove('hidden');
            if (messageEl) messageEl.textContent = "あれ？ 卵に変化が……";
        } else {
            companion.classList.add('hidden');
        }
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
        // updateCharacterMessage(true); // 元のコードにあったが、無限ループの危険があるので一旦除去検討
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

        // 勇者のコンテナごと非表示にする（装備や靴が残らないように）
        const layersContainer = document.querySelector('.player-layers-container');
        if (layersContainer) layersContainer.classList.add('hidden');

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

// アプリ復帰時にボタンの見た目を今の状態に合わせる
function syncTimerUIOnResume() {
    console.log("🔄 アプリ復帰：UIを同期します");
    updateStudyScreenUI();
}

// 画面がアクティブになったら実行
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        syncTimerUIOnResume();
    }
});

// --- 科目名カスタムシステム（ナノの特別設定ボックス） ---

// 1. 設定メニューを開く (どの科目を変えるか選ぶ)
window.openSubjectSettings = function () {
    // 🎯 チュートリアル中かどうかを判定
    const isTutorial = gameData.tutorialProgress && gameData.tutorialProgress.stage === 1;

    // 🔍 デバッグ：現在のチュートリアル状態を確認
    console.log("📋 openSubjectSettings 呼び出し");
    console.log("  - tutorialProgress:", gameData.tutorialProgress);
    console.log("  - isTutorial:", isTutorial);
    console.log("  - isSelectingJob:", window.isSelectingJob);

    // チュートリアル用の特別なガイドメッセージ
    const guideMessage = isTutorial
        ? `まずは、一番左の「${STUDY_SUBJECTS[0].label}」のボタンを押して、<br>目標時間を決めよう！`
        : `次の冒険に向けて、どの作戦会議をする？<br>記録を書き換えよう！`;

    let html = `
        <div style="text-align:center; width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;">
            <p style="margin-bottom:30px; font-size:12.5px; color:#2c1810; line-height:1.8; font-family: 'DotGothic16', sans-serif; font-weight:bold;">
                ${guideMessage}
            </p>
            <div style="display:grid; grid-template-columns: 1fr 1fr; row-gap:8px; column-gap:2px; width:100%; max-width:200px; margin-bottom:35px; justify-items:center;">
    `;

    // 現在の科目リストをボタンとして並べる
    STUDY_SUBJECTS.forEach((subj, index) => {
        // チュートリアル中は1番目のボタンをハイライト
        const highlightClass = (isTutorial && index === 0) ? 'tutorial-highlight' : '';
        const highlightAttr = (isTutorial && index === 0) ? 'data-tutorial-hint="👆ここだよ！"' : '';

        html += `
            <button class="settings-btn ${highlightClass}" ${highlightAttr} style="position:static; transform:none; width:85px; height:42px; font-size:16px; color:#fff;" 
                onclick="this.style.filter='brightness(0.7)'; setTimeout(() => window.startRenamingSubject('${subj.id}', '${subj.label}'), 400)">
                ${subj.label}
            </button>
        `;
    });

    html += `
            </div>
            <button class="scroll-cancel-btn" onclick="this.style.transform='scale(0.95)'; setTimeout(() => closeMessageModal(), 200)">〜やめる〜</button>
        </div>
    `;

    showMessageModal("-冒険の作戦会議室-", html, true);
};

// 2. 入力画面を表示する
window.startRenamingSubject = function (id, currentName) {
    const subj = STUDY_SUBJECTS.find(s => s.id === id);
    const currentTargetHours = subj ? (subj.targetMinutes / 60) : 0;

    // 🔴 修正：チュートリアル中で1番目の科目の場合は「10」を、そうでなければ既存の値をセット
    const isTutorial = gameData.tutorialProgress && gameData.tutorialProgress.stage === 1;
    const isFirstSubject = STUDY_SUBJECTS.length > 0 && currentName === STUDY_SUBJECTS[0].label;
    const defaultHours = (isTutorial && isFirstSubject) ? 10 : (currentTargetHours || 0);


    // 🎯 チュートリアル中のみ表示する説明文
    const tutorialHint = isTutorial ? `
        <div style="background: rgba(243, 240, 232, 0.95); border: 2px solid #fad230ff; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 12px; color: #2c1810; line-height: 1.6; font-weight: bold;">
                💡 ひとまずは目標時間を<span style="color: #d4af37; font-size: 14px;">10時間</span>に設定しておいたから、<br>
                「これにする！」を押してね<br>
                <span style="font-size: 11px; color: #666;">(後から変更できるよ)</span>
            </p>
        </div>
    ` : '';

    let html = `
        <div style="text-align:center; padding:10px;">
            <p style="margin-bottom:15px; font-size:13px; color:#2c1810; line-height:1.6; font-weight:bold;">
                「${currentName}」の章だね！
            </p>
            
            <p style="margin-bottom:10px; font-size:12px; color:#2c1810;">
                この予言書に、新しい名前を刻み込んで！<br>
                どんな名前に書き換える？
            </p>
            <input type="text" id="subject-rename-input" value="${currentName}" autocomplete="off"
                style="width:90%; padding:10px; background:rgba(255,255,255,0.1); border:none; border-bottom:3px double #2c1810; color:#2c1810; font-family: 'DotGothic16', sans-serif; font-size:16px; margin-bottom:20px; text-align:center; outline:none; border-radius:0;">

            <p style="margin-bottom:10px; font-size:12px; color:#2c1810; font-weight:bold;">
                この章のボスはどれくらい強そう？
            </p>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:20px;">
                <button class="settings-btn" style="position:static; transform:none; font-size:11px; padding:8px 4px; filter: hue-rotate(90deg);" 
                    onclick="window.setTargetByRank(10)">🌿 はぐれ系 (10h)</button>
                <button class="settings-btn" style="position:static; transform:none; font-size:11px; padding:8px 4px; filter: hue-rotate(180deg);" 
                    onclick="window.setTargetByRank(30)">⚔️ 中ボス級 (30h)</button>
                <button class="settings-btn" style="position:static; transform:none; font-size:11px; padding:8px 4px; filter: hue-rotate(280deg);" 
                    onclick="window.setTargetByRank(100)">🐉 大魔王級 (100h)</button>
                <button class="settings-btn" style="position:static; transform:none; font-size:11px; padding:8px 4px; filter: grayscale(0.8);" 
                    onclick="window.setRandomTargetHours()">🎲 正体不明 (？h)</button>
            </div>

            ${tutorialHint}

            <div style="display:flex; align-items:center; justify-content:center; gap:5px; margin-bottom:30px;">
                <input type="number" id="subject-target-input" value="${defaultHours}" placeholder="${currentTargetHours}" min="0" step="1"
                    style="width:80px; padding:10px; background:rgba(255,255,255,0.1); border:none; border-bottom:3px double #2c1810; color:#2c1810; font-family: 'DotGothic16', sans-serif; font-size:16px; text-align:center; outline:none; border-radius:0;">
                <span style="font-size:14px; color:#2c1810; font-weight:bold;">時間</span>
            </div>

            <div style="display:flex; gap:15px; justify-content:center;">
                <button class="settings-btn" style="position:static; transform:none; padding:8px 16px; font-size:13px;" onclick="window.saveSubjectRename('${id}')">これにする！</button>
                <button class="settings-btn" style="position:static; transform:none; padding:8px 16px; font-size:13px; filter: grayscale(0.5);" onclick="window.openSubjectSettings()">もどる</button>
            </div>
        </div>
    `;

    showMessageModal("-聖なる命名式-", html, true);

    // 🎯 チュートリアル中の特別演出 (Stage 1) - セリフを即座に強制表示
    if (gameData.tutorialProgress && gameData.tutorialProgress.stage === 1) {
        // 🔴 重要：モーダルが完全に表示された後にセリフを設定（50ms遅延で確実に）
        setTimeout(() => {
            const msgEl = document.getElementById("characterMessage");
            if (msgEl) {
                msgEl.textContent = `今回はこの科目をやってみようか、ためしに10時間に目標設定しておいたよ！`;
                console.log("🎯 チュートリアルメッセージを設定しました:", msgEl.textContent);
            }
        }, 50);
    }

    // 入力欄に自動フォーカス
    setTimeout(() => {
        const input = document.getElementById('subject-rename-input');
        if (input) {
            input.focus();
            input.select();
        }

        // 🎯 チュートリアル中の視覚的ハイライト (Stage 1)
        if (gameData.tutorialProgress && gameData.tutorialProgress.stage === 1) {

            // 入力欄を金色にハイライト
            const targetInput = document.getElementById('subject-target-input');
            if (targetInput) {
                targetInput.style.backgroundColor = 'rgba(255, 215, 0, 0.3)';
                targetInput.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.6)';
            }

            // 「これにする！」ボタンを光らせる
            setTimeout(() => {
                const saveBtn = document.querySelector('[onclick*="saveSubjectRename"]');
                if (saveBtn) {
                    saveBtn.classList.add('tutorial-highlight');
                    saveBtn.setAttribute('data-tutorial-hint', '👆ここだよ！');
                }
            }, 800);
        }
    }, 150);
};

// 補助：ランクボタンで数値をセットする
window.setDailyGoalByValue = function (mins) {
    const input = document.getElementById('daily-goal-input');
    if (input) {
        input.value = mins;
        input.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
        setTimeout(() => input.style.backgroundColor = 'rgba(255, 255, 255, 0.1)', 300);
    }
};

window.setRandomDailyGoal = function () {
    const input = document.getElementById('daily-goal-input');
    if (input) {
        // 10分〜120分の間で5分刻みのランダムな時間を生成
        const randomMins = Math.floor(Math.random() * (120 - 10) / 5 + 1) * 5 + 10;
        input.value = randomMins;

        // 占い風の演出
        input.style.backgroundColor = 'rgba(155, 89, 182, 0.3)'; // 紫っぽい色
        input.style.transform = 'scale(1.1)';
        setTimeout(() => {
            input.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            input.style.transform = 'scale(1)';
        }, 300);

        // メッセージを一時的に表示（あれば）
        console.log("🎲 運命の修行時間:", randomMins);
    }
};

window.setTargetByRank = function (hours) {
    const input = document.getElementById('subject-target-input');
    if (input) {
        input.value = hours;
        // 視覚的なフィードバック
        input.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
        setTimeout(() => input.style.backgroundColor = 'rgba(255, 255, 255, 0.1)', 300);
    }
};

window.setRandomTargetHours = function () {
    const input = document.getElementById('subject-target-input');
    if (input) {
        // 5h〜300hの間でランダムな時間を生成
        const randomHours = Math.floor(Math.random() * (300 - 5 + 1)) + 5;
        input.value = randomHours;

        // 占い風の演出
        input.style.backgroundColor = 'rgba(155, 89, 182, 0.3)';
        input.style.transform = 'scale(1.1)';
        setTimeout(() => {
            input.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            input.style.transform = 'scale(1)';
        }, 300);
    }
};

window.saveSubjectRename = function (id) {
    const input = document.getElementById('subject-rename-input');
    if (!input) return;

    const newName = input.value.trim();
    if (!newName) {
        showMessageModal("勇者へのツッコミ", "名前がないと寂しいよ！<br>何か素敵な名前をつけてあげて？");
        return;
    }

    const targetInput = document.getElementById('subject-target-input');
    // 入力が空ならplaceholder（元の値）を使う、それもなければ0
    const val = targetInput.value;
    const finalHours = (val === null || val === '') ? (targetInput.placeholder || '0') : val;
    const targetMinutes = Math.max(0, parseInt(finalHours) * 60);

    // データの保存
    const keyPrefix = id.replace(/-/g, '_');
    localStorage.setItem(keyPrefix + '_label', newName);
    localStorage.setItem(keyPrefix + '_target', targetMinutes.toString());

    // メモリ上の構成データも更新（リロードなしで反映するため）
    const subjIndex = STUDY_SUBJECTS.findIndex(s => s.id === id);
    if (subjIndex !== -1) {
        STUDY_SUBJECTS[subjIndex].label = newName;
        STUDY_SUBJECTS[subjIndex].targetMinutes = targetMinutes;
    }

    // UIを即座に再描画
    generateSubjectButtons();

    // 🎯 Chapter System 連携
    if (window.handleTargetTimeConfirm) {
        window.handleTargetTimeConfirm(newName, parseInt(finalHours));
    }

    // 演出：キラキラ
    createSparkleEffect();

    // 🔴 チュートリアル誘導の解除
    const settingsWrapper = document.querySelector('.settings-btn-wrapper');
    if (settingsWrapper) settingsWrapper.classList.remove('tutorial-highlight');

    // 🎯 チュートリアル進行チェック (Stage 1 → 2)
    if (gameData.tutorialProgress && gameData.tutorialProgress.stage === 1) {
        console.log('🎯 チュートリアルStage 1 → 2 に進行します');
        gameData.tutorialProgress.stage = 2;
        saveGameData();

        // 魔法の粉演出を発動
        createSparkleEffect();

        // モーダルを閉じた後、「冒険に出る」ボタンを光らせる
        setTimeout(() => {
            closeMessageModal();

            setTimeout(() => {
                // 🔴 重要：画面を再描画してボタンの状態を更新
                console.log('🎯 study-screenを再描画してボタン状態を更新');
                showScreen('study-screen');

                // 修行画面のアドバイスメッセージを更新
                const adviceEl = document.getElementById("hero-advice-message");
                if (adviceEl) {
                    const firstSubject = STUDY_SUBJECTS[0].label;
                    adviceEl.textContent = `「${firstSubject}」のボタンを押して選んでから、「冒険に出る」ボタンを押してね！`;
                }

                // 「冒険に出る」ボタンを探して光らせる
                const adventureBtn = document.querySelector('.start-adventure-btn');
                if (adventureBtn) {
                    console.log('🎯 冒険に出るボタンをハイライト');
                    adventureBtn.classList.add('tutorial-highlight');
                    // 🔴 「ここだよ！」アナウンスは削除（ハイライトのみ）
                }
            }, 800);
        }, 2000); // 魔法演出の時間を確保

        return; // 通常の成功メッセージをスキップ
    }

    if (window.isSelectingJob) {
        window.isSelectingJob = false; // チュートリアル終了、お喋り解禁
        gameData.isSelectingJob = false;
        saveGameData();
        const msgEl = document.getElementById("characterMessage");
        if (msgEl) msgEl.textContent = "「準備完了だ！【冒険に出る】を押して、修行を開始しよう！」";
    }

    // 成功メッセージ
    showMessageModal("✨ 冒険の成功！", `
        <div style="text-align:center; padding:10px;">
            <div style="font-size:40px; margin-bottom:15px;">📜</div>
            <p style="font-size:13px; line-height:1.7; color:#2c1810; font-family: 'DotGothic16', sans-serif;">
                よし！新しい歴史が刻まれたよ！<br>
                これできっと冒険も上手くいくはずだね。
            </p>
            <button class="settings-btn" style="position:static; transform:none; margin:35px auto 0 auto; display:block; padding:10px 30px; font-size:15px;" onclick="window.executeDisintegrateEffect()">いざ、出発！</button>
        </div>
    `, true);
};

// 互換性のためのエイリアス
window.updateSubjectLabel = window.startRenamingSubject;

// Helper to generate Subject Buttons dynamically
function generateSubjectButtons() {
    const container = document.querySelector('.subject-selector-mvp');
    if (!container) return;

    // Clear existing static buttons
    container.innerHTML = '';

    // 🎯 チュートリアルStage 2かどうかをチェック
    const isTutorialStage2 = gameData.tutorialProgress && gameData.tutorialProgress.stage === 2;

    STUDY_SUBJECTS.forEach((subj, index) => {
        // 元のデザイン通り、ラッパー要素を作成する
        const wrapper = document.createElement('div');
        wrapper.className = 'subject-item-wrapper';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `subject-btn-mvp ${subj.type}`;
        btn.id = subj.id;
        btn.dataset.subject = subj.label;
        btn.onclick = () => selectSubject(btn);

        // 🎯 チュートリアルStage 2: 最初の科目以外を無効化
        if (isTutorialStage2 && index !== 0) {
            btn.disabled = true;
            btn.classList.add('tutorial-disabled');
            btn.onclick = null; // クリックイベントを無効化
        }

        let iconClass = 'math';
        if (subj.type === 'qualification') iconClass = 'math';
        else if (subj.type === 'language') iconClass = 'english';
        else if (subj.type === 'business') iconClass = 'science';
        else if (subj.type === 'other') iconClass = 'other';

        btn.innerHTML = `<div class="subject-icon ${iconClass}"></div>`;

        const label = document.createElement('span');
        label.className = 'subject-label-mvp';
        label.textContent = subj.label;

        // 🎯 チュートリアルStage 2: ラベルも無効化スタイル
        if (isTutorialStage2 && index !== 0) {
            label.classList.add('tutorial-disabled');
        }

        // ボタンとラベルをラッパーに追加
        wrapper.appendChild(btn);
        wrapper.appendChild(label);

        // ラッパーをコンテナに追加
        container.appendChild(wrapper);
    });

    // 主人公からのアドバイスメッセージを更新
    updateHeroAdviceMessage();
}

/**
 * 科目選択画面で主人公からのアドバイスメッセージを表示する
 */
function updateHeroAdviceMessage() {
    const messageEl = document.getElementById('hero-advice-message');
    if (!messageEl) return;

    // 🎯 チュートリアル中（Stage 1）
    if (gameData.tutorialProgress && gameData.tutorialProgress.stage === 1) {
        const firstSubject = STUDY_SUBJECTS[0]?.label || '科目';
        messageEl.textContent = `まずは右上の「作戦会議」ボタン（⚙️）を押して、「${firstSubject}」の目標時間を設定しよう！`;
        return;
    }

    // 🎯 チュートリアル中（Stage 2）
    if (gameData.tutorialProgress && gameData.tutorialProgress.stage === 2) {
        const firstSubject = STUDY_SUBJECTS[0]?.label || '科目';
        messageEl.textContent = `「${firstSubject}」のボタンを押して選んでから、「冒険に出る」ボタンを押してね！`;
        return;
    }

    const level = gameData?.player?.level || 1;
    const messages = [
        "どの修行に挑む？ 自分のペースで選んでね！",
        "今日はどの科目を勉強する？",
        "焦らなくて大丈夫。一歩ずつ進もう！",
        "好きな科目から始めてみよう！",
        "継続は力なり。今日も頑張ろう！",
        "小さな積み重ねが大きな成長につながるよ！"
    ];

    // レベルに応じた特別なメッセージを追加
    if (level >= 30) {
        messages.push("君の成長、本当にすごいね！");
        messages.push("この調子で、さらに高みを目指そう！");
    }

    if (level >= 50) {
        messages.push("ここまで来れたのは、君の努力の証だよ！");
        messages.push("もう立派な冒険者だね。誇りに思うよ！");
    }

    if (level >= 99) {
        messages.push("伝説の領域に到達した君なら、何でもできる！");
        messages.push("君と一緒に冒険できて、本当に幸せだよ！");
    }

    // ランダムにメッセージを選択
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    messageEl.textContent = randomMessage;

    console.log(`💬 主人公のアドバイス: "${randomMessage}"`);
}


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

function activateTimerUI() {
    console.log("Btn clicked: activateTimerUI. CurrentSubject:", gameData.currentSubject);
    if (!gameData.currentSubject) {
        console.log("No subject selected, showing warning.");
        showSubjectWarningModal();
        return;
    }

    // タイトルの更新
    const titleElement = document.getElementById('study-screen-title');
    if (titleElement && gameData.currentSubject) {
        titleElement.textContent = `${gameData.currentSubject}の試練`;
    }

    // すでに進行中のセッションがあるならレジューム
    if (gameData.dailySession && gameData.dailySession.remainingSeconds > 0) {
        console.log("Resuming existing session.");
        startTimer();
        return;
    }

    console.log("Starting new session, showing goal modal.");
    // 新規修行開始：目標時間入力モーダルを表示
    showDailyGoalModal();
}

function showDailyGoalModal() {
    const subjectLabel = gameData.currentSubject;
    // 🎯 チュートリアル中（Stage 2）は25分に設定
    const isTutorial = gameData.tutorialProgress && gameData.tutorialProgress.stage === 2;
    const lastGoal = localStorage.getItem('last_daily_goal_' + subjectLabel);
    const defaultMins = isTutorial ? 25 : (lastGoal ? parseInt(lastGoal) : 0);

    // 🎯 チュートリアル用のコメント
    const tutorialComment = isTutorial
        ? `<p style="margin-bottom:15px; font-size:13px; color:#8b4513; background:rgba(255,248,220,0.8); padding:10px; border-radius:8px; border:2px solid #8b4513; line-height:1.6;">
               💬 今回は、25分に設定しておいたよ！<br>
               「修行をはじめる！」ボタンを押してね！
           </p>`
        : '';

    const html = `
        <div style="text-align:center; padding:10px;">
            <p style="margin-bottom:15px; font-size:14px; color:#2c1810; font-weight:bold;">
                「${subjectLabel}」の修行を開始します
            </p>
            ${tutorialComment}
            <p style="margin-bottom:20px; font-size:12px; color:#2c1810;">
                今日は何分間、修行に励みますか？<br>
                <small>(完遂すると特別な報酬がもらえます！)</small>
            </p>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:20px;">
                <button class="settings-btn" style="position:static; transform:none; font-size:11px; padding:8px 4px; filter: hue-rotate(90deg);" 
                    onclick="window.setDailyGoalByValue(25)">🌿 集中 (25分)</button>
                <button class="settings-btn" style="position:static; transform:none; font-size:11px; padding:8px 4px; filter: hue-rotate(180deg);" 
                    onclick="window.setDailyGoalByValue(50)">⚔️ 奮闘 (50分)</button>
                <button class="settings-btn" style="position:static; transform:none; font-size:11px; padding:8px 4px; filter: hue-rotate(280deg);" 
                    onclick="window.setDailyGoalByValue(90)">🐉 邁進 (90分)</button>
                <button class="settings-btn" style="position:static; transform:none; font-size:11px; padding:8px 4px; filter: grayscale(0.8);" 
                    onclick="window.setRandomDailyGoal()">🎲 調査 (？分)</button>
            </div>

            <div style="display:flex; align-items:center; justify-content:center; gap:5px; margin-bottom:30px;">
                <input type="number" id="daily-goal-input" value="${defaultMins}" min="1" step="5"
                    style="width:80px; padding:10px; background:rgba(255,255,255,0.1); border:none; border-bottom:3px double #2c1810; color:#2c1810; font-family: 'DotGothic16', sans-serif; font-size:18px; text-align:center; outline:none; border-radius:0;">
                <span style="font-size:14px; color:#2c1810; font-weight:bold;">分</span>
            </div>
            <div style="display:flex; gap:15px; justify-content:center;">
                <button class="settings-btn" style="position:static; transform:none; padding:10px 20px;" onclick="window.startQuestSession()">修行をはじめる！</button>
                <button class="settings-btn" style="position:static; transform:none; padding:10px 20px; filter:grayscale(0.5);" onclick="closeMessageModal()">やめる</button>
            </div>
        </div>
    `;
    showMessageModal("- 聖なる誓い -", html, true);
}

window.startQuestSession = function () {
    const input = document.getElementById('daily-goal-input');
    const mins = parseInt(input.value || '0');
    if (mins <= 0) {
        alert("1分以上の時間をセットしてください！");
        return;
    }

    localStorage.setItem('last_daily_goal_' + gameData.currentSubject, mins.toString());

    // 🔴 チュートリアル誘導の解除（ここだよ！を消す）
    window.isSelectingJob = false;
    gameData.isSelectingJob = false;

    // ハイライトとヒントを確実に消す
    const adventureBtn = document.querySelector('.start-adventure-btn');
    if (adventureBtn) {
        adventureBtn.classList.remove('tutorial-highlight');
        adventureBtn.removeAttribute('data-tutorial-hint');
    }

    // 生き残っているオンボーディングタイマーを全て破棄
    if (window.onboardingTimers) {
        window.onboardingTimers.forEach(t => clearTimeout(t));
        window.onboardingTimers = [];
    }
    saveGameData();

    // 🔴 修正ポイント：セッションデータに今の科目を「絶対」に保存する
    gameData.dailySession = {
        targetMinutes: mins,
        subjectLabel: gameData.currentSubject, // ここに刻む
        startTime: null,
        pausedTime: null,
        elapsedAtPause: 0,
        isCompleted: false
    };

    selectMonsterForQuest();

    const preBattleUI = document.getElementById('pre-battle-ui');
    const battleUI = document.getElementById('battle-ui');
    if (preBattleUI) preBattleUI.classList.add('hidden');
    if (battleUI) battleUI.classList.remove('hidden');

    saveGameData(); // 🔴 ここで即保存！
    closeMessageModal();

    // 🎯 直接修行開始せず、ボス登場演出画面へ
    showBossIntroScreen(gameData.currentSubject);
};

// ========================================
// 🎭 ボス登場演出画面の制御
// ========================================

/**
 * ボス登場演出画面を表示
 */
function showBossIntroScreen(chapterName) {
    if (!gameData.chapters) gameData.chapters = {};
    let chapterData = gameData.chapters[chapterName];

    // データがない場合のフォールバック（既存の科目名から生成）
    if (!chapterData) {
        const subj = STUDY_SUBJECTS.find(s => s.label === chapterName);
        const targetHours = subj ? (subj.targetMinutes / 60) : 60;
        window.handleTargetTimeConfirm(chapterName, targetHours);
        chapterData = gameData.chapters[chapterName];
    }

    const introScreen = document.getElementById('boss-intro-screen');
    if (!introScreen) return;

    introScreen.style.display = 'flex';
    introScreen.classList.add('active');

    // タイトル設定
    const titleText = chapterData.firstTime ? '試練開始' : '試練再開';
    document.getElementById('boss-intro-title-text').textContent = titleText;

    // 🔴 修正：現在戦っている「大ボス」がいる場合はその情報を優先して表示する
    const activeGrand = gameData.grandBoss;
    const bossName = activeGrand ? activeGrand.monster.name : chapterData.boss;
    const bossRank = activeGrand ? activeGrand.rank : chapterData.bossRank;
    const currentDamage = activeGrand ? activeGrand.currentDamage : (chapterData.completedMinutes || 0);
    const targetMin = activeGrand ? activeGrand.targetMinutes : (chapterData.targetMinutes || 1800);

    // ボス画像
    const bossImage = document.getElementById('boss-intro-image');
    // 修正：ランク名とボス名を繋いで画像パスを生成（ファイルの実態に合わせて半角アンダースコアを使用）
    bossImage.src = `assets/monster/${bossRank}_${bossName}.png`;
    bossImage.alt = bossName;

    // ボス名・ランク
    document.getElementById('boss-intro-name').textContent = bossName;
    document.getElementById('boss-intro-rank').textContent = `（${bossRank} ランク）`;
    // --- 目標時間・進捗の計算 ---
    const targetHours = Math.floor(targetMin / 60);
    const completedHours = Math.floor(currentDamage / 60);
    const completedMins = Math.floor(currentDamage % 60);

    // パーセント計算（100%を超えないようにガード）
    const progressPercent = Math.min(100, Math.floor((currentDamage / targetMin) * 100));

    // UI反映
    document.getElementById('boss-intro-target-time').textContent = `${targetHours}時間`;
    document.getElementById('boss-intro-completed-time').textContent = `${completedHours}時間${completedMins}分`;
    document.getElementById('boss-intro-total-time').textContent = `${targetHours}時間`;
    document.getElementById('boss-intro-progress-percent').textContent = `${progressPercent}%`;

    // 進捗バー
    const progressBar = document.getElementById('boss-intro-progress-bar');
    progressBar.style.width = `${progressPercent}%`;

    // セリフを取得して表示（タイプライター効果）
    const dialogue = getBossDialogue(chapterData.boss, chapterData.progress || 0);
    typewriterEffect('boss-intro-dialogue', dialogue, 40);

    // スキップボタン制御
    const skipButton = document.getElementById('skip-intro-button');
    const skipHint = document.querySelector('.skip-hint');

    if (!chapterData.firstTime) {
        if (skipButton) skipButton.style.display = 'block';
        if (skipHint) skipHint.style.display = 'block';
    } else {
        if (skipButton) skipButton.style.display = 'none';
        if (skipHint) skipHint.style.display = 'none';
    }

    // ボタンイベント設定
    setupBossIntroButtons(chapterName);

    // 初回フラグを更新
    if (chapterData.firstTime) {
        gameData.chapters[chapterName].firstTime = false;
        saveGameData();
    }
}

/**
 * ボス登場演出画面のボタンイベントを設定
 */
function setupBossIntroButtons(chapterName) {
    const introScreen = document.getElementById('boss-intro-screen');
    const startButton = document.getElementById('start-battle-button');
    const skipButton = document.getElementById('skip-intro-button');

    const proceed = () => {
        closeBossIntroScreen();
        // ここでタイマー開始とUI切り替えを行う
        startTimer(); // 元々の修行開始ロジックを実行
    };

    startButton.onclick = (e) => {
        e.stopPropagation();
        proceed();
    };

    if (skipButton) {
        skipButton.onclick = (e) => {
            e.stopPropagation();
            proceed();
        };
    }

    // 画面タップでスキップ（2回目以降のみ）
    const chapterData = gameData.chapters[chapterName];
    if (!chapterData.firstTime) {
        introScreen.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') {
                proceed();
            }
        };
    } else {
        introScreen.onclick = null;
    }
}

function closeBossIntroScreen() {
    const introScreen = document.getElementById('boss-intro-screen');
    if (introScreen) {
        introScreen.style.display = 'none';
        introScreen.classList.remove('active');
    }
}

function typewriterEffect(elementId, text, speed) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = '';

    let i = 0;
    const interval = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(interval);
            const startBtn = document.getElementById('start-battle-button');
            if (startBtn) startBtn.disabled = false;
        }
    }, speed);

    const startBtn = document.getElementById('start-battle-button');
    if (startBtn) startBtn.disabled = true;
}

function getBossDialogue(bossName, progress) {
    const dialogues = {
        "刻蝕のヒトガタ": {
            intro: "ふふふ…まずは私が相手だ。\n10時間、耐えられるかな？",
            early: "ほう…戻ってきたか。\nまだ始まったばかりだぞ。",
            mid: "なかなかやるな…だが、油断するなよ。",
            late: "くっ…思ったより粘るな。",
            final: "バカな…ここまで来るとは…"
        },
        "怠惰のエテイン": {
            intro: "ふあぁ…30時間も頑張るの？\n途中で休みたくなっちゃうよ。",
            early: "ほう…戻ってきたか。\nだらけたくなったんじゃないの？",
            mid: "なかなかやるな…でも、まだ半分だよ？",
            late: "くっ…思ったより粘るな。",
            final: "バカな…本当に続けるとは…"
        },
        "進捗断ちの番犬フェンリル": {
            intro: "ガルルル…50時間は長いぞ。\n途中で挫折する者が多い…",
            early: "お前の覚悟、見せてみろ。",
            mid: "なかなかやるな…だが、ここからが本当の試練だ。",
            late: "くっ…思ったより粘るな。",
            final: "バカな…ここまで来るとは…"
        },
        "時廻竜アークバーン": {
            intro: "80時間の試練に挑むとは、時を巻き戻したくなるだろう。",
            early: "ほう…戻ってきたか。だが、逃げ道はない。",
            mid: "なかなかやるな…認めてやろう。",
            late: "くっ…思ったより粘るな。時を巻き戻したくなるだろう。",
            final: "バカな…時の流れすら超えるのか…"
        },
        "刻喰い皇妃メリアノス": {
            intro: "100時間…壮大な挑戦ね。途中で諦める者ばかり、あなたは違うと言えるかしら？",
            early: "ほう…戻ってきたのね。覚悟は本物のようね。",
            mid: "なかなかやるわね…でも、まだ半分よ。",
            late: "くっ…思ったより粘るわね。最後まで油断しないで。",
            final: "まさか…認めるわ、あなたの覚悟を。"
        },
        "刻喰い王ゼロ＝クロノス": {
            intro: "100時間の試練を乗り越えし者よ。時を喰らい尽くす覚悟はあるか？",
            early: "ほう…戻ってきたか。すでに時間を喰らい始めたな。",
            mid: "なかなかやるな…だが、ここからが本当の試練だ。",
            late: "私を倒すにはまだ足りない。",
            final: "ぐあああ…時を…喰らい尽くされた…"
        }
    };

    const bossDlg = dialogues[bossName] || { intro: "さあ、試練を始めよう…", early: "やるな…", mid: "ふむ…", late: "な、何だと！？", final: "バカな…" };
    if (progress === 0) return bossDlg.intro;
    if (progress < 0.25) return bossDlg.early;
    if (progress < 0.5) return bossDlg.mid;
    if (progress < 0.75) return bossDlg.late;
    return bossDlg.final;
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


function stopTimer(forcedComplete) {
    if (isStopProcessing) return; // すでに終了処理中なら無視
    isStopProcessing = true;

    const isComplete = (forcedComplete === true);
    console.log("stopTimer called. isComplete:", isComplete);

    if (!timerInterval && gameData.dailySession && !gameData.dailySession.startTime) {
        isStopProcessing = false; // まだ開始していなければフラグを戻す
        return;
    }

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.classList.remove('timer-pulsing');

    // モンスターの退散・討伐演出
    const monsterSprite = document.getElementById('monster-sprite');
    if (monsterSprite) {
        if (isComplete) {
            monsterSprite.classList.add('monster-defeat');
        } else {
            monsterSprite.classList.add('monster-retreat');
        }
    }

    // 修行済みの時間を計算
    const now = Date.now();
    let elapsedMs = 0;

    // 🔴 重要：一時停止していた場合は、pausedTime時点での経過時間を使う
    if (gameData.dailySession.pausedTime && gameData.dailySession.elapsedAtPause) {
        // 一時停止中だった → 保存されていた経過時間を使用
        elapsedMs = gameData.dailySession.elapsedAtPause;
        console.log(`⏸️ 一時停止中に終了: 保存されていた経過時間 ${Math.floor(elapsedMs / 1000)}秒を使用`);
    } else if (gameData.dailySession.startTime) {
        // タイマー実行中だった → 現在時刻から計算
        elapsedMs = now - gameData.dailySession.startTime;
        console.log(`▶️ 実行中に終了: 経過時間 ${Math.floor(elapsedMs / 1000)}秒`);
    }

    const elapsedSecondsInSession = Math.floor(elapsedMs / 1000);

    // 🎯 チュートリアル中かどうかを判定
    const isTutorial = gameData.tutorialProgress && gameData.tutorialProgress.stage === 3;

    // 少しディレイを置いてリザルトを表示
    setTimeout(() => {
        // 🔴 修正：チュートリアル中は経過時間に関わらず必ずリザルト画面を表示
        if (elapsedSecondsInSession >= 60 || isTutorial) {
            // ① まず計算を行い、獲得したコイン等を受け取る
            // チュートリアル時は最低60秒として計算（レベルアップのため）
            const actualSeconds = isTutorial ? Math.max(60, elapsedSecondsInSession) : elapsedSecondsInSession;
            const result = saveStudySession(actualSeconds, isComplete);

            // ② 大ボスの演出画面を呼び出す（獲得コインも渡す）
            if (typeof showBossDamageAnimation === 'function') {
                showBossDamageAnimation(
                    Math.floor(actualSeconds / 60),
                    isComplete,
                    null,
                    result ? result.earnedCoins + (isComplete ? 50 : 0) : 0 // 基本 + デイリー完遂ボーナス
                );
            }
        } else {
            // 1分未満の時は演出なしでホームに戻る（チュートリアル以外）
            finishStudySessionCleanUp();
        }
    }, 1500);
}

function finishStudySessionCleanUp() {
    // Reset selection state
    gameData.currentSubject = null;
    document.querySelectorAll('.subject-btn-mvp').forEach(btn => {
        btn.classList.remove('active');
    });

    // Reset Daily Session
    gameData.dailySession = {
        targetMinutes: 0,
        startTime: null,
        pausedTime: null,
        elapsedAtPause: 0,
        isCompleted: false
    };
    gameData.activeQuest = null;

    isStopProcessing = false; // 終了処理完了時にフラグをリセット

    // Reset Persisted Timer State
    gameData.timer = {
        isRunning: false,
        startTime: null,
        pausedAt: null
    };
    saveGameData();

    // UI切り替え：戦闘UI非表示、戦闘前UI表示
    const preBattleUI = document.getElementById('pre-battle-ui');
    const battleUI = document.getElementById('battle-ui');
    if (battleUI) battleUI.classList.add('hidden');
    if (preBattleUI) preBattleUI.classList.remove('hidden');

    // UIリセット
    renderTimer(0);
    showTimerMessage('STOP');
    updateStudyScreenUI();

    // ホーム画面に戻る
    showScreen('home-screen');
    updateHomeScreen();

    // 🎯 チュートリアル：ホーム画面に戻った直後の準備 (Stage 3)
    if (gameData.tutorialProgress && gameData.tutorialProgress.stage === 3) {
        // 🔴 重要：hasReceivedWelcomeRewardフラグを立てる
        // これにより、showScreen('home-screen')内のStage 3→4処理が実行される
        gameData.tutorialProgress.hasReceivedWelcomeReward = true;

        // 🎁 お祝いの100コインを付与
        gameData.player.coins += 100;
        saveGameData();
        console.log("💰 チュートリアル：お祝いの100コインを付与しました");
    }

    // 🔴 追伸：大ボスの演出画面が残っていたら確実に消す
    const bossScreen = document.getElementById('bossDamageScreen');
    if (bossScreen) {
        bossScreen.style.display = 'none';
        bossScreen.classList.remove('active');
    }
}
window.finishStudySessionCleanUp = finishStudySessionCleanUp;



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

function saveStudySession(actualSeconds, isComplete = false) {
    const minutes = Math.floor(actualSeconds / 60);
    if (minutes === 0) return; // 1分未満は記録しない

    // 累積時間を計算（過去分 + 今回分）
    const pastTotalMinutes = gameData.studyLogs.reduce((sum, log) => sum + log.minutes, 0);
    const currentTotalMinutes = pastTotalMinutes + minutes;

    // コイン計算ロジック変更 (2026/01/26)
    // 1. 基本レート: 1分につき1コイン
    // 2. 集中ボーナス: 60分(連続)ごとに +40コイン
    // これにより 60分 = 60(基本) + 40(ボーナス) = 100コイン (ガチャ1回分) となる
    const baseCoins = minutes * 1;
    const bonusCoins = Math.floor(minutes / 60) * 40;
    const earnedCoins = baseCoins + bonusCoins;

    const earnedExp = minutes * 10;

    // パラメーターの上昇量 (1分 = 0.5ポイント)
    const statIncrease = minutes * 0.5;
    const statCap = 50 + (gameData.player.level * 10);

    // 科目に応じて上昇するステータスを決定
    const subj = STUDY_SUBJECTS.find(s => s.label === gameData.currentSubject);
    const subjType = subj ? subj.type : 'other';

    let statKey = 'strength';
    if (subjType === 'qualification' || subjType === 'language') {
        statKey = 'intellect';
    } else if (subjType === 'business') {
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

    // --- Check if Eraser Dust should be awarded ---
    checkAndAwardEraserDust();

    // 🎯 チュートリアル初回報酬 (Stage 3)
    let tutorialBonusExp = 0;
    let tutorialBonusCoins = 0;

    if (gameData.tutorialProgress && gameData.tutorialProgress.stage === 3 &&
        !gameData.tutorialProgress.hasCompletedFirstQuest) {

        // 🔴 重要：LEVEL_TABLE[2] を正確に参照してLv.2に確実に上がるように計算
        const currentExp = gameData.player.exp + earnedExp; // 通常報酬込みの現在経験値
        const expForLv2 = LEVEL_TABLE[2] || 200; // Lv.2に必要な累積経験値
        tutorialBonusExp = Math.max(0, expForLv2 - currentExp);
        tutorialBonusCoins = 100; // ガチャ1回分

        gameData.tutorialProgress.hasCompletedFirstQuest = true;
        gameData.tutorialProgress.hasReceivedWelcomeReward = true;

        console.log(`🎁 チュートリアル報酬: +${tutorialBonusExp} EXP (Lv.2確定), +${tutorialBonusCoins} Coins`);
    }

    // プレイヤーデータ更新
    const oldLevel = gameData.player.level;
    gameData.player.exp += earnedExp + tutorialBonusExp;
    gameData.player.coins += earnedCoins + tutorialBonusCoins;

    // ダメージ（累積時間）を科目データに保存
    const subjIndexForDamage = STUDY_SUBJECTS.findIndex(s => s.label === gameData.currentSubject);
    if (subjIndexForDamage !== -1) {
        STUDY_SUBJECTS[subjIndexForDamage].currentDamage += minutes;
        localStorage.setItem(STUDY_SUBJECTS[subjIndexForDamage].id.replace(/-/g, '_') + '_damage', STUDY_SUBJECTS[subjIndexForDamage].currentDamage.toString());
    }

    // 大ボスへのダメージも蓄積
    if (gameData.grandBoss) {
        gameData.grandBoss.currentDamage += minutes;
        console.log(`👹 Grand Boss damaged: +${minutes} min (Total: ${gameData.grandBoss.currentDamage}/${gameData.grandBoss.targetMinutes})`);

        // 章（Chapter）データ側の進捗も同期させる
        if (gameData.chapters && gameData.chapters[gameData.currentSubject]) {
            const ch = gameData.chapters[gameData.currentSubject];
            ch.completedMinutes = gameData.grandBoss.currentDamage;
            ch.progress = ch.completedMinutes / ch.targetMinutes;
        }
    }

    // 完遂時の特別報酬（デイリー目標達成）
    if (isComplete) {
        // ✨ 修正：デイリー達成は一律のボーナスにする（大ボス報酬と混同しないように）
        const dailyBonusCoins = 50;
        const dailyBonusExp = 100;
        gameData.player.coins += dailyBonusCoins;
        gameData.player.exp += dailyBonusExp;
        console.log(`🎁 デイリー修行完遂！ +${dailyBonusCoins} Coins, +${dailyBonusExp} EXP`);

        // 🔴 重要：モンスター討伐ボーナスも加算
        if (gameData.activeQuest) {
            const { rank } = gameData.activeQuest;
            const rewards = RANK_REWARDS[rank];

            if (rewards) {
                gameData.player.coins += rewards.coins;
                gameData.player.exp += rewards.exp;

                // 勲章を追加（重複チェック）
                if (rewards.medal && !gameData.player.medals.includes(rewards.medal)) {
                    gameData.player.medals.push(rewards.medal);
                }

                // 称号を追加（重複チェック）
                if (rewards.title && !gameData.player.titles.includes(rewards.title)) {
                    gameData.player.titles.push(rewards.title);
                }

                console.log(`🏆 討伐ボーナス (${rank}): +${rewards.coins} Coins, +${rewards.exp} EXP, ${rewards.medal}`);
            }
        }
    }

    // レベルアップチェック (モーダル抑制モード: 結果だけ受け取る)
    const levelUpInfo = checkLevelUp(oldLevel, true);

    // データ保存
    saveGameData();

    // 画面更新
    if (gameData.currentChallenge && gameData.currentChallenge.quest) {
        showBossDamageAnimation(minutes, isComplete, levelUpInfo, earnedCoins);
    } else {
        handleDeferredLevelUp(levelUpInfo, () => {
            showQuestResult(minutes, isComplete, earnedCoins);
        });
    }

    calculateTodayStats();
    updateLogScreen();

    // 獲得した情報を返す
    return { earnedCoins, earnedExp, levelUpInfo };
}

function showQuestResult(minutes, isComplete, earnedCoins = 0) {
    if (!gameData.activeQuest) return;
    const { rank, monster } = gameData.activeQuest;
    const rewards = RANK_REWARDS[rank];

    // coinRate calculation removed (logic changed to 1/min + bonus)

    let html = `
        <div style="text-align:center; padding:10px;">
            <div class="result-title-banner">${isComplete ? '討伐成功！' : '討伐はまだ遠いようだ'}</div>
            
            <p style="font-size:16px; color:#4e342e; font-weight:bold; margin-bottom:15px;">
                ${isComplete ? monster.name + ' を討伐した！' : monster.name + ' は去っていった...'}
            </p>

            <div class="result-rewards">
                <div class="reward-item">
                    <span class="reward-icon">📖</span>
                    <span>修行時間：${minutes} 分</span>
                </div>
                <div class="reward-item">
                    <span class="reward-icon">✨</span>
                    <span>獲得経験値：+${minutes * 10}${isComplete ? ' (+100 Bonus!)' : ''} EXP</span>
                </div>
                <div class="reward-item">
                    <span class="reward-icon">💰</span>
                    <span>獲得コイン：+${earnedCoins + (isComplete ? 50 : 0)}</span>
                </div>
            </div>
    `;

    if (isComplete) {
        // 🎯 チュートリアルStage 3の特別処理
        const isTutorialStage3 = gameData.tutorialProgress && gameData.tutorialProgress.stage === 3;

        // 🔴 完遂報酬エリア全体をクリック可能に（中央揃えを強化）
        const rewardAreaOnclick = isTutorialStage3 ? ' onclick="handleTutorialRewardClick()"' : '';
        const rewardAreaStyle = ' style="cursor: ' + (isTutorialStage3 ? 'pointer' : 'default') + '; position: relative; display: flex; flex-direction: column; align-items: center; width: 100%;"';

        html += `
            <div class="reward-completion-area"${rewardAreaOnclick}${rewardAreaStyle}>
                <div class="reward-chest" style="cursor: ${isTutorialStage3 ? 'pointer' : 'default'}; animation: ${isTutorialStage3 ? 'bounce 1s infinite' : 'none'};">🎁</div>
                <p style="font-size:14px; color:#d32f2f; font-weight:bold; margin-bottom:10px;">完遂報酬をゲット！</p>
                <div class="result-rewards" style="background: rgba(255,215,0,0.1); padding:10px; border-radius:8px;">
                    <div class="reward-item">
                        <span class="reward-icon">💰</span>
                        <span>コイン：+${rewards.coins}</span>
                    </div>
                    <div class="reward-item">
                        <span class="reward-icon">🎖️</span>
                        <span>勲章：${rewards.medal}</span>
                    </div>
                    ${rewards.title ? `
                    <div class="reward-item">
                        <span class="reward-icon">👑</span>
                        <span>称号：${rewards.title}</span>
                    </div>` : ''}
                </div>
            </div>
        `;

        // 🔴 報酬の加算は saveStudySession 内で完了済み（討伐ボーナス含む）
        createSparkleEffect();
    }

    // 🎯 チュートリアル中は「里へもどる」ボタンを最初は非表示、それ以外は中央配置
    const isTutorialStage3 = gameData.tutorialProgress && gameData.tutorialProgress.stage === 3;
    const initialDisplay = isTutorialStage3 ? 'none' : 'block';
    const backButtonId = isTutorialStage3 ? ' id="tutorial-back-button"' : '';

    html += `
            <button class="settings-btn"${backButtonId} style="display: ${initialDisplay}; position:static; transform:none; margin: 25px auto 0 auto; padding:10px 40px;" onclick="finishStudySessionCleanUp(); closeMessageModal();">里へもどる</button>
        </div>
    `;

    showMessageModal("- 修行の成果 -", html, true);
    saveGameData();

    // 🎯 チュートリアル祝福メッセージ (Stage 3)
    if (gameData.tutorialProgress && gameData.tutorialProgress.stage === 3 &&
        gameData.tutorialProgress.hasReceivedWelcomeReward) {
        setTimeout(() => {
            const msgEl = document.getElementById("characterMessage");
            if (msgEl) {
                msgEl.textContent = `「すごい、修行の成果で レベル2 になったよ！お祝いでガチャ1回分のコインも用意しておいたから、左から二番目の【たからばこ】を覗いてみてね！」`;
            }
        }, 2000);
    }
}

/**
 * 🎯 チュートリアル：完遂報酬エリアクリックハンドラー
 */
window.handleTutorialRewardClick = function () {
    console.log('🎁 チュートリアル：完遂報酬エリアをクリック');

    // 報酬エリアを非表示にする
    const rewardArea = document.querySelector('.reward-completion-area');
    if (rewardArea) {
        rewardArea.style.pointerEvents = 'none';
        rewardArea.style.opacity = '0';
        rewardArea.style.transition = 'opacity 0.5s ease';

        setTimeout(() => {
            rewardArea.style.display = 'none';
        }, 500);
    }

    // コインが降ってくるアニメーション
    setTimeout(() => {
        createCoinRainAnimation();
    }, 600);

    // アニメーション後に「里へもどる」ボタンを表示・光らせる
    setTimeout(() => {
        const backButton = document.getElementById('tutorial-back-button');
        if (backButton) {
            backButton.style.display = 'block';
            backButton.classList.add('tutorial-highlight');
            backButton.setAttribute('data-tutorial-hint', '👆ここだよ！');
        }

        // 主人公のメッセージを更新
        const msgEl = document.getElementById("characterMessage");
        if (msgEl) {
            msgEl.textContent = '「報酬を受け取ったね！【里へもどる】ボタンを押して、冒険を終えよう！」';
        }
    }, 3000); // コインアニメーションの時間を考慮
};

// 🔴 旧関数は削除（互換性のため残す場合はエイリアスに）
window.handleTutorialChestClick = window.handleTutorialRewardClick;


/**
 * コインが降ってくるアニメーション
 */
/**
 * コインが降ってくるアニメーション（プレミアム演出）
 */
function createCoinRainAnimation() {
    console.log("💰 コインアニメーション開始");
    const container = document.body;
    const coinCount = 25;

    for (let i = 0; i < coinCount; i++) {
        setTimeout(() => {
            const coin = document.createElement('div');
            // ドット絵コインの見た目
            coin.innerHTML = `<img src="./assets/coin.png" style="width: 24px; height: 24px; image-rendering: pixelated; display: block;">`;
            coin.style.position = 'fixed';
            coin.style.left = (Math.random() * 80 + 10) + '%';
            coin.style.top = '-50px';
            coin.style.zIndex = '20000';
            coin.style.pointerEvents = 'none';
            // 物理的に降ってくるような transition
            coin.style.transition = 'top 1.8s cubic-bezier(0.6, -0.28, 0.735, 0.045), opacity 1.8s ease-in, transform 1.8s linear';
            coin.style.transform = `rotate(${Math.random() * 360}deg)`;

            container.appendChild(coin);

            // アニメーション実行
            requestAnimationFrame(() => {
                setTimeout(() => {
                    coin.style.top = (window.innerHeight + 50) + 'px';
                    coin.style.opacity = '1';
                    coin.style.transform = `rotate(${Math.random() * 720}deg) scale(1.2)`;
                }, 20);
            });

            // 終了後に削除
            setTimeout(() => {
                coin.remove();
            }, 2000);
        }, i * 80);
    }
}

/**
 * クエスト目標時間に基づいてボスランクを判定
 */
function getBossRankByTargetMinutes(targetMinutes) {
    const hours = targetMinutes / 60;
    if (hours < 10) return 'F-ERANK';
    if (hours < 30) return 'D-CRANK';
    if (hours < 50) return 'B-ARANK';
    if (hours < 80) return 'SRANK';
    if (hours < 100) return 'SSRANK';
    return 'EXRANK';
}

/**
 * ランクに基づいてランダムにボスを選択
 */
function selectBossForQuest(rank) {
    const bossList = MONSTER_MASTER[rank];
    if (!bossList || bossList.length === 0) {
        // フォールバック: EXランクのボスを使用
        return MONSTER_MASTER['EXRANK'][0];
    }
    // ランダムに1体選択
    const randomIndex = Math.floor(Math.random() * bossList.length);
    return bossList[randomIndex];
}

/**
 * 大ボスダメージ演出画面（ドラクエ風）を表示
 */
function showBossDamageAnimation(damageMinutes, isComplete, levelUpInfo = null, earnedCoins = 0) {
    const screen = document.getElementById('bossDamageScreen');
    if (!screen) {
        // ボスダメージ画面がない場合は、直接結果画面へ (レベルアップがあれば先に表示)
        if (levelUpInfo) {
            showLevelUpModal(levelUpInfo.oldLevel, levelUpInfo.newLevel, () => {
                showQuestResult(damageMinutes, isComplete);
            });
        } else {
            showQuestResult(damageMinutes, isComplete);
        }
        return;
    }

    // 🔴 チラつき防止：修行画面をここで即・非表示にする
    const studyScreen = document.getElementById('study-screen');
    if (studyScreen) {
        studyScreen.style.display = 'none';
        studyScreen.classList.remove('active');
    }

    // 念のため hidden クラスを削除
    screen.classList.remove('hidden');

    // 大ボスのデータを取得
    const quest = gameData.grandBoss || (gameData.currentChallenge ? gameData.currentChallenge.quest : null);

    // 安全対策：クエストデータがない場合は中断
    if (!quest) {
        console.error("❌ showBossDamageAnimation: Quest data is missing!");
        if (levelUpInfo) {
            handleDeferredLevelUp(levelUpInfo, () => showQuestResult(damageMinutes, isComplete, earnedCoins));
        } else {
            showQuestResult(damageMinutes, isComplete, earnedCoins);
        }
        return;
    }

    const chapterData = gameData.chapters[gameData.currentSubject];

    // --- 🔴 修正：大ボスの最大HPを設定（ハードコードの600分=10時間を廃止） ---
    const maxHP = (quest && quest.targetMinutes > 0) ? quest.targetMinutes : 600;

    // 現在の累計ダメージを安全に取得
    const realTotal = gameData.grandBoss ? gameData.grandBoss.currentDamage : (chapterData ? chapterData.completedMinutes : 0);

    // ダメージを受ける「前」の残りHP（ここからゲージを動かします）
    const hpBeforeDamage = maxHP - (realTotal - damageMinutes);
    // ダメージを受けた「後」の本当の残りHP
    const remainingHP = Math.max(0, maxHP - realTotal);

    // --- 🔴 修正2：大ボスの情報を「ヒトガタ」に固定 ---
    const grandBoss = gameData.grandBoss;
    let activeBossName = "刻蝕のヒトガタ"; // 10時間ボスの名前
    let bossImagePath = "assets/monster/F-ERANK_刻蝕のヒトガタ.png";

    if (grandBoss && grandBoss.monster) {
        activeBossName = grandBoss.monster.name;
        bossImagePath = `assets/monster/${grandBoss.rank}_${grandBoss.monster.name}.png`;
    }

    // 画面への反映
    const bossImg = document.getElementById('bossDisplayImage');
    const bossNameEl = document.getElementById('bossNameLarge');

    if (bossNameEl) bossNameEl.textContent = activeBossName;
    if (bossImg) {
        bossImg.src = bossImagePath;
        bossImg.onerror = () => { bossImg.src = 'assets/monster/F-ERANK_刻蝕のヒトガタ.png'; };
    }

    console.log(`💥 演出開始：大ボス「${activeBossName}」へのダメージを描写します。HP: ${hpBeforeDamage} -> ${remainingHP}`);

    // 1. 初期表示セット（ダメージ前の状態をセット）
    document.getElementById('bossMaxHP').textContent = maxHP;

    // ★ここを追加！ 数字を「ダメージを食らう前」の数値にします
    document.getElementById('bossCurrentHP').textContent = hpBeforeDamage;

    // ゲージも「ダメージを食らう前」の長さにセット
    document.getElementById('bossHPBarFill').style.width = `${(hpBeforeDamage / maxHP) * 100}%`;

    document.getElementById('damageDisplay').style.display = 'none';
    document.getElementById('bossMessage').textContent = "";

    // 画面フェードイン
    screen.style.display = 'flex';
    screen.style.opacity = '0';
    screen.classList.add('active');

    // 0.0s: フェードイン開始
    setTimeout(() => {
        screen.style.transition = 'opacity 0.5s';
        screen.style.opacity = '1';
    }, 10);

    // 1.0s: メッセージ「今日の修行で...」（少し余裕を持たせる）
    setTimeout(() => {
        const msg = document.getElementById('bossMessage');
        msg.textContent = `今日の修行で、${damageMinutes} 分の活力が溜まった！`;

        // 2.5s: ダメージ演出開始（メッセージを1.5秒読ませる）
        setTimeout(() => {
            const damageDisp = document.getElementById('damageDisplay');
            const damageNum = document.getElementById('damageNumber');

            bossImg.classList.add('taking-damage');
            damageDisp.style.display = 'block';
            damageNum.textContent = damageMinutes;

            // 2.5s: HPゲージ減少
            setTimeout(() => {
                const fill = document.getElementById('bossHPBarFill');
                const hpText = document.getElementById('bossCurrentHP');

                fill.style.width = `${(remainingHP / maxHP) * 100}%`;
                hpText.textContent = remainingHP;

                // 次のメッセージのためにクラス削除
                setTimeout(() => { bossImg.classList.remove('taking-damage'); }, 500);

                // 3.5s: メッセージ「残り...分」
                // 4.0s: メッセージ「残り...分」（少し遅らせて表示）
                setTimeout(() => {
                    const msg = document.getElementById('bossMessage');
                    if (remainingHP <= 0) {
                        msg.innerHTML = ` ついに ${activeBossName} を討伐した！！ `;
                    } else {
                        msg.innerHTML = `${activeBossName}にダメージを与えた！<br>大ボスの完全討伐まで あと ${remainingHP} 分...`;
                    }

                    // --- モーダル・リザルト表示へ移行 ---
                    // 🔴 フェードアウトを廃止し、この背景のまま結果を表示します
                    setTimeout(() => {
                        // データを保存（完了分を加算）
                        gameData.currentChallenge.quest.completedMinutes += damageMinutes;
                        saveGameData();

                        // 次の画面（報酬または討伐成功）へ直接移動
                        if (remainingHP <= 0) {
                            showVictoryScreen(gameData.currentSubject);
                        } else {
                            if (levelUpInfo) {
                                handleDeferredLevelUp(levelUpInfo, () => {
                                    showQuestResult(damageMinutes, isComplete, earnedCoins);
                                });
                            } else {
                                showQuestResult(damageMinutes, isComplete, earnedCoins);
                            }
                        }
                    }, 2000); // メッセージを読ませるための余韻
                }, 1000);
            }, 1000);
        }, 1000);
    }, 500);
}

/**
 * 🏆 討伐成功画面を表示 (Grand Boss Defeat)
 */
function showVictoryScreen(chapterName) {
    const chapterData = gameData.chapters[chapterName];
    if (!chapterData) return;

    const rank = chapterData.bossRank;
    const rewards = RANK_REWARDS[rank];
    const screen = document.getElementById('victory-screen');
    const content = screen.querySelector('.victory-content');

    // ランク設定 (E, C, A, S, SS, EX に正規化)
    let rankCode = 'E';
    if (rank === 'EXRANK') rankCode = 'EX';
    else if (rank === 'SSRANK') rankCode = 'SS';
    else if (rank === 'SRANK') rankCode = 'S';
    else if (rank === 'B-ARANK') rankCode = 'A';
    else if (rank === 'D-CRANK') rankCode = 'C';
    content.setAttribute('data-rank', rankCode);

    // タイトル
    let title = "🏆 討伐完了！";
    if (rankCode === 'EX') title = "🌟 伝説の討伐 🌟";
    else if (rankCode === 'SS') title = "👑 伝説の討伐！👑";
    else if (rankCode === 'S') title = "⭐ 見事な討伐！⭐";
    else if (rankCode === 'A') title = "✨ 討伐成功！✨";
    screen.querySelector('.title-text').textContent = title;

    // ボス画像（今戦っていた大ボスのデータを直接使う）
    const activeGrandBoss = gameData.grandBoss;
    if (activeGrandBoss) {
        // rank（EXRANKなど）と名前をガッチャンコして正しいファイル名にする
        document.getElementById('victory-boss-image').src = `assets/monster/${activeGrandBoss.rank}_${activeGrandBoss.monster.name}.png`;
        document.getElementById('victory-boss-name-text').textContent = activeGrandBoss.monster.name;
    } else {
        // もしデータが取れなかった時のための予備（元のコード）
        document.getElementById('victory-boss-image').src = `assets/monster/${rank}_${chapterData.boss}.png`;
        document.getElementById('victory-boss-name-text').textContent = chapterData.boss;
    }
    // 統計
    const startDate = chapterData.startDate ? new Date(chapterData.startDate) : new Date();
    const endDate = new Date();
    const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    document.getElementById('victory-date-range').textContent = `${formatDate(startDate)} 〜 ${formatDate(endDate)}`;

    const h = Math.floor(chapterData.completedMinutes / 60);
    const m = chapterData.completedMinutes % 60;
    document.getElementById('victory-total-time').textContent = `${h}時間${String(m).padStart(2, '0')}分`;

    // 報酬設定
    document.getElementById('victory-coins').textContent = `+${rewards.coins}`;
    document.getElementById('victory-exp').textContent = `+${rewards.exp}`;

    // 勲章画像
    document.getElementById('victory-medal-icon').src = `assets/medals/${rewards.medal}.png`;
    document.getElementById('victory-medal-name').textContent = rewards.medal;

    // 称号設定
    const titleContainer = document.getElementById('victory-title-container');
    if (rewards.title) {
        titleContainer.style.display = 'flex';
        document.getElementById('victory-title-name').textContent = rewards.title;
        // 称号ファイル名のマッピング (assets/titles/)
        let titleFileName = `${rank}＿${rewards.title}.png`; // 基本はこれ
        if (rank === 'B-ARANK') titleFileName = `B-ARANK_修行者.png`;
        if (rank === 'EXRANK') titleFileName = `EXRANK＿刻の支配者.png`;
        document.getElementById('victory-title-icon').src = `assets/titles/${titleFileName}`;
    } else {
        titleContainer.style.display = 'none';
    }

    // レベル変化
    const player = gameData.player;
    const oldLevel = player.level;
    // 仮計算（報酬加算後）
    let tempExp = player.exp + rewards.exp;
    let tempLevel = oldLevel;
    while (LEVEL_TABLE[tempLevel + 1] && tempExp >= LEVEL_TABLE[tempLevel + 1]) {
        tempLevel++;
    }
    document.getElementById('victory-level-change').textContent = `Lv.${oldLevel} → Lv.${tempLevel}`;

    // 画面表示
    screen.style.display = 'flex';
    screen.classList.remove('hidden');

    // 報酬受け取りボタンのイベント設定（上書きで確実に！）
    const receiveBtn = document.getElementById('victory-receive-btn');
    receiveBtn.onclick = null; // 一旦クリア
    receiveBtn.onclick = () => {
        if (receiveBtn.classList.contains('clicked')) return;

        // 1. 演出開始
        receiveBtn.classList.add('clicked');
        receiveBtn.textContent = '✨ 受け取り中... ✨';

        // 祝福アニメーション発動
        if (typeof startCelebrationAnimation === 'function') {
            startCelebrationAnimation();
        }

        // 7.0秒待ってから実際に報酬を付与して閉じる（最強にゆっくり）
        setTimeout(() => {
            // 2. データの反映
            player.coins += rewards.coins;
            player.exp += rewards.exp;
            if (!player.medals.includes(rewards.medal)) player.medals.push(rewards.medal);
            if (rewards.title && !player.titles.includes(rewards.title)) player.titles.push(rewards.title);
            chapterData.completedDate = new Date().toISOString();

            // 3. レベルアップ判定
            const levelUpInfo = checkLevelUp(oldLevel);

            // 4. データ保存
            saveGameData();

            // 5. 画面終了（CSSの2秒フェードに合わせてゆっくり消す）
            screen.classList.add('hidden');
            setTimeout(() => {
                screen.style.display = 'none';
                receiveBtn.classList.remove('clicked');
                receiveBtn.textContent = '報酬を受け取る';
                screen.classList.remove('hidden'); // 次回表示のために戻す
                screen.style.opacity = '1';
            }, 2500);

            // 6. 遷移
            if (levelUpInfo) {
                handleDeferredLevelUp(levelUpInfo, () => {
                    if (window.finishStudySessionCleanUp) {
                        window.finishStudySessionCleanUp();
                    } else {
                        showScreen('home-screen');
                        updateHomeScreen();
                    }
                });
            } else {
                if (window.finishStudySessionCleanUp) {
                    window.finishStudySessionCleanUp();
                } else {
                    showScreen('home-screen');
                    updateHomeScreen();
                }
            }
        }, 7000);
    };
}
window.showVictoryScreen = showVictoryScreen;

// --- 消しゴムのカス（努力の証）出現チェック ---
function checkAndAwardEraserDust() {
    // 1. 全ての勉強ログから累計時間を計算
    const totalMinutes = gameData.studyLogs.reduce((sum, log) => sum + log.minutes, 0);

    // 2. 「10時間（600分）ごと」に1個もらえる計算
    const expectedDustCount = Math.floor(totalMinutes / 600);

    // gameDataに「これまでにカスをもらった回数」を記録する場所を作っておく
    if (gameData.eraserDustAwardedCount === undefined) gameData.eraserDustAwardedCount = 0;

    if (expectedDustCount > gameData.eraserDustAwardedCount) {
        console.log(`✨ 努力の結晶判定: 今回=${expectedDustCount}個目 (累積${totalMinutes}分)`);

        // 3. 消しゴムのカス(ID:16)をインベントリに追加
        const eraserDust = ITEM_MASTER.find(item => item.id === 16);
        if (eraserDust) {
            // まずインベントリに加え、保存を優先する
            const added = addItemToInventory(eraserDust);
            if (added) {
                // 保存が成功してからカウンターを同期
                gameData.eraserDustAwardedCount++;
                saveGameData();
                updateInventoryScreen(); // インベントリ画面も更新
                console.log("✅ 努力の結晶を保存しました。現在のカウント:", gameData.eraserDustAwardedCount);
            } else {
                console.error("❌ 努力の結晶の追加に失敗しました。カバンがいっぱいの可能性があります。");
            }

            // 4. 特別な演出呼び出し（保存のあとに実行）
            // 勉強完了モーダルと被る可能性があるため、少しディレイを入れる
            setTimeout(() => {
                console.log("演出を呼び出します！ (Eraser Dust)");

                // 既存のモーダルを閉じる（重なり防止）
                closeMessageModal();

                // ID:16の時だけ、演出用の特別データを一時的に作る
                const specialDisplay = { ...eraserDust };
                specialDisplay.name = "努力の結晶"; // 演出用タイトル
                specialDisplay.isSpecialEraser = true; // 分引用フラグ

                // 演出表示
                showGachaResult(specialDisplay);
            }, 1000);
        }
    }
}

function handleDeferredLevelUp(info, onComplete) {
    if (!info) {
        if (onComplete) onComplete();
        return;
    }

    if (info.eventType === 'birth') {
        gameData.dragon.obtained = true;
        updateHomeScreen();
        if (onComplete) onComplete();
    } else if (info.eventType === 'egg') {
        triggerDragonEggGacha();
    } else {
        showLevelUpModal(info.oldLevel, info.newLevel, onComplete);
    }
}

function checkLevelUp(oldLevel, suppressModal = false) {
    let newLevel = oldLevel;

    // 1. 最新の累積EXPに基づいて新レベルを算出 (Lv.99上限)
    for (let l = oldLevel + 1; l <= 99; l++) {
        if (gameData.player.exp >= LEVEL_TABLE[l]) {
            newLevel = l;
        } else {
            break;
        }
    }

    if (newLevel > oldLevel) {
        gameData.player.level = newLevel;

        console.log(`🆙 レベル判定: 新レベル=${newLevel}, 以前=${oldLevel}, 卵所持=${gameData.dragon.obtained}`);

        let eventType = 'normal';
        if (newLevel === 99) eventType = 'birth';
        else if (newLevel >= 70 && !gameData.dragon.obtained) eventType = 'egg';

        // モーダル表示を抑制する場合は情報を返して終了
        if (suppressModal) {
            return { oldLevel, newLevel, eventType };
        }

        // --- ドラゴン伏線：特定レベルのイベント ---

        // Milestone: Lv45 (Rainbow Scale) - 一旦コメントアウト
        /*
        if (newLevel >= 45 && oldLevel < 45 && !gameData.dragonMilestones.scaleAwarded) {
            awardRainbowScale();
        }
        */

        // Milestone: Lv60 (Aura Reveal) - 一旦コメントアウト
        /*
        if (newLevel >= 60 && oldLevel < 60) {
            setTimeout(() => {
                showMessageModal("不思議な兆し", "勇者の周りに、温かな光が舞い始めた……。<br>「すぐ近くに誰かいる気がする……温かくて、優しい気配だ」");
                createSparkleEffect();
            }, 2000);
        }
        */

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
    return null; // レベルアップなし
}

/**
 * Lv45お祝いギフト：虹色の鱗
 */
function awardRainbowScale() {
    console.log("🐲 ドラゴンの伏線：虹色の鱗を授与します");
    const scaleItem = ITEM_MASTER.find(it => it.id === 30);
    if (scaleItem) {
        addItemToInventory(scaleItem);
        if (!gameData.dragonMilestones) gameData.dragonMilestones = {};
        gameData.dragonMilestones.scaleAwarded = true;
        saveGameData();

        setTimeout(() => {
            // 他の演出と重ならないよう配慮
            showGachaResult({ ...scaleItem, name: "ドラゴンの贈り物" });
            showMessageModal("伝説の予兆", "どこからか「虹色の鱗」が舞い降りてきた！<br><br>「いつか、大きな力が必要な時に道を示してくれるだろう」");
        }, 1500);
    }
}

let onLevelUpModalClose = null;

function showLevelUpModal(oldLevel, newLevel, onClose = null) {
    document.getElementById('old-level').textContent = oldLevel;
    document.getElementById('new-level').textContent = newLevel;
    document.getElementById('levelup-modal').classList.remove('hidden');
    onLevelUpModalClose = onClose;
}

function closeLevelUpModal() {
    document.getElementById('levelup-modal').classList.add('hidden');
    if (onLevelUpModalClose) {
        onLevelUpModalClose();
        onLevelUpModalClose = null;
    }
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

    if (rand < 50) {
        rarity = 1; // ⭐ コモン (50%)
    } else if (rand < 78) {
        rarity = 2; // ⭐⭐ アンコモン (28%)
    } else if (rand < 93) {
        rarity = 3; // ⭐⭐⭐ レア (15%)
    } else if (rand < 98) {
        rarity = 4; // ⭐⭐⭐⭐ エピック (5%)
    } else {
        rarity = 5; // ⭐⭐⭐⭐⭐ レジェンド (2%)
    }

    // 指定レアリティのアイテムからランダム選択
    // 指定レアリティのアイテムからランダム選択
    // 累計勉強時間の計算
    const totalMinutes = gameData.studyLogs.reduce((sum, log) => sum + log.minutes, 0);

    // 【10時間の壁 (600分ルール)】
    // 600分未満なら「消しゴムのカス(ID:16)」を排出リストから完全に除外する
    let itemsOfRarity = GACHA_ITEMS.filter(item => item.rarity === rarity);

    if (totalMinutes < 600) {
        itemsOfRarity = itemsOfRarity.filter(item => Number(item.id) !== 16);
        // 万が一、そのレアリティがID:16しかなくてリストが空になった場合の保険
        if (itemsOfRarity.length === 0) {
            // 他のアイテムがあればそれにする、なければポーション(ID:1)などを強制で返す
            return ITEM_MASTER.find(i => i.id === 1) || ITEM_MASTER[0];
        }
    } else {
        // 600分以上なら制限なし（ID:16も含めて抽選）
        console.log("🔓 10時間の壁突破済み: 消しゴムのカスチャンスあり");
    }

    // ⭐ 安全装置：もしそのレアリティのアイテムがまだ登録されていない場合、
    // まわした時にエラーにならないよう、ポーション(ID:1)などを返します
    if (itemsOfRarity.length === 0) {
        console.warn(`⚠️ レアリティ ${rarity} のアイテムが見つからないため、代わりにコモンを排出します`);
        return ITEM_MASTER.find(i => i.id === 1) || ITEM_MASTER[0];
    }

    const randomItem = itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)];
    return randomItem;
}

function addItemToInventory(item) {
    const currentTotal = gameData.inventory.reduce((sum, item) => sum + item.count, 0);
    if (currentTotal >= ITEM_CONFIG.maxCapacity) return false;

    const existing = gameData.inventory.find(inv => String(inv.id) === String(item.id));

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
    console.log("🎒 Inventory Updated:", JSON.parse(JSON.stringify(gameData.inventory)));
    return true;
}

function showGachaResult(item) {
    if (!item) {
        console.error("showGachaResult called with null item");
        return;
    }
    console.log("★演出開始！ showGachaResult called for item:", item);
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
    iconElement.style.backgroundPosition = style.backgroundPosition || 'center';
    iconElement.style.backgroundSize = style.backgroundSize || 'contain';
    iconElement.style.backgroundRepeat = 'no-repeat';
    iconElement.classList.add('image-sprite');
    iconElement.style.imageRendering = 'pixelated';

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
    } else if (item.isSpecialEraser || item.id === 16) {
        // 消しゴムのカス（努力の証）
        const resText = document.querySelector('.result-text-mvp');
        if (resText) resText.textContent = "努力の結晶を手に入れた！";
    } else {
        const resText = document.querySelector('.result-text-mvp');
        if (resText) resText.textContent = "獲得！";
    }

    // Switch to use "show" class
    const resultModal = document.getElementById('gacha-result');
    resultModal.classList.remove('hidden');
    resultModal.classList.add('show');

    // 演出を確実に見せるためにガチャ画面を表示する
    showScreen('gacha-screen');

    // Force visibility styles
    resultModal.style.display = 'flex';
    resultModal.style.zIndex = '30000'; // Ensure it's on top of everything

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
    console.log("Current Inventory Data:", JSON.parse(JSON.stringify(gameData.inventory))); // Debug logging

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
        try {
            const card = document.createElement('div');

            // 1. Try to find in Master Data
            const masterItem = ITEM_MASTER.find(mi => Number(mi.id) === Number(item.id));

            // 2. Fallback Logic
            let displayItem = masterItem;

            if (!displayItem) {
                console.warn(`Item ID ${item.id} not found in ITEM_MASTER. Using inventory data.`);
                displayItem = item;
            }

            // 3. Ensure essential properties exist (Prevent crash/empty display)
            const safeName = displayItem.name || `Unknown (ID:${item.id})`;
            const safeRarity = displayItem.rarity || 1;
            const safeType = displayItem.type || 'misc';
            // file is handled by getItemSpriteStyle helper, but we should ensure fallback there too if needed.

            // Construct a temporary safe display object
            const safeDisplayItem = {
                ...displayItem,
                name: safeName,
                rarity: safeRarity,
                type: safeType,
                file: displayItem.file || displayItem.name + ".png" // Fallback file name
            };

            const equipment = gameData.player.equipment || {};
            const isEquipped = Object.values(equipment).some(eq => eq && Number(eq.id) === Number(item.id));

            card.className = `item-list-card rarity-${safeRarity} ${isEquipped ? 'equipped' : ''}`;
            card.setAttribute('data-id', item.id);

            // Add click listener to show description
            card.onclick = (e) => {
                if (e.target.tagName === 'BUTTON') return;
                showItemDescription(item.id);
            };

            const style = getItemSpriteStyle(safeDisplayItem);
            // Ensure valid background image style
            const cleanBgImage = style.backgroundImage && style.backgroundImage !== "url('undefined')" ? style.backgroundImage : "none";

            const iconHtml = `<div class="card-icon-box image-sprite" style="background-image: ${cleanBgImage} !important; background-position: ${style.backgroundPosition || 'center'} !important; background-size: ${style.backgroundSize || 'contain'} !important; background-repeat: no-repeat !important; image-rendering: pixelated !important;"></div>`;

            let actionBtn = '';
            const equippableTypes = ['weapon', 'armor', 'shield', 'accessory', 'head', 'foot', 'legs'];
            if (equippableTypes.includes(safeType)) {
                const btnText = isEquipped ? 'はずす' : '装備する';
                const btnClass = isEquipped ? 'unequip' : 'equip';
                actionBtn = `<button class="item-action-btn ${btnClass}" onclick="toggleEquip(${item.id})">${btnText}</button>`;
            } else if (safeType === 'consumable' || safeType === 'infinite') {
                actionBtn = `<button class="item-action-btn use" onclick="useItem(${item.id})">つかう</button>`;
            }

            // Add Discard button
            const discardBtn = `<button class="item-action-btn discard" onclick="confirmDiscard(${item.id})">すてる</button>`;

            card.innerHTML = `
                ${iconHtml}
                <div class="card-main">
                    <div class="card-title">${safeName} ${isEquipped ? '<span class="eq-tag">(E)</span>' : ''}</div>
                    <div class="card-subtitle">${'★'.repeat(safeRarity)}</div>
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
        } catch (e) {
            console.error("Failed to render item:", item, e);
            // Optionally append a placeholder error card
        }
    });
}

function toggleEquip(itemId) {
    const item = ITEM_MASTER.find(mi => Number(mi.id) === Number(itemId));
    if (!item) return;

    let targetSlot = 'accessory';
    if (item.type === 'weapon') targetSlot = 'weapon';
    else if (item.type === 'armor') targetSlot = 'armor';
    else if (item.type === 'shield') targetSlot = 'shield';
    else if (item.type === 'head') targetSlot = 'head';
    else if (item.type === 'foot') targetSlot = 'foot';
    else if (item.type === 'legs') targetSlot = 'legs';
    else if (item.type === 'cloak') targetSlot = 'cloak';  // マント用スロット
    else if (item.type === 'accessory') targetSlot = 'accessory';

    // 全てのスロットを確認し、このアイテムがどこかに装備されていたら外す（重複防止）
    let alreadyEquippedInSlot = null;
    Object.keys(gameData.player.equipment).forEach(slotName => {
        const eq = gameData.player.equipment[slotName];
        if (eq && Number(eq.id) === Number(itemId)) {
            alreadyEquippedInSlot = slotName;
        }
    });

    if (alreadyEquippedInSlot) {
        // すでに装備されている場合は外す
        gameData.player.equipment[alreadyEquippedInSlot] = null;
        showMessageModal("", `${item.name}を外しました。`);
    } else {
        // 装備されていない場合はターゲットスロットに装備（既存の装備は上書きされる）
        gameData.player.equipment[targetSlot] = { id: item.id, name: item.name };
        const message = item.equipMessage || `${item.name}を装備した！`;
        showMessageModal("", message);
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

// Helper for Sparkle Effect
function createSparkleEffect() {
    console.log("✨ キラキラ生成開始！");

    // 主人公（player-layers-container）の位置を必死に探す
    const target = document.querySelector('.player-layers-container');
    let centerX, centerY;

    if (target && target.getBoundingClientRect().width > 0) {
        const rect = target.getBoundingClientRect();
        centerX = rect.left + rect.width / 2;
        centerY = rect.top + rect.height / 2;
    } else {
        // もし主人公が見つからなかったら、画面の真ん中で出す（保険）
        centerX = window.innerWidth / 2;
        centerY = window.innerHeight / 2;
    }

    console.log("Sparkle Center:", centerX, centerY);

    const colors = ['#FFD700', '#FF1493', '#00BFFF', '#ADFF2F', '#FF4500', '#DA70D6', '#FA8072'];

    for (let i = 0; i < 40; i++) { // 40粒に増量！
        const p = document.createElement('div');
        p.className = 'sparkle-particle';
        document.body.appendChild(p);

        p.style.left = centerX + 'px';
        p.style.top = centerY + 'px';
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 150;
        const tx = Math.cos(angle) * dist + 'px';
        const ty = Math.sin(angle) * dist + 'px';

        p.style.setProperty('--tx', tx);
        p.style.setProperty('--ty', ty);

        setTimeout(() => p.remove(), 1000);
    }
}

// Helper for Ultra Rare Effect (Holy Light)
function createUltraRareEffect() {
    console.log("🌟 EXTRAORDINARY EFFECT TRIGGERED! 🌟");

    // 1. Apply Holy Glow to character
    const characterSprite = document.querySelector('.player-sprite');
    if (characterSprite) {
        characterSprite.classList.add('holy-glow');
        setTimeout(() => characterSprite.classList.remove('holy-glow'), 1500);
    }

    // 2. Center coordinates (Reuse logic or recalculate)
    // Reuse logic slightly modified for bigger spread
    const target = document.querySelector('.player-layers-container');
    let centerX, centerY;

    if (target && target.getBoundingClientRect().width > 0) {
        const rect = target.getBoundingClientRect();
        centerX = rect.left + rect.width / 2;
        centerY = rect.top + rect.height / 2;
    } else {
        centerX = window.innerWidth / 2;
        centerY = window.innerHeight / 2;
    }

    // 3. Create Holy Ring (expanding circle)
    const ring = document.createElement('div');
    ring.className = 'holy-ring'; // We will add CSS for this
    document.body.appendChild(ring);
    ring.style.left = centerX + 'px';
    ring.style.top = centerY + 'px';
    setTimeout(() => ring.remove(), 1000);

    // 4. Large Particles (Rising up)
    const colors = ['#FFD700', '#FFFFFF', '#FFFFE0', '#FFFACD']; // Golds and Whites

    for (let i = 0; i < 50; i++) {
        const p = document.createElement('div');
        p.className = 'sparkle-particle'; // Reuse basic class
        document.body.appendChild(p);

        // Random offset near center
        p.style.left = centerX + 'px';
        p.style.top = centerY + 'px';
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.width = (Math.random() * 6 + 6) + 'px'; // Bigger: 6-12px
        p.style.height = p.style.width;
        p.style.boxShadow = "0 0 10px white"; // Glowing particles

        // Movement: Mostly UP, slightly spreading
        const angle = -Math.PI / 2 + (Math.random() - 0.5); // Upward cone
        const dist = 100 + Math.random() * 200; // Higher rise
        const tx = Math.cos(angle) * dist + 'px';
        const ty = Math.sin(angle) * dist + 'px';

        p.style.setProperty('--tx', tx);
        p.style.setProperty('--ty', ty);

        // Slower animation for majesty
        p.style.animationDuration = (1.0 + Math.random() * 1.0) + 's';

    }
}

/**
 * 静寂の耳栓エフェクト：キャラクターを完全保護（背景分離版）
 */
function applySilenceEffect() {
    console.log("🎧 静寂の耳栓エフェクト：背景分離モード発動");

    const duration = 8000;
    const charWrapper = document.querySelector('.character-wrapper');
    const homeScreen = document.getElementById('home-screen');
    const statusScreen = document.getElementById('status-screen');

    // 1. キャラクターを含まない背景レイヤーのみにblurをかける
    const bgElements = document.querySelectorAll('#time-effect-layer, #celestial-layer');
    bgElements.forEach(el => {
        el.style.transition = 'filter 1s ease-out';
        el.style.filter = 'blur(10px) saturate(40%)';
    });

    // 2. home-screen全体を暗くして静寂感を出す（blurは使わない）
    if (homeScreen) {
        homeScreen.style.transition = 'background-color 1s ease-out';
        homeScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    }

    // 2-2. status-screenも一緒に暗くする（巻物を柔らかく）
    if (statusScreen) {
        statusScreen.style.transition = 'background-color 1s ease-out';
        statusScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    }

    // 3. キャラクターを明るく強調
    if (charWrapper) {
        const charImages = charWrapper.querySelectorAll('img');
        charImages.forEach(img => {
            img.style.transition = 'filter 1s ease-out';
            img.style.filter = 'brightness(1.3) drop-shadow(0 0 15px rgba(255, 255, 255, 0.9))';
        });
        charWrapper.style.zIndex = "1000";
    }

    const msgEl = document.getElementById("characterMessage");
    if (msgEl) msgEl.textContent = "全集中...";

    // 4. 8秒後にリセット
    setTimeout(() => {
        bgElements.forEach(el => el.style.filter = '');
        if (homeScreen) {
            homeScreen.style.backgroundColor = '';
        }
        if (statusScreen) {
            statusScreen.style.backgroundColor = '';
        }
        if (charWrapper) {
            const charImages = charWrapper.querySelectorAll('img');
            charImages.forEach(img => img.style.filter = '');
            charWrapper.style.zIndex = "";
        }
        updateCharacterMessage(true);
        console.log("🎧 エフェクト終了：キャラクター完全保護成功");
    }, duration);
}


// Helper for Floating Text
function showFloatingText(text, color = '#ffd700') {
    const charWrapper = document.querySelector('.character-wrapper');
    let rect;
    if (charWrapper && charWrapper.offsetParent !== null) {
        rect = charWrapper.getBoundingClientRect();
    } else {
        rect = {
            left: window.innerWidth / 2 - 20,
            top: window.innerHeight / 2 - 20,
            width: 40,
            height: 40
        };
    }

    if (rect.width === 0) {
        rect = {
            left: window.innerWidth / 2 - 20,
            top: window.innerHeight / 2 - 20,
            width: 40,
            height: 40
        };
    }

    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    el.style.color = color;

    document.body.appendChild(el);

    // Position above character
    el.style.left = (rect.left + rect.width / 2) + 'px';
    el.style.top = (rect.top) + 'px';

    setTimeout(() => el.remove(), 1500);
}

function useItem(itemId) {
    const inventoryItem = gameData.inventory.find(i => Number(i.id) === Number(itemId));
    if (!inventoryItem || inventoryItem.count <= 0) return;

    const masterItem = ITEM_MASTER.find(mi => Number(mi.id) === Number(itemId));
    if (masterItem && (masterItem.type === 'consumable' || masterItem.type === 'infinite')) {

        // --- A. 特殊演出の実行（pendingEffectより先に実行） ---
        if (masterItem.specialEffect === 'silence') {
            applySilenceEffect();
            // 演出のために一度ホーム画面に戻すとより効果的
            showScreen('home-screen');
        }

        const message = masterItem.useMessage || `${masterItem.name}を使用した！`;
        showMessageModal("", message);

        // Reserve Effects for Home Screen
        const floatTexts = [];

        // Apply effects if any (consumables can have effects too)
        if (masterItem.effects) {
            Object.keys(masterItem.effects).forEach(stat => {
                if (gameData.player.stats[stat] !== undefined) {
                    const amount = masterItem.effects[stat];
                    gameData.player.stats[stat] += amount;

                    // Prepare Floating Text data
                    let label = stat.toUpperCase();
                    if (stat === 'intellect') label = 'INT';
                    if (stat === 'strength') label = 'STR';
                    if (stat === 'focus') label = 'FCS';

                    floatTexts.push({ text: `+${amount} ${label}`, color: '#ffd700' });
                }
            });
        }

        // Set Pending Effect Flag (CRITICAL: active must be true)
        const pendingMessage = masterItem.useMessage || masterItem.equipMessage || `${masterItem.name}を使った！`;

        gameData.pendingEffect = {
            active: true,
            rarity: masterItem.rarity || 1, // Store rarity
            // Item-specific message
            message: pendingMessage,
            floatTexts: floatTexts
        };

        // --- 強制保存とログ確認 ---
        saveGameData();
        console.log("Flag set:", gameData.pendingEffect);

        // If it was equipped, unequip it (e.g., Spirit Dress converted to infinite)
        const eq = gameData.player.equipment;
        if (eq) {
            Object.keys(eq).forEach(slot => {
                if (eq[slot] && Number(eq[slot].id) === Number(itemId)) {
                    eq[slot] = null;
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

    saveGameData(); // Save again for inventory changes (redundant but safe)
    updateInventoryScreen();
    updateHomeScreen();
}

function confirmReset() {
    showConfirmModal(
        "⚠️！注意！⚠️",
        "持っているアイテムを\nすべて消してしまいますか？\n（装備もすべて外れます）",
        () => {
            // アイテム（インベントリ）のみを空にする
            gameData.inventory = [];
            // 装備もすべて外す
            gameData.player.equipment = { weapon: null, armor: null, accessory: null, shield: null, head: null, legs: null, foot: null };

            saveGameData();
            updateInventoryScreen();
            updateHomeScreen();

            // 完了トースト
            const toast = document.createElement('div');
            toast.className = 'discard-toast';
            toast.textContent = "✨ アイテムをすべて破棄しました";
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        },
        null,
        "アイテムを消す"
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
            <div class="summary-label">今日の功績（こうせき）</div>
            <div class="summary-stats">
                <div class="summary-stat-box"><span class="label">修行時間</span><span class="value">${todayMinutes}m</span></div>
                <div class="summary-stat-box"><span class="label">経験値</span><span class="value">+${todayExp}</span></div>
                <div class="summary-stat-box"><span class="label">コイン</span><span class="value">+${todayCoins}</span></div>
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
                <button class="log-btn edit" onclick="openEditLogModal(${log.index})">かきかえる</button>
                <button class="log-btn delete" onclick="deleteLog(${log.index})">けす</button>
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
function showConfirmModal(title, content, onConfirm, onCancel = null, confirmButtonText = null, cancelButtonText = null) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const contentEl = document.getElementById('confirm-modal-content');
    const okBtn = document.getElementById('confirm-modal-ok');
    const cancelBtn = modal.querySelector('.cancel-button'); // Get existing Cancel/NO button

    if (modal && titleEl && contentEl && okBtn && cancelBtn) {
        titleEl.textContent = title;
        titleEl.style.display = title ? 'block' : 'none'; // Show if title exists, else hide
        contentEl.innerHTML = content;

        if (confirmButtonText) okBtn.textContent = confirmButtonText;
        else okBtn.textContent = "すてる"; // Default

        if (cancelButtonText) cancelBtn.textContent = cancelButtonText;
        else cancelBtn.textContent = "やめる"; // Default

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
        modal.style.zIndex = '30000'; // 🔴 モーダルよりさらに手前に
        modal.style.pointerEvents = 'auto'; // 🔴 追加：クリックを確実に受け付けるようにする
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
        "",
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
function showMessageModal(title, content, useScrollWindow = false) {
    const modal = document.getElementById('message-modal');
    const titleEl = document.getElementById('message-modal-title');
    const contentEl = document.getElementById('message-modal-content');
    const closeBtn = modal ? modal.querySelector('.ok-button') : null;

    if (modal && titleEl && contentEl) {
        titleEl.textContent = title;
        contentEl.innerHTML = content;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.zIndex = '20000';
        modal.style.pointerEvents = 'auto'; // 🔴 追加：クリックを確実に受け付けるようにする

        // 科目設定の時だけ巻物背景を適用し、CLOSEボタンを非表示
        const contentContainer = modal.querySelector('.modal-content');
        if (contentContainer) {
            if (useScrollWindow) {
                contentContainer.classList.add('rpg-scroll-window');
                contentContainer.classList.remove('rpg-window');
                // CLOSEボタンを非表示（「今はやめておく」ボタンがあるため）
                if (closeBtn) closeBtn.style.display = 'none';
            } else {
                contentContainer.classList.remove('rpg-scroll-window');
                contentContainer.classList.add('rpg-window');
                // CLOSEボタンを表示
                if (closeBtn) closeBtn.style.display = 'block';
            }
        }
    }
}

function closeMessageModal() {
    const modal = document.getElementById('message-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        modal.style.pointerEvents = 'none'; // クリックを貫通させる

        // クラスとスタイルをリセット
        const contentContainer = modal.querySelector('.modal-content');
        const closeBtn = modal.querySelector('.ok-button');
        if (contentContainer) {
            contentContainer.classList.remove('rpg-scroll-window');
            contentContainer.classList.remove('dissolve-anim'); // 演出用クラス削除
            contentContainer.classList.add('rpg-window');

            // 演出で上書きされたスタイルを強制リセット
            contentContainer.style.filter = '';
            contentContainer.style.opacity = '';
            contentContainer.style.transform = '';
        }
        // CLOSEボタンを表示状態に戻す
        if (closeBtn) closeBtn.style.display = 'block';
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
 */function updateCharacterMessage(force = false) {
    // 🔴 追加：window.isSelectingJob が true の間は、システムからの上書きを100%遮断
    if (window.isSelectingJob) {
        console.log("🛑 職業選択/チュートリアル中のため、メッセージ更新をスキップします");
        return;
    }

    const messages = [
        "きょうも すこしずつ いこう！",
        "5分 できたら だいせいこう！",
        "疲れたら いったん やすも？",
        "きょうの ぼうけん は ここから！",
        "つづけてるの えらいぞ！",
        "あせらなくて だいじょうぶ"
    ];
    const messageEl = document.getElementById("characterMessage");
    if (!messageEl) {
        console.warn("⚠️ characterMessage 要素が見つかりません");
        return;
    }

    // 現在がレベル上げイベント用のセリフでない場合、または強制リセットの場合のみ更新
    const isSpecial = ["あれ？ 卵に変化が……", "なんか最近、卵が割れそう・・・・？"].includes(messageEl.textContent);

    if (!isSpecial || force) {
        // レベルに応じた龍の噂話を追加
        const lv = gameData?.player?.level || 1;
        console.log(`🎮 現在のレベル: ${lv}`);

        // ★ Lv99：伝説のドラゴンライダー
        if (lv >= 99 && gameData.dragon.hatched) {
            // 普通のメッセージはクリアして、特別なセリフだけに絞る（確実に出すため）
            messages.length = 0;
            messages.push("風が...ボクたちを祝ってくれているみたいだね！");
            messages.push("君と共にここまで来られたこと、誇りに思うよ。");
            messages.push("この広い空のどこまでも、君と一緒に行こう！");
            console.log("✨ Lv99 ドラゴンライダー専用メッセージモード");
        }
        // ★ Lv60以上：龍がすぐ近くにいる雰囲気
        else if (lv >= 60) {
            messages.push("すぐ近くに誰かいる気がする……温かくて、優しい気配だ");
            messages.push("この光……何かボクを まもってくれてるみたい");
            messages.push("君のレベルなら、もしかしたら『あの存在』に会えるかもしれないね…");
            console.log("✨ Lv60+ 龍メッセージ追加");
        }
        // ★ Lv45以上：龍の存在がより具体的に
        else if (lv >= 45) {
            messages.push("最近、空に巨大な影が飛んでいるのを見た冒険者がいるらしい…");
            messages.push("『虹色に輝く鱗』を持つ者だけが、龍と出会えるという伝説があるんだ。");
            messages.push("この地には、勉強を頑張る人を助ける『知恵の竜』が眠っているらしいよ");
            console.log("✨ Lv45+ 龍メッセージ追加");
        }
        // ★ Lv30以上：龍の噂が聞こえ始める
        else if (lv >= 30) {
            messages.push("この地には、勉強を頑張る人を助ける『知恵の竜』が眠っているらしいよ");
            messages.push("たまに 空に ふしぎな形の雲が 流れていくんだ");
            messages.push("古い書物に『試練を乗り越えし者に、龍は姿を現す』って書いてあったよ。");
            console.log("✨ Lv30+ 龍メッセージ追加");
        }

        console.log(`📝 メッセージ候補数: ${messages.length}`);
        const randomIndex = Math.floor(Math.random() * messages.length);
        const selectedMessage = messages[randomIndex];
        messageEl.textContent = selectedMessage;

        // 🎤 天の声：コンソールに主人公のセリフを表示
        console.log(`💬 主人公のセリフ: "${selectedMessage}"`);
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

// ========================================
// 演出：魔法の粉となって出発
// ========================================
window.executeDisintegrateEffect = function () {
    const scroll = document.querySelector('.rpg-scroll-window');
    if (!scroll) return closeMessageModal();

    const rect = scroll.getBoundingClientRect();

    // 1. 巻物を消滅させる（CSSクラス追加）
    scroll.classList.add('dissolve-anim');

    // 2. 粒子（魔法の粉）を大量発生
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
        setTimeout(() => createMagicDust(rect), i * 8);
    }

    // 3. 演出が終わる頃に画面を閉じて、主人公を喜ばせる
    setTimeout(() => {
        closeMessageModal();

        // 背景の主人公がジャンプ
        const charWrapper = document.querySelector('.character-wrapper');
        if (charWrapper) {
            charWrapper.animate([
                { transform: 'translateX(-50%) translateY(0)' },
                { transform: 'translateX(-50%) translateY(-60px)' },
                { transform: 'translateX(-50%) translateY(0)' }
            ], { duration: 500, easing: 'cubic-bezier(0.18, 0.89, 0.32, 1.28)' });
        }
    }, 850);
};

function createMagicDust(rect) {
    const el = document.createElement('div');
    el.className = 'magic-particle';
    const startX = rect.left + Math.random() * rect.width;
    const startY = rect.top + Math.random() * rect.height;

    el.style.left = startX + 'px';
    el.style.top = startY + 'px';
    document.body.appendChild(el);

    const destX = startX + (Math.random() - 0.5) * 200;
    const destY = startY - 300 - Math.random() * 200;

    el.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${destX - startX}px, ${destY - startY}px) scale(0)`, opacity: 0 }
    ], {
        duration: 800 + Math.random() * 800,
        easing: 'ease-out'
    }).onfinish = () => el.remove();
}

// ========================================
// 🛠️ デバッグ・演出テスト用コマンド
// ========================================

/**
 * リザルト画面をテスト表示する
 * window.testResult('EXRANK', 120, true)  // EXランク完遂
 * window.testResult('SRANK', 60, false)  // Sランク中断
 */
window.testResult = function (rank, minutes, isComplete) {
    const pool = MONSTER_MASTER[rank || 'F-ERANK'] || MONSTER_MASTER['F-ERANK'];
    gameData.activeQuest = {
        rank: rank || 'F-ERANK',
        monster: pool[0],
        targetMinutes: minutes || 60,
        currentDamage: 0
    };
    showQuestResult(minutes || 60, isComplete);
};

/**
 * 指定ランクのモンスターを出現させる
 * window.testMonster('EXRANK')
 */
window.testMonster = function (rank) {
    const pool = MONSTER_MASTER[rank || 'F-ERANK'] || MONSTER_MASTER['F-ERANK'];

    // テスト用に修行時間をセット
    gameData.dailySession = {
        targetMinutes: 60,
        remainingSeconds: 60 * 60,
        isCompleted: false
    };

    gameData.activeQuest = {
        rank: rank || 'F-ERANK',
        monster: pool[0],
        targetMinutes: 100,
        currentDamage: 0
    };

    showScreen('study-screen');
    updateMonsterUI();
    console.log(`👾 ${rank} モンスター出現テスト開始（砂時計はEXランクのみ表示されます）`);
};

/**
 * 経験値を一気に増やしてレベルアップを確認する
 * window.addExp(5000)
 */
window.addExp = function (amount) {
    const oldLevel = gameData.player.level;
    gameData.player.exp += amount;
    checkLevelUp(oldLevel);
    saveGameData();
    updateHomeScreen();
    console.log(`✨ EXP +${amount} 加算完了`);
};

// ========================================
// 🛠️ タイマー修復（レスキュー）システム
// ========================================

/**
 * 1. ユーザーに確認を求める（ボタンから呼び出す）
 */
window.confirmRepair = function () {
    console.log("🔮 修復確認モーダルを呼び出します");

    // 既存の confirm-modal を利用
    showConfirmModal(
        "🔮 時の修復儀式",
        "時の魔法が　みだれていますか？<br>タイマーを　初期状態にもどします。<br>（これまでの経験値は　消えません）",
        () => {
            // 「はい（OK）」を押した時の処理
            executeTimerRepair();
        },
        null, // 「やめる」の時は何もしない
        "修復する", // OKボタンのテキスト
        "やめる"    // キャンセルボタンのテキスト
    );
};

/**
 * 2. 実際の修復処理
 */
function executeTimerRepair() {
    console.log("🛠️ タイマー修復を実行中...");

    // 進行中のタイマーを物理的に止める
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // データの不整合をクリア（安全な初期値へ）
    gameData.timer = { isRunning: false, startTime: null, pausedAt: null };
    gameData.dailySession = {
        targetMinutes: 0,
        startTime: null,
        pausedTime: null,
        elapsedAtPause: 0,
        isCompleted: false
    };
    gameData.activeQuest = null;

    // 保存
    saveGameData();

    // UIをリセット
    renderTimer(0);
    updateStudyScreenUI();

    // 演出
    createSparkleEffect();

    // 完了報告
    showMessageModal("✨ 修復完了", "時の魔法を　かけなおしました！<br>もういちど　試練に挑んでみてください。");
}
// ========================================
// 報酬受け取りボタンのスペシャルアニメーション
// ========================================

function setupVictoryButton() {
    const button = document.getElementById('victory-receive-btn');

    button.addEventListener('click', function (e) {
        // ボタンを押せないようにする
        if (button.classList.contains('clicked')) return;

        // クリック演出開始
        button.classList.add('clicked');
        button.textContent = '✨ 受け取り中... ✨';

        // スペシャルアニメーション開始
        startCelebrationAnimation();

        // 1.5秒後に実際の処理を実行
        setTimeout(() => {
            receiveRewards();
            closeVictoryScreen();
        }, 1500);
    });
}

// ========================================
// 祝福アニメーションの生成
// ========================================

function startCelebrationAnimation() {
    // 祝福エフェクトコンテナを作成
    const celebration = document.createElement('div');
    celebration.className = 'victory-celebration active';
    document.body.appendChild(celebration);

    // 1. レインボーフラッシュ
    createRainbowFlash(celebration);

    // 2. 成功メッセージ
    createSuccessMessage(celebration);

    // 3. 光の波（3回）
    setTimeout(() => createLightWave(celebration), 0);
    setTimeout(() => createLightWave(celebration), 300);
    setTimeout(() => createLightWave(celebration), 600);

    // 4. 花火（複数）
    for (let i = 0; i < 8; i++) {
        setTimeout(() => createFirework(celebration), i * 150);
    }

    // 5. 紙吹雪（大量）
    for (let i = 0; i < 50; i++) {
        setTimeout(() => createConfetti(celebration), i * 30);
    }

    // 6. キラキラ星
    for (let i = 0; i < 20; i++) {
        setTimeout(() => createSparkle(celebration), i * 80);
    }

    // 20秒後に完全にクリーンアップ（余韻を最長に）
    setTimeout(() => {
        celebration.remove();
    }, 20000);
}
window.startCelebrationAnimation = startCelebrationAnimation;

// レインボーフラッシュ
function createRainbowFlash(container) {
    const flash = document.createElement('div');
    flash.className = 'rainbow-flash active';
    container.appendChild(flash);

    setTimeout(() => {
        flash.classList.remove('active');
    }, 1500);
}

// 成功メッセージ
function createSuccessMessage(container) {
    const message = document.createElement('div');
    message.className = 'success-message';
    message.textContent = ' GET! ';
    container.appendChild(message);
}

// 光の波
function createLightWave(container) {
    const wave = document.createElement('div');
    wave.className = 'light-wave';
    container.appendChild(wave);

    setTimeout(() => wave.remove(), 1500);
}

// 花火
function createFirework(container) {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight * 0.6;

    // 花火の中心
    const center = document.createElement('div');
    center.style.position = 'absolute';
    center.style.left = x + 'px';
    center.style.top = y + 'px';
    container.appendChild(center);

    // 花火の粒子（30個）
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181'];
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'firework';

        const angle = (Math.PI * 2 * i) / 30;
        const distance = 50 + Math.random() * 100;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;

        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.animationDelay = Math.random() * 0.2 + 's';

        center.appendChild(particle);
    }

    setTimeout(() => center.remove(), 1000);
}

// 紙吹雪
function createConfetti(container) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';

    const x = Math.random() * window.innerWidth;
    confetti.style.left = x + 'px';
    confetti.style.top = '-10px';

    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#A8E6CF'];
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = Math.random() * 0.5 + 's';
    confetti.style.animationDuration = (12 + Math.random() * 8) + 's'; // 12〜20秒かけて超ゆっくり落下

    container.appendChild(confetti);

    setTimeout(() => confetti.remove(), 20000); // 20秒間生存
}

// キラキラ星
function createSparkle(container) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.textContent = '✨';

    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    sparkle.style.left = x + 'px';
    sparkle.style.top = y + 'px';
    sparkle.style.animationDelay = Math.random() * 0.5 + 's';

    container.appendChild(sparkle);

    setTimeout(() => sparkle.remove(), 5000); // キラキラを5秒間残す
}
