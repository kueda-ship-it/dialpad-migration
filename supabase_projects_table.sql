-- 案件情報を Supabase で管理するためのテーブル作成スクリプト
-- 現在 localStorage に保存されているデータをクラウドで永続化します。

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  unit_id TEXT NOT NULL, -- 号機
  name TEXT NOT NULL,    -- 物件名/住所
  phone_number TEXT,     -- 電話番号
  line_type TEXT,        -- 回線タイプ
  maintenance_month TEXT, -- メンテ月
  status TEXT DEFAULT '対応予定', -- ステータス
  support_date DATE,     -- 対応日
  master_update_done BOOLEAN DEFAULT false, -- マスタ更新済み
  notes TEXT,            -- 備考
  created_by UUID REFERENCES auth.users(id) -- 作成者
);

-- RLS 有効化
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 全ての認証済みユーザーが参照可能（他アプリとの兼ね合いを考慮した緩やかな設定）
CREATE POLICY "Authenticated users can read projects" ON public.projects
  FOR SELECT TO authenticated USING (true);

-- 管理者・マネージャー・エディターのみ追加・更新可能
CREATE POLICY "Staff can manage projects" ON public.projects
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND dm_role IN ('Admin', 'Manager', 'Editor')
    )
  );

-- インデックス作成（検索・ソート高速化）
CREATE INDEX IF NOT EXISTS idx_projects_support_date ON public.projects(support_date);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_unit_id ON public.projects(unit_id);
