# 📚 StudyQuest - 勉強RPG

勉強時間を記録してキャラクターを成長させる、レトロRPG風の勉強モチベーションアプリです。

![StudyQuest](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎮 特徴

- **勉強タイマー**: 勉強時間を計測して自動でEXPとコインを獲得
- **レベルシステム**: 経験値を貯めてレベルアップ
- **ガチャシステム**: コインでアイテムをゲット（★1〜★3のレアリティ）
- **インベントリ**: 獲得したアイテムをコレクション
- **勉強ログ**: 過去の勉強記録を確認
- **レトロRPG風デザイン**: ドット絵風のUI

## 🚀 デモ

[こちらからプレイ](https://あなたのGitHubユーザー名.github.io/study-rpg/)

※GitHub Pagesで公開後、URLを更新してください

## 📖 使い方

### オンラインで使う
1. [デモページ](https://あなたのGitHubユーザー名.github.io/study-rpg/)にアクセス
2. ブラウザで直接プレイ

### ローカルで使う
1. このリポジトリをクローン
```bash
git clone https://github.com/あなたのユーザー名/study-rpg.git
cd study-rpg
```

2. `index.html`をブラウザで開く
```bash
# Windowsの場合
start index.html

# macOSの場合
open index.html

# Linuxの場合
xdg-open index.html
```

3. または、ローカルサーバーを起動
```bash
# Pythonがインストールされている場合
python -m http.server 8000

# ブラウザで http://localhost:8000 を開く
```

## 🎯 ゲームの流れ

1. **勉強する** → 勉強タイマーで時間を計測
2. **報酬ゲット** → 1分ごとに10 EXP + 5コイン
3. **レベルアップ** → 経験値が貯まると自動でレベルアップ
4. **ガチャを引く** → 100コインでアイテムゲット
5. **コレクション** → メニューで獲得アイテムを確認

## ⚙️ ゲームバランス

- **1分勉強** = 10 EXP + 5コイン
- **レベル上限**: 10
- **ガチャ1回**: 100コイン
- **レアリティ**: ★1(60%), ★2(30%), ★3(10%)
- **アイテム数**: 全12種類

## 🛠️ 技術スタック

- **HTML5**: 構造
- **CSS3**: レトロRPG風デザイン
- **Vanilla JavaScript**: ゲームロジック
- **LocalStorage**: データ保存（サーバー不要）

## 📁 ファイル構成

```
study-rpg/
├── index.html           # メインHTML
├── style-retro.css      # レトロRPG風スタイル
├── script.js            # ゲームロジック
├── README.md            # このファイル
├── LICENSE              # ライセンス
└── assets/              # 画像フォルダ（オプション）
    ├── characters/
    ├── items/
    ├── ui/
    └── backgrounds/
```

## 🎨 カスタマイズ

### 色を変更
`style-retro.css`の色を変更することで、簡単にテーマをカスタマイズできます。

### ゲームバランスを調整
`script.js`の以下の変数を変更：
- `LEVEL_TABLE`: レベルアップに必要なEXP
- `GACHA_ITEMS`: ガチャで出るアイテム
- 報酬計算（`saveStudySession`関数内）

## 📱 対応デバイス

- ✅ デスクトップ（Windows, macOS, Linux）
- ✅ スマートフォン（iOS, Android）
- ✅ タブレット

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を説明してください。

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを開く

## 📝 ライセンス

このプロジェクトは[MIT License](LICENSE)の下でライセンスされています。

## 👤 作者

あなたの名前 - [@あなたのTwitter](https://twitter.com/あなたのTwitter)

プロジェクトリンク: [https://github.com/あなたのユーザー名/study-rpg](https://github.com/あなたのユーザー名/study-rpg)

## 🙏 謝辞

- ドット絵の雰囲気は懐かしのRPGゲームからインスピレーションを得ています
- アイコンには絵文字を使用しています

## 📊 今後の予定

- [ ] バトルシステムの追加
- [ ] 目標設定機能
- [ ] デイリークエスト
- [ ] BGM・効果音
- [ ] データのクラウド同期
- [ ] 複数キャラクター
- [ ] PWA化（オフライン対応）

---

⭐️ このプロジェクトが気に入ったら、スターをつけてください！
