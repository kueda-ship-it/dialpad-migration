# Project Memory - dialpad-migration-manager

## プロジェクト概要
Dialpadの移行管理ツール。物件（ロッカー）ごとの通信工事移行状況を管理する。
Vite + React + Supabase (PostgreSQL) を利用。

## 技術スタック
- **Frontend**: React 19, Vite 7 (SWC), Tailwind CSS v4 (@tailwindcss/vite)
- **Database**: Supabase (`projects` テーブル, unit_id が表示上の号機ID)
- **UI Libraries**: Lucide-React, Recharts, Framer Motion, React-Leaflet
- **CSS**: `@import "tailwindcss"` + `@theme` block

## 重要な実装知識
- `border-left` on `<tr>` は効かない → `box-shadow: inset 3px 0 0 color` を使う
- motion.tr の `layout` prop は重い → 削除してパフォーマンス改善
- MapContainer には必ず `style={{ height: '100%' }}` + 親に固定高さが必要
- **Framer Motion stagger バグ**: `motion.tbody` の key を `tbodyAnimKey` にすることで、個別フィールド更新時のstagger再実行を防止。

## UI設計こだわり
- **Real-time Sync**: `projects` テーブルへの `postgres_changes` 購読を追加。`INSERT` (重複チェック付き), `UPDATE` (正規化付き), `DELETE` を個別処理。
- **UUID マッチング**: DB更新時は UUID (`id`) を主キーとして使用し、`unit_id` 変更による不整合を防止。
- **正規化ロジック**: `status = '対応済' AND support_date > CURRENT_DATE` は `'対応予定'` に自動変換。
- **ヘッダー配置**: `.header-content-inner` に `width: 100%` を設定し、アクティブユーザーを右端に配置。

### AppContext.jsx
- `formatProject` 内でフロントエンド側も正規化: `isFuture && status === '対応済'` → `'対応予定'` に変換。
- DB と画面が常に整合性を保つ二重チェックを実装。

### ProjectList.jsx
- **ステータス自動遷移**: 未来日付設定時に「対応予定」へ自動変更する `handleSupportDateChange` を実装。
- **Ultra Rich Header**: `.th-label-rich` による高品位なヘッダーデザイン。

### Supabase 設定 (Realtime)
- `projects` テーブルを `supabase_realtime` パブリケーションに追加。
- `ALTER TABLE projects REPLICA IDENTITY FULL;` を実行し、全カラムの変更通知を有効化。