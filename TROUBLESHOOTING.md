# 🔧 トラブルシューティング

## よくある問題と解決方法

### 🖼️ 画像が表示されない

**現在の仕様**
このアプリは**絵文字**を使用しています。画像ファイルは不要です。

- キャラクター：🧙（魔法使い絵文字）
- 宝箱：🎁（プレゼント絵文字）
- 背景：CSSグラデーション

**もしドット絵を追加したい場合**

1. ドット絵画像を作成（または入手）
2. `assets/`フォルダを作成
3. 画像を保存：
   ```
   assets/
   ├── character.png
   └── chest.png
   ```
4. `style-retro.css`を編集：
   ```css
   .character-sprite::before {
       content: '';
       background: url('assets/character.png');
   }
   ```

---

### 💾 データが消える

**原因**
LocalStorageを使用しているため、以下の操作でデータが消えます：
- ブラウザのキャッシュクリア
- シークレットモード使用
- 異なるブラウザでアクセス

**対策**
1. データリセット前に確認アラートあり
2. 重要な記録はスクリーンショット推奨
3. 将来的にデータエクスポート機能を追加予定

---

### 📱 スマホで動かない

**チェックリスト**
- [ ] JavaScript が有効になっているか
- [ ] 最新のブラウザを使用しているか
- [ ] キャッシュをクリアしてリロード
- [ ] プライベートモードを試す

**推奨ブラウザ**
- iOS: Safari（最新版）
- Android: Chrome（最新版）

---

### ⏱️ タイマーが止まらない

**対処法**
1. ページをリロード
2. ブラウザのタブを閉じて再度開く
3. それでも解決しない場合、データリセット

---

### 🎰 ガチャが引けない

**確認事項**
- コインが100以上あるか確認
- コイン表示が正しく更新されているか
- ページをリロードしてみる

---

### 🔄 GitHub Pagesが更新されない

**解決方法**
1. GitHubリポジトリで最新のコミットを確認
2. Settings > Pages で再度保存
3. 5-10分待つ（反映に時間がかかる）
4. ブラウザのキャッシュをクリア：
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

---

### 🐛 バグを見つけた

**報告方法**
1. GitHubのIssuesタブを開く
2. 「New issue」をクリック
3. 以下を記載：
   - バグの詳細
   - 再現手順
   - 使用環境（ブラウザ、OS）
   - スクリーンショット（あれば）

---

### 💻 ローカルで開発する

**ローカルサーバーを起動**
```bash
# Pythonの場合
python -m http.server 8000

# Node.jsの場合
npx http-server

# VS Codeの場合
Live Server拡張機能を使用
```

**ホットリロードしたい**
- VS Codeの「Live Server」拡張機能推奨
- ファイル保存時に自動リロード

---

### 🎨 カスタマイズしたい

**色を変更**
`style-retro.css`で検索＆置換：
- `#87CEEB` → 空の色
- `#90EE90` → 草原の色
- `#f9ca8c` → ボタンの色

**ゲームバランス調整**
`script.js`の変数を変更：
```javascript
// 報酬の調整
const earnedExp = minutes * 10;  // 1分あたりのEXP
const earnedCoins = minutes * 5; // 1分あたりのコイン

// レベルテーブル
const LEVEL_TABLE = { ... };
```

---

### 📞 その他の質問

**サポート**
- GitHub Issues で質問
- README.mdを確認
- SETUP.mdで詳細手順を確認

---

## 🔗 参考リンク

- [GitHub Pages ドキュメント](https://docs.github.com/pages)
- [Git 基本コマンド](https://git-scm.com/docs)
- [LocalStorage 解説](https://developer.mozilla.org/ja/docs/Web/API/Window/localStorage)
