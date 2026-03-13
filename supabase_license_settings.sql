-- システム設定管理テーブルの作成
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS有効化
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "Allow public read system_settings" ON public.system_settings
    FOR SELECT TO authenticated USING (true);

-- 管理者・マネージャー・エディターのみ更新可能
CREATE POLICY "Allow staff to update system_settings" ON public.system_settings
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND dm_role IN ('Admin', 'Manager', 'Editor')
        )
    );

-- 初期データの投入（ライセンス数 80）
INSERT INTO public.system_settings (key, value)
VALUES ('license_pool', '{"total": 80}')
ON CONFLICT (key) DO NOTHING;
