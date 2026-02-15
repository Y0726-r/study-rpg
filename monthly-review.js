// ========================================
// 🎊 月次総評システム (30日継続達成)
// ========================================

/**
 * 月次総評データを生成して表示する
 */
window.generateAndShowMonthlyReview = function () {
    console.log('🎊 月次総評を生成します...');

    // 現在の年月をキーとして使用 (例: "2026-02")
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // カレンダー月ベースでデータを集計
    const reviewData = calculateMonthlyReviewData(monthKey);

    // 🆕 月次総評データを保存（アーカイブ）
    saveMonthlyReviewToArchive(reviewData);

    // 画面に反映
    populateMonthlyReviewScreen(reviewData);

    // モーダルを表示
    const modal = document.getElementById('monthly-review-screen');
    if (modal) {
        modal.classList.remove('hidden');

        // キラキラエフェクト
        if (typeof createSparkleEffect === 'function') {
            createSparkleEffect();
        }

        console.log('✨ 月次総評画面を表示しました', reviewData);
    }
};

/**
 * 過去N日分の学習データを集計
 * @param {number} days - 集計する日数
 * @returns {Object} 集計データ
 */
/**
 * 特定の月（または過去N日分）の学習データを集計
 * @param {number|string} target - 集計する日数または "YYYY-MM" 形式の文字列
 * @returns {Object} 集計データ
 */
function calculateMonthlyReviewData(target) {
    const now = new Date();
    let startDate, endDate;

    if (typeof target === 'string' && target.includes('-')) {
        // "YYYY-MM" 形式の場合
        const [year, month] = target.split('-').map(Number);
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59); // 月末

        // もし現在時刻がその月の中なら、endDateを現在時刻にする（リアルタイム反映のため）
        if (now >= startDate && now <= endDate) {
            endDate = now;
        }
    } else {
        // デフォルトは過去30日
        const days = typeof target === 'number' ? target : 30;
        endDate = now;
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);
    }

    // 期間内のログをフィルタリング
    const periodLogs = gameData.studyLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= startDate && logDate <= endDate;
    });

    // 総学習時間
    const totalMinutes = periodLogs.reduce((sum, log) => sum + log.minutes, 0);

    // 総セッション数
    const totalSessions = periodLogs.length;

    // 科目別の学習時間
    const subjectStats = {};
    periodLogs.forEach(log => {
        if (!subjectStats[log.subject]) {
            subjectStats[log.subject] = 0;
        }
        subjectStats[log.subject] += log.minutes;
    });

    // 獲得コイン・経験値の合計
    const totalCoins = periodLogs.reduce((sum, log) => sum + (log.coins || log.minutes), 0);
    const totalExp = periodLogs.reduce((sum, log) => sum + (log.exp || log.minutes * 10), 0);

    // 🆕 グラフ用データ（日ごとのレベル推移）の生成
    const dailyData = [];
    const logsAfter = gameData.studyLogs.filter(log => new Date(log.date) > endDate);
    const expAfter = logsAfter.reduce((sum, log) => sum + (log.exp || log.minutes * 10), 0);
    let runningExp = gameData.player.exp - expAfter; // 集計終了時点の累計EXP

    // 期間内のログを日付ごとに集計
    const dayMap = {};
    periodLogs.forEach(log => {
        const d = new Date(log.date);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        if (!dayMap[key]) dayMap[key] = 0;
        dayMap[key] += (log.exp || log.minutes * 10);
    });

    // 開始日から終了日までの各日のEXPとレベルを算出（後ろから逆算）
    const dayCount = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    let tempExp = runningExp;

    for (let i = dayCount - 1; i >= 0; i--) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

        const level = getLevelFromExpValue(tempExp);
        dailyData.push({
            date: d,
            exp: tempExp,
            level: level,
            label: `${d.getMonth() + 1}/${d.getDate()}`
        });

        // 前の日のEXPに戻る
        tempExp -= (dayMap[key] || 0);
    }
    dailyData.reverse(); // 時系列順に直す

    const startLevel = dailyData.length > 0 ? dailyData[0].level : gameData.player.level;
    const currentLevel = dailyData.length > 0 ? dailyData[dailyData.length - 1].level : gameData.player.level;

    return {
        totalMinutes,
        totalSessions,
        totalCoins,
        totalExp,
        subjectStats,
        completedChapters: getCompletedChapters(),
        startLevel,
        currentLevel,
        startDate: startDate.toLocaleDateString('ja-JP'),
        endDate: endDate.toLocaleDateString('ja-JP'),
        dailyData,
        monthKey: typeof target === 'string' ? target : null
    };
}

/**
 * 累計経験値からレベルを算出する（script.jsのLEVEL_TABLEを使用）
 */
function getLevelFromExpValue(exp) {
    if (typeof LEVEL_TABLE === 'undefined' || Object.keys(LEVEL_TABLE).length === 0) return 1;
    let level = 1;
    for (let l = 2; l <= 99; l++) {
        if (exp >= LEVEL_TABLE[l]) {
            level = l;
        } else {
            break;
        }
    }
    return level;
}

/**
 * 完了した試練を取得
 */
function getCompletedChapters() {
    const chapters = [];
    if (gameData.chapters) {
        Object.values(gameData.chapters).forEach(chapter => {
            if (chapter.progress >= 1) {
                chapters.push({
                    name: chapter.name,
                    boss: chapter.boss,
                    rank: chapter.bossRank
                });
            }
        });
    }
    return chapters;
}

/**
 * 月次総評画面にデータを反映
 * @param {Object} data - 集計データ
 */
function populateMonthlyReviewScreen(data) {
    // 総学習時間
    const hours = Math.floor(data.totalMinutes / 60);
    const minutes = data.totalMinutes % 60;
    const timeEl = document.getElementById('review-total-time');
    if (timeEl) timeEl.textContent = `${hours}時間${minutes}分`;

    // セッション数
    const sessionsEl = document.getElementById('review-total-sessions');
    if (sessionsEl) sessionsEl.textContent = `${data.totalSessions}回`;

    // コイン
    const coinsEl = document.getElementById('review-total-coins');
    if (coinsEl) coinsEl.textContent = data.totalCoins;

    // 経験値
    const expEl = document.getElementById('review-total-exp');
    if (expEl) expEl.textContent = data.totalExp;

    // 達成した試練
    const achievementsList = document.getElementById('review-achievements-list');
    if (achievementsList) {
        if (data.completedChapters.length > 0) {
            achievementsList.innerHTML = data.completedChapters.map(chapter => `
                <div class="achievement-item">
                    <span class="achievement-rank">${chapter.rank}</span>
                    <span class="achievement-boss">${chapter.boss}</span>
                    <span class="achievement-chapter">(${chapter.name})</span>
                </div>
            `).join('');
        } else {
            achievementsList.innerHTML = '<p class="empty-message">まだ試練を達成していません</p>';
        }
    }

    // 科目別統計（バーグラフ）
    const subjectBars = document.getElementById('review-subjects-bars');
    if (subjectBars) {
        const statsEntries = Object.entries(data.subjectStats);
        if (statsEntries.length > 0) {
            const maxMinutes = Math.max(...Object.values(data.subjectStats), 1);
            subjectBars.innerHTML = statsEntries.map(([subject, minutes]) => {
                const percentage = (minutes / maxMinutes) * 100;
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;

                return `
                    <div class="subject-bar-item">
                        <div class="subject-bar-label">${subject}</div>
                        <div class="subject-bar-container">
                            <div class="subject-bar-fill" style="width: ${percentage}%"></div>
                        </div>
                        <div class="subject-bar-value">${hours}h ${mins}m</div>
                    </div>
                `;
            }).join('');
        } else {
            subjectBars.innerHTML = '<p class="empty-message">期間中の学習記録がありません</p>';
        }
    }

    // 成長の軌跡グラフの描画
    // 🆕 モーダルが表示されてから描画されるよう、少し遅延させる
    setTimeout(() => {
        renderGrowthChart(data.dailyData);
    }, 100);

    // 成長の軌跡テキスト
    const startLevelEl = document.getElementById('review-start-level');
    const currentLevelEl = document.getElementById('review-current-level');
    const growthEl = document.getElementById('review-level-growth');

    if (startLevelEl) startLevelEl.textContent = `Lv.${data.startLevel}`;
    if (currentLevelEl) currentLevelEl.textContent = `Lv.${data.currentLevel}`;
    if (growthEl) growthEl.textContent = `+${data.currentLevel - data.startLevel}`;

    // キャラクターのコメント
    const messages = [
        '「この1ヶ月、本当によく頑張ったね！着実な成長がグラフにも表れているよ！」',
        '「1ヶ月間の努力が、こんなに素晴らしい成果になったよ！このまま突き進もう！」',
        '「継続は力なり...まさに君のことだね！これからも一緒に伝説を作ろう！」',
        '「見て、この成長曲線！君の努力が形になってる。本当に尊敬するよ！」',
        '「この1ヶ月で、君は確実に強くなったね。次の1ヶ月も、また一緒に冒険しよう！」'
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const messageEl = document.getElementById('review-character-message');
    if (messageEl) messageEl.textContent = randomMessage;
}

/**
 * 成長グラフ (SVG) を描画
 * @param {Array} dailyData - 日ごとのデータ
 */
function renderGrowthChart(dailyData) {
    const container = document.getElementById('review-growth-chart');
    if (!container) return;

    if (!dailyData || dailyData.length === 0) {
        container.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#8b6f47; font-size:12px;">データがありません</div>';
        return;
    }

    // 🆕 1点しかない場合はグラフにならないので、2点に増幅するか専用の表示にする
    let displayData = [...dailyData];
    if (displayData.length === 1) {
        const d = displayData[0];
        displayData = [
            { ...d, label: '' },
            d
        ];
    }

    const width = container.clientWidth || 400; // 取得できない場合のフォールバック
    const height = container.clientHeight || 140;
    const padding = { top: 15, right: 15, bottom: 25, left: 35 };
    const chartWidth = Math.max(width - padding.left - padding.right, 100);
    const chartHeight = Math.max(height - padding.top - padding.bottom, 50);

    // レベルの最小・最大値
    const minLevel = Math.min(...displayData.map(d => d.level));
    const maxLevel = Math.max(...displayData.map(d => d.level));
    const yMin = Math.max(1, minLevel - 1);
    const yMax = maxLevel + 1;
    const yRange = yMax - yMin;

    // SVG生成
    let svg = `<svg viewBox="0 0 ${width} ${height}" class="growth-chart-svg" xmlns="http://www.w3.org/2000/svg">`;

    // 1. 横軸グリッド・ラベル
    const xStep = chartWidth / (displayData.length - 1);
    displayData.forEach((d, i) => {
        const x = padding.left + i * xStep;
        if (i === 0 || i === displayData.length - 1 || i % 5 === 0) {
            svg += `<text x="${x}" y="${height - 5}" class="chart-label-x">${d.label}</text>`;
            svg += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" class="chart-grid-line" />`;
        }
    });

    // 2. 縦軸グリッド・ラベル
    const yLevels = [yMin, Math.floor((yMin + yMax) / 2), yMax];
    yLevels.forEach(lv => {
        const y = padding.top + chartHeight - ((lv - yMin) / yRange * chartHeight);
        svg += `<text x="${padding.left - 5}" y="${y + 3}" class="chart-label-y">Lv.${lv}</text>`;
        svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid-line" />`;
    });

    // 3. 塗りつぶしエリア
    let areaPath = `M ${padding.left} ${height - padding.bottom} `;
    displayData.forEach((d, i) => {
        const x = padding.left + i * xStep;
        const y = padding.top + chartHeight - ((d.level - yMin) / yRange * chartHeight);
        areaPath += `L ${x} ${y} `;
    });
    areaPath += `L ${padding.left + chartWidth} ${height - padding.bottom} Z`;
    svg += `<path d="${areaPath}" class="chart-area" />`;

    // 4. 折れ線
    let linePath = "";
    displayData.forEach((d, i) => {
        const x = padding.left + i * xStep;
        const y = padding.top + chartHeight - ((d.level - yMin) / yRange * chartHeight);
        linePath += (i === 0 ? "M" : "L") + ` ${x} ${y} `;
    });
    svg += `<path d="${linePath}" class="chart-line" />`;

    // 5. データポイント
    displayData.forEach((d, i) => {
        const isLevelUp = i > 0 && d.level > displayData[i - 1].level;
        if (displayData.length <= 10 || isLevelUp || i === 0 || i === displayData.length - 1) {
            const x = padding.left + i * xStep;
            const y = padding.top + chartHeight - ((d.level - yMin) / yRange * chartHeight);
            svg += `<circle cx="${x}" cy="${y}" r="3" class="chart-point" />`;
        }
    });

    svg += `</svg>`;
    container.innerHTML = svg;
}

/**
 * 月次総評画面を閉じる
 */
window.closeMonthlyReview = function () {
    const modal = document.getElementById('monthly-review-screen');
    if (modal) {
        modal.classList.add('hidden');
        console.log('✅ 月次総評画面を閉じました');
    }
};

// ========================================
// 📚 月次総評アーカイブ機能
// ========================================

/**
 * 月次総評データをアーカイブに保存
 * @param {Object} reviewData - 総評データ
 */
function saveMonthlyReviewToArchive(reviewData) {
    // 現在の年月をキーとして使用 (例: "2026-02")
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // gameDataに月次総評を保存
    if (!gameData.monthlyReviews) {
        gameData.monthlyReviews = {};
    }

    gameData.monthlyReviews[monthKey] = {
        ...reviewData,
        savedAt: now.toISOString(),
        monthKey: monthKey,
        displayName: `${now.getFullYear()}年${now.getMonth() + 1}月`
    };

    // ローカルストレージに保存
    if (typeof saveGameData === 'function') {
        saveGameData();
    }

    console.log(`📚 月次総評を保存しました: ${monthKey}`, gameData.monthlyReviews[monthKey]);
}

/**
 * 月次総評アーカイブ画面を表示
 */
window.showMonthlyReviewArchive = function () {
    const archiveModal = document.getElementById('monthly-review-archive');
    if (!archiveModal) {
        console.error('❌ 月次総評アーカイブ画面が見つかりません');
        return;
    }

    // アーカイブリストを生成
    populateArchiveList();

    // モーダルを表示
    archiveModal.classList.remove('hidden');
    console.log('📚 月次総評アーカイブを表示しました');
};

/**
 * アーカイブリストを生成
 */
function populateArchiveList() {
    const listContainer = document.getElementById('archive-list-container');
    if (!listContainer) return;

    const reviews = gameData.monthlyReviews || {};
    const monthKeys = Object.keys(reviews).sort().reverse(); // 新しい順

    if (monthKeys.length === 0) {
        listContainer.innerHTML = '<p class="empty-message">まだ月次総評の記録がありません</p>';
        return;
    }

    listContainer.innerHTML = monthKeys.map(monthKey => {
        const review = reviews[monthKey];
        const hours = Math.floor(review.totalMinutes / 60);
        const minutes = review.totalMinutes % 60;

        return `
            <div class="archive-item" onclick="showMonthlyReviewDetail('${monthKey}')">
                <div class="archive-month">${review.displayName}</div>
                <div class="archive-stats">
                    <span class="archive-stat">⏱️ ${hours}h ${minutes}m</span>
                    <span class="archive-stat">📚 ${review.totalSessions}回</span>
                    <span class="archive-stat">Lv.${review.startLevel} → Lv.${review.currentLevel}</span>
                </div>
                <div class="archive-arrow">▶</div>
            </div>
        `;
    }).join('');
}

/**
 * 特定の月の詳細を表示
 * @param {string} monthKey - 月のキー (例: "2026-02")
 */
window.showMonthlyReviewDetail = function (monthKey) {
    // 🆕 常に最新の計算データ（グラフ用データ含む）を使用するように変更
    const review = calculateMonthlyReviewData(monthKey);

    // 表示用の名称をアーカイブから取得、なければ生成
    const savedReview = (gameData.monthlyReviews && gameData.monthlyReviews[monthKey]) ? gameData.monthlyReviews[monthKey] : null;
    const displayName = savedReview ? savedReview.displayName : monthKey.replace('-', '年') + '月';

    // アーカイブ画面を閉じる
    const archiveModal = document.getElementById('monthly-review-archive');
    if (archiveModal) {
        archiveModal.classList.add('hidden');
    }

    // 詳細データを画面に反映
    populateMonthlyReviewScreen(review);

    // タイトルを変更（過去の記録であることを明示）
    const titleEl = document.querySelector('.review-title');
    if (titleEl) {
        titleEl.textContent = `📜 ${displayName}の修行記録 📜`;
    }

    // 月次総評画面を表示
    const modal = document.getElementById('monthly-review-screen');
    if (modal) {
        modal.classList.remove('hidden');

        // 🆕 アーカイブから開いた場合は「もどる」ボタンを表示
        const backBtn = document.getElementById('review-back-to-archive-btn');
        if (backBtn) backBtn.style.display = 'block';
    }

    console.log(`📖 月次総評詳細を表示: ${monthKey}`, review);
};

/**
 * 詳細画面からアーカイブリストに戻る
 */
window.backToArchiveList = function () {
    // 詳細画面を隠す
    const modal = document.getElementById('monthly-review-screen');
    if (modal) modal.classList.add('hidden');

    // 一覧画面を再表示
    showMonthlyReviewArchive();
};

/**
 * 月次総評画面を閉じるときは、念のため「もどる」ボタンを非表示にリセット
 */
const originalCloseMonthlyReview = window.closeMonthlyReview;
window.closeMonthlyReview = function () {
    if (originalCloseMonthlyReview) originalCloseMonthlyReview();

    const backBtn = document.getElementById('review-back-to-archive-btn');
    if (backBtn) backBtn.style.display = 'none';
};

/**
 * 月次総評アーカイブ画面を閉じる
 */
window.closeMonthlyReviewArchive = function () {
    const modal = document.getElementById('monthly-review-archive');
    if (modal) {
        modal.classList.add('hidden');
        console.log('✅ 月次総評アーカイブを閉じました');
    }
};

// ========================================
// 🔧 30日達成時に自動的に月次総評を表示
// ========================================

// DOMContentLoaded後に実行
document.addEventListener('DOMContentLoaded', () => {
    // 元のshowLoginStreakMessage関数を保存
    const originalShowLoginStreakMessage = window.showLoginStreakMessage;

    // 拡張版で上書き
    window.showLoginStreakMessage = function (streak) {
        // 元の処理を実行
        if (originalShowLoginStreakMessage) {
            originalShowLoginStreakMessage(streak);
        }

        // 30日達成時（または30の倍数）は月次総評を表示
        if (streak === 30 || (streak > 30 && streak % 30 === 0)) {
            setTimeout(() => {
                generateAndShowMonthlyReview();
            }, 2500); // ログインボーナスモーダルを閉じた後に表示
        }
    };


    console.log('✅ 月次総評システムを初期化しました');

    // 🆕 過去のログからアーカイブを自動復元（サイレント実行）
    if (window.syncArchiveFromTotalLogs) {
        // 第1引数をtrueにするとアラートを出さない設定にします（後で修正）
        syncArchiveFromTotalLogs(true);
    }
});

// ========================================
// 🧪 テスト用関数（開発者向け）
// ========================================

/**
 * 月次総評画面を強制的に表示（テスト用）
 */
window.testMonthlyReview = function () {
    console.log('🧪 テスト: 月次総評画面を表示します');
    generateAndShowMonthlyReview();
};

/**
 * ダミーのアーカイブデータを生成（テスト用）
 */
window.createTestArchiveData = function () {
    console.log('🧪 テスト: ダミーのアーカイブデータを生成します');
    const months = ['2026-01', '2025-12', '2025-11'];

    if (!gameData.monthlyReviews) gameData.monthlyReviews = {};

    months.forEach((key, index) => {
        gameData.monthlyReviews[key] = {
            totalMinutes: 1200 - (index * 200),
            totalSessions: 40 - (index * 5),
            totalCoins: 5000 - (index * 1000),
            totalExp: 10000 - (index * 2000),
            subjectStats: { '資格': 500, '語学': 300, 'ビジネス': 400 },
            completedChapters: [{ name: '序章', boss: '刻蝕のヒトガタ', rank: 'F-ERANK' }],
            startLevel: 5 - index,
            currentLevel: 10 - index,
            startDate: '2025/01/01',
            endDate: '2025/01/31',
            monthKey: key,
            displayName: key.replace('-', '年') + '月'
        };
    });

    saveGameData();
    console.log('✅ ダミーデータを保存しました。ログ画面のアーカイブボタンから確認してください。');
};

/**
 * 過去のすべての学習ログをスキャンして、アーカイブを再構築する
 * (新機能導入前の記録をアーカイブに反映させるためのツール)
 * @param {boolean} silent - アラートを表示しない場合はtrue
 */
window.syncArchiveFromTotalLogs = function (silent = false) {
    if (!silent) console.log('🔄 過去のログからアーカイブを再構築しています...');

    if (!gameData.studyLogs || gameData.studyLogs.length === 0) {
        if (!silent) console.warn('⚠️ 学習ログが空のため、再構築を中止しました');
        return;
    }

    // ログを年月ごとにグループ化
    const monthlyGroups = {};
    gameData.studyLogs.forEach(log => {
        const date = new Date(log.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyGroups[key]) monthlyGroups[key] = [];
        monthlyGroups[key].push(log);
    });

    if (!gameData.monthlyReviews) gameData.monthlyReviews = {};

    let count = 0;
    Object.keys(monthlyGroups).forEach(key => {
        // すでに存在する場合はスキップ（上書きしたい場合はここを調整）
        if (gameData.monthlyReviews[key]) return;

        const logs = monthlyGroups[key];
        const [year, month] = key.split('-');

        // 統計計算
        const totalMinutes = logs.reduce((sum, log) => sum + log.minutes, 0);
        const totalSessions = logs.length;
        const totalCoins = logs.reduce((sum, log) => sum + (log.coins || log.minutes), 0);
        const totalExp = logs.reduce((sum, log) => sum + (log.exp || log.minutes * 10), 0);

        const subjectStats = {};
        logs.forEach(l => {
            if (!subjectStats[l.subject]) subjectStats[l.subject] = 0;
            subjectStats[l.subject] += l.minutes;
        });

        // アーカイブデータの作成
        gameData.monthlyReviews[key] = {
            totalMinutes,
            totalSessions,
            totalCoins,
            totalExp,
            subjectStats,
            completedChapters: [], // 過去の完了状況の特定は難しいため空
            startLevel: 1, // 推定
            currentLevel: gameData.player.level,
            startDate: `${year}/${month}/01`,
            endDate: `${year}/${month}/31`, // 簡易
            monthKey: key,
            displayName: `${year}年${parseInt(month)}月`,
            savedAt: new Date().toISOString()
        };
        count++;
    });

    if (count > 0) {
        saveGameData();
        if (!silent) {
            console.log(`✅ 再構築完了: ${count}ヶ月分の記録をアーカイブに追加しました`);
            alert(`${count}ヶ月分の過去の記録を「冒険の全記録」に追加しました！`);
        } else {
            console.log(`✅ 自動同期完了: ${count}ヶ月分の記録をアーカイブに追加しました`);
        }
    } else {
        if (!silent) {
            console.log('ℹ️ すべての月の記録はすでにアーカイブされています');
            alert('過去の記録はすべて反映済みです！');
        }
    }
};

console.log('💡 月次総評テスト: testMonthlyReview() / syncArchiveFromTotalLogs() が使用可能です');

