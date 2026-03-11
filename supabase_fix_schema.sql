-- column "dm_role" does not exist エラーを修正するためのスクリプト
-- profiles テーブルに dm_role がない場合に追加、または既存の Role カラムを整合させます。

DO $$ 
BEGIN
    -- profiles テーブルが存在することを確認
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        
        -- dm_role カラムがない場合に追加
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'dm_role') THEN
            ALTER TABLE public.profiles ADD COLUMN dm_role TEXT CHECK (dm_role IN ('Admin', 'Manager', 'Editor', 'View')) DEFAULT 'View';
            
            -- もし eq_role からデータを移行したい場合は以下を有効にしてください
            -- UPDATE public.profiles SET dm_role = eq_role;
        END IF;

    ELSE
        -- テーブル自体がない場合は新規作成（前回のスクリプトと同様）
        CREATE TABLE public.profiles (
          id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
          updated_at TIMESTAMP WITH TIME ZONE,
          full_name TEXT,
          avatar_url TEXT,
          dm_role TEXT CHECK (dm_role IN ('Admin', 'Manager', 'Editor', 'View')) DEFAULT 'View'
        );
    END IF;
END $$;

-- RLS 再設定（存在しない場合のみ）
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile') THEN
        CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admin and Manager can view all profiles') THEN
        CREATE POLICY "Admin and Manager can view all profiles" ON public.profiles FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND dm_role IN ('Admin', 'Manager'))
        );
    END IF;
END $$;
