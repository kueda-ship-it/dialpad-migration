# dialpad-migration — Claude への指示

このリポジトリで Claude（Local Claude Code / Cowork / 他環境）が作業するときの規約。
ユーザー: k_ueda（dragonball.gokou-rose@au.com / 業務: k_ueda@fts.co.jp）

## 1. 最初にやること（セッション開始時、必ず）

```bash
if [ ! -d "Obsidian Vault" ]; then
  git clone https://github.com/kueda-ship-it/obsidian-vault.git "Obsidian Vault"
else
  (cd "Obsidian Vault" && git pull)
fi
```

clone 後、必ず:

- `Obsidian Vault/CLAUDE.md`
- `Obsidian Vault/00_Meta/嗜好まとめ.md`
- `Obsidian Vault/Projects/dialpad-migration/README.md`
- `Obsidian Vault/Projects/dialpad-migration/Mistakes/`
- `Obsidian Vault/30_Knowledge/2026-05-18_過去ミスから抽出した最優先ルール.md`

## 2. このプロジェクトの Vault 投入先

| 種類 | パス |
|------|------|
| ミスログ | `Obsidian Vault/Projects/dialpad-migration/Mistakes/YYYY-MM-DD_<topic>.md` |
| ADR | `Obsidian Vault/Projects/dialpad-migration/Decisions/YYYY-MM-DD_<topic>.md` |
| ノウハウ | `Obsidian Vault/Projects/dialpad-migration/Knowledge/<topic>.md` |
| セッション | `Obsidian Vault/Projects/dialpad-migration/Sessions/YYYY-MM-DD_<topic>.md` |
| 日次ログ（横断） | `Obsidian Vault/50_Daily/YYYY/MM/YYYY-MM-DD.md` |

書き込み後は Vault repo に commit + push:
```bash
(cd "Obsidian Vault" && git add -A && git commit -m "<種別>: <topic>" && git push)
```

## 3. 既知の地雷（dialpad-migration 固有）

- 🟡 **色変更タスクで一部のみ修正**: メインボード左右の段々の片方だけ変更した前例。
  → 「全体フラット化」「全体に〜」のような **広域変更**は、左右・上下の対称構造を **grep で全件確認**してから完了とする

## 4. プロジェクト横断の最優先 TOP 4 ルール

1. 🔴 **「ダメ」を 2 回連続で受けたらコード読むまでデプロイ禁止**
2. 🟡 **UI 修正指示は「対象 / 属性 / 期待値」を 1 行復唱してから着手**
3. 🟡 **バッジは `inline-flex + height:28px + icon 12px` をデフォ適用**
4. 🟡 **「Ctrl+Shift+R / unregister」を完了報告に書かない**

## 5. Magic Phrases（強制トリガー）

| フレーズ | 動作 |
|---------|------|
| 「失敗として記録」「ミスに残」 | `Projects/dialpad-migration/Mistakes/` に作成 + push |
| 「ADR にして」「決定を残」 | `Projects/dialpad-migration/Decisions/` に作成 + push |
| 「今日のまとめ」「デイリー更新」 | `50_Daily/YYYY/MM/YYYY-MM-DD.md` 更新 + push |
| 「知識に昇格」「Knowledge に」 | `Knowledge/<topic>.md` 作成/更新 + push |
| 「Vault に同期」「push して」 | Vault の commit + push を強制実行 |
| 「過去のミス」「Vault 検索」 | Vault 内を Glob/Grep で検索して要約 |

## 6. その他の規約

- ソートは **作成日降順** で固定、更新で並び替えない
- 一覧カードは `display: grid` + `gridTemplateColumns` で列固定
- 書き込み系は **必ずタイムアウト付き**（通常 15 秒）
- 応答は簡潔、コードコメントは原則書かない（非自明な WHY のみ）

---

正本は `Obsidian Vault/CLAUDE.md` および `00_Meta/嗜好まとめ.md`。
