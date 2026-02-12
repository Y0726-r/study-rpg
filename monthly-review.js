// ========================================
// 🎊 月次総評システム (30日継続達成)
// ========================================

/**
 * 月次総評データを生成して表示する
 */
window.generateAndShowMonthlyReview = function () {
    console.log('🎊 30日継続達成！月次総評を生成します...');

    // 過去30日分のデータを集計
    const reviewData = calculateMonthlyReviewData(30);

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
function calculateMonthlyReviewData(days) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    // 期間内のログをフィルタリング
    const periodLogs = gameData.studyLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= startDate && logDate <= now;
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

    // 獲得コイン・経験値の推定（ログに記録されていない場合）
    const totalCoins = periodLogs.reduce((sum, log) => sum + (log.coins || log.minutes), 0);
    const totalExp = periodLogs.reduce((sum, log) => sum + (log.exp || log.minutes * 10), 0);

    // 達成した章（完了したボス）
    const completedChapters = [];
    if (gameData.chapters) {
        Object.values(gameData.chapters).forEach(chapter => {
            if (chapter.progress >= 1) {
                completedChapters.push({
                    name: chapter.name,
                    boss: chapter.boss,
                    rank: chapter.bossRank
                });
            }
        });
    }

    // 開始時のレベル（推定）
    const currentLevel = gameData.player.level;
    const estimatedStartLevel = Math.max(1, currentLevel - Math.floor(totalExp / 1000));

    return {
        totalMinutes,
        totalSessions,
        totalCoins,
        totalExp,
        subjectStats,
        completedChapters,
        startLevel: estimatedStartLevel,
        currentLevel,
        startDate: startDate.toLocaleDateString('ja-JP'),
        endDate: now.toLocaleDateString('ja-JP')
    };
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
        const maxMinutes = Math.max(...Object.values(data.subjectStats), 1);

        subjectBars.innerHTML = Object.entries(data.subjectStats).map(([subject, minutes]) => {
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
    }

    // 成長の軌跡
    const startLevelEl = document.getElementById('review-start-level');
    const currentLevelEl = document.getElementById('review-current-level');
    const growthEl = document.getElementById('review-level-growth');

    if (startLevelEl) startLevelEl.textContent = `Lv.${data.startLevel}`;
    if (currentLevelEl) currentLevelEl.textContent = `Lv.${data.currentLevel}`;
    if (growthEl) growthEl.textContent = `+${data.currentLevel - data.startLevel}`;

    // キャラクターのコメント
    const messages = [
        '「30日間、本当によく頑張ったね！この調子で一緒に成長していこう！」',
        '「1ヶ月間の努力が、こんなに素晴らしい成果になったよ！誇りに思っていいよ！」',
        '「継続は力なり...まさに君のことだね！これからも一緒に頑張ろう！」',
        '「30日間休まず続けるなんて、本当にすごいよ！君の努力を尊敬するよ！」',
        '「この1ヶ月で、君は確実に成長したね！次の30日も一緒に冒険しよう！」'
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const messageEl = document.getElementById('review-character-message');
    if (messageEl) messageEl.textContent = randomMessage;
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
    const review = gameData.monthlyReviews[monthKey];
    if (!review) {
        console.error(`❌ 月次総評が見つかりません: ${monthKey}`);
        return;
    }

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
        titleEl.textContent = `📜 ${review.displayName}の修行記録 📜`;
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

