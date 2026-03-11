# Project Memory - dialpad-migration-manager

## プロジェクト概要
Dialpadの移行管理ツール。物件（ロッカー）ごとの通信工事移行状況を管理する。
Vite + React + Supabase (PostgreSQL) を利用。

## 技術スタック
- **Frontend**: React 19, Vite 7 (SWC), Tailwind CSS v4 (@tailwindcss/vite)
- **Database**: Supabase (`projects` テーブル, unit_id が表示上の号機ID)
- **UI Libraries**: Lucide-React, Recharts, Framer Motion, React-Leaflet
- **CSS**: `@import "tailwindcss"` + `@theme` block (tailwind.config.js不要)
- **Auth**: Azure AD SSO (Supabase auth)

## ファイル構成（主要）
```
src/
  components/
    Dashboard.jsx      - 統計カード + 月別棒/折れ線 + 達成率パイチャート
    ProjectList.jsx    - 案件テーブル (CRUD) + Create/Edit/Detail モーダル
    CalendarView.jsx   - スケジュールカレンダー + 詳細モーダル
    MapView.jsx        - Leaflet マップ + Nominatim ジオコーディングボタン
    RouteFinder.jsx    - 最近傍法ルート計算 + スケジューリング
  context/
    AppContext.jsx     - projects state, CRUD functions, licenseCount
  index.css            - カスタムCSS (glass-card, stat-card, etc.)
```

## Supabase `projects` テーブル主要カラム
- `id` (uuid) - 内部ID
- `unit_id` (text) - 表示上の号機ID (フロントで `project.id` として扱う)
- `name` (text) - 物件名
- `phone_number` (text) - 電話番号 (フロントで `project.phone`)
- `line_type` (text) - 通信タイプ
- `locker_type` (text) - ロッカー型番 (notes から `Locker:\s*([^\n\r]+)` で抽出済み)
- `maintenance_month` (text) - メンテ月 (カンマ区切り)
- `status` (text) - 対応済/対応予定/未対応/リスケ
- `support_date` (date) - 対応日
- `master_update_done` (boolean) - マスタ更新済みフラグ
- `address` (text) - 住所 (notes から `Address:\s*([^\n\r]+)` で抽出・クリーニング済み)
- `notes` (text) - 備考 (元データ。address/locker_type は ここから抽出)
- `lat` (DOUBLE PRECISION) - 緯度 (Nominatim ジオコーディングで取得)
- `lng` (DOUBLE PRECISION) - 経度 (Nominatim ジオコーディングで取得)

## システムカラー定数 (STATUS_COLORS)
```js
done:       '#10b981'  // エメラルドグリーン (対応済)
planned:    '#f59e0b'  // アンバー (対応予定)
pending:    '#64748b'  // スレート (未対応)
total:      '#3b82f6'  // プライマリブルー (全体)
reschedule: '#ef4444'  // レッド (リスケ)
```

## 重要な実装知識
- `border-left` on `<tr>` は効かない → `box-shadow: inset 3px 0 0 color` を使う
- motion.tr の `layout` prop は重い → 削除してパフォーマンス改善
- MapContainer には必ず `style={{ height: '100%' }}` + 親に固定高さが必要
- ESLint: `icon: Icon` パターンでJSX使用時にno-unused-vars発生 → `node: <Icon />` パターンに変更
- ESLint: named export + default export の同居 → `// eslint-disable-next-line react-refresh/only-export-components`
- PieChart 0時スタート: `startAngle={90} endAngle={-270}`
- **Framer Motion stagger バグ**: `motion.tbody` の key を `tbodyAnimKey = \`${filteredProjects.length}-${searchTerm}-${statusFilter}-${masterFilter}\`` にすることで、個別フィールド更新（master_update_done等）時のstagger再実行を防止

## UI設計こだわり (premium-ui skill)
- single color禁止 → linear-gradient必須
- glass-morphism: `backdrop-filter: blur()`
- 複数 box-shadow で depth表現
- Google Fonts (Outfit, Inter)
- 全インタラクション 0.2s-0.4s transition
- Lucide React SVG アイコン使用、絵文字禁止

## 既知の課題・制約
- lat/lng は初期状態で空。MapView の「住所から座標を自動取得」ボタンで Nominatim API を叩いて一括取得する（1件/秒）
- licenseCount は localStorage に保存 (`dm_license_count` キー)
- RouteFinder は lat/lng がある物件のみルート計算可能
- Google Maps API を使いたい場合は `VITE_GOOGLE_MAPS_API_KEY` を `.env` に設定し、TileLayer/ライブラリを切り替える

## 最終更新 (2026-03-09) — Session 4

### SQL マイグレーション (fix_future_date_status)
- `status = '対応済' AND support_date > CURRENT_DATE` → `'対応予定'` に一括更新（対応済ポカ修正）

### AppContext.jsx
- `fetchProjects` 内でフロントエンド側も正規化: `isFuture && status === '対応済'` → `'対応予定'` に変換
- DB と画面が常に整合性を保つ二重チェック

### CalendarView.jsx
- 外側ラッパー: `space-y-8` → flexbox `gap: '48px'` でヘッダー〜カレンダー間隔を拡大
- Legend に `marginTop: '-32px'` を追加して過剰な余白を圧縮
- **Detail モーダル**: `FileCheck`, `Settings2` アイコンをインポート追加
  - ロッカー型番（`sp.locker_type` 条件付き）を追加
  - マスタ更新（完了/未完了 色分け）を追加

### index.css
- `.th-label` フォントサイズ: `10px` → `12px`（ヘッダー行テキストを大きく）
- `.th-label` 文字色: `rgba(255,255,255,0.28)` → `0.35`（視認性向上）
- `thead tr` 背景グラデーション強化
- `thead th { min-height: 68px }` 追加

### ProjectList.jsx
- sticky header `marginBottom`: `28px` → `40px`（検索バー〜テーブル余白拡大）
- sticky header `paddingBottom`: `16px` → `20px`

### MapView.jsx（全面刷新）
- **ジオコーディング API 変更**: Nominatim → **国土地理院 API**（日本政府・無料・APIキー不要・日本住所精度大幅向上）
  - フォールバック: 国土地理院（短縮住所） → Nominatim
  - レート制限緩和: 1100ms → 300ms（GSI API は制限が緩い）
- **対応予定ピン**: amber（橙）色を追加。対応済=緑、対応予定=橙、それ以外=赤
- **凡例更新**: 3色（対応済/対応予定/未対応・リスケ）に変更
- `makeIcon` ヘルパー関数で DRY 化

## 最終更新 (2026-03-09) — Session 3

### Supabase マイグレーション (fix_address_locker_type_and_add_coords)
- `address` カラム: `notes` の `"Address: 住所\nLocker: 型番"` から住所のみクリーン抽出
- `locker_type` カラム: 同 notes から `Locker:` 以降を抽出
- 既存レコード: `support_date > CURRENT_DATE AND status = '未対応'` → `'対応予定'` に一括更新
- `lat DOUBLE PRECISION`, `lng DOUBLE PRECISION` カラム追加

### AppContext.jsx
- `fetchProjects` の data mapping に `lat: p.lat ?? null, lng: p.lng ?? null` 追加

### Dashboard.jsx
- 外側ラッパー: `space-y-12` → flexbox `gap: '56px'` でタイトルと統計カード間の余白拡大
- `<header>` に `paddingBottom: '8px'` 追加

### ProjectList.jsx
- **マスタ更新レスポンス改善**: `tbodyAnimKey` を filter 状態のみに依存させ、個別フィールド更新時のstagger再実行を防止
- **ヘッダー行**: `px-5 py-5` → `px-6 py-7` で縦幅拡大
- **Detail モーダル**: `locker_type` 行を `Settings2` アイコン付きで追加

### MapView.jsx (全面刷新)
- Nominatim (OpenStreetMap) ジオコーディング実装: 住所→座標変換、APIキー不要、無料
- バッチ処理: `handleGeocode` で住所ありかつ lat/lng なし の物件を1件/秒で処理
- 進捗表示: `{done}/{total} <物件名>` をボタン内にリアルタイム表示
- 完了後: 成功/失敗件数を表示
- ポップアップ: `locker_type` を表示
- ピンなし時: ジオコーディングボタンの使い方を案内

## 更新履歴 (過去セッション)
### Session 1-2 (2026-03-09)
- Supabase 接続、projects テーブル初期設計
- Dashboard, ProjectList, CalendarView, MapView, RouteFinder 各コンポーネント作成
- ProjectList: Edit/Detail ボタン分離、号機(unit_id)編集可能、Create Node モーダル
- RouteFinder: 最近傍アルゴリズム + プレミアムUI
- CalendarView: 詳細モーダルの順序修正 (号機→物件名)
- ライセンス数入力 (右下固定) + 残ライセンス表示
t e s t  
 