// デバッグ用：LocalStorageの内容を確認するスクリプト
// ブラウザのコンソールで以下を実行してください：

console.log("=== StudyQuest Debug Info ===");
console.log("1. gameData:", JSON.parse(localStorage.getItem('studyquest_gamedata')));
console.log("\n2. Grand Boss Info:");
const data = JSON.parse(localStorage.getItem('studyquest_gamedata'));
if (data && data.grandBoss) {
    console.log("  - Boss Name:", data.grandBoss.monster.name);
    console.log("  - Target Minutes:", data.grandBoss.targetMinutes);
    console.log("  - Current Damage:", data.grandBoss.currentDamage);
    console.log("  - Progress:", Math.floor((data.grandBoss.currentDamage / data.grandBoss.targetMinutes) * 100) + "%");
}
console.log("\n3. Daily Session Info:");
if (data && data.dailySession) {
    console.log("  - Subject:", data.dailySession.subjectLabel);
    console.log("  - Target Minutes:", data.dailySession.targetMinutes);
    console.log("  - Start Time:", new Date(data.dailySession.startTime));
    console.log("  - Elapsed at Pause:", data.dailySession.elapsedAtPause);
}
console.log("\n4. Study Logs (last 5):");
if (data && data.studyLogs) {
    console.log(data.studyLogs.slice(-5));
}
