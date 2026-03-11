-- ============================================================
-- Profiles テーブル更新 & 自動登録トリガー & Admin RLS ポリシー
-- ============================================================
-- このスクリプトをSupabase SQL Editorで実行してください。

-- 1. email カラムの追加（存在しない場合）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. 既存ユーザーの email を auth.users から補完
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 3. 自動登録トリガーの更新（email 含む）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, dm_role, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    CASE 
      WHEN new.email LIKE '%ueda%' OR new.email = 'k_ueda@fts.co.jp' THEN 'Admin'
      WHEN new.email LIKE '%admin%' THEN 'Admin'
      WHEN new.email LIKE '%manager%' THEN 'Manager'
      ELSE 'View'
    END,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー再作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. RLS ポリシー: 認証済みユーザーは全profiles参照可能
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin and Manager can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- SELECT: 認証済みなら全員参照可能
CREATE POLICY "Authenticated users can read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- UPDATE: 自分自身 OR Admin
CREATE POLICY "Users can update own or admin all" ON public.profiles
  FOR UPDATE TO authenticated USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND dm_role = 'Admin')
  );

-- INSERT: Adminのみ（手動追加用）+ トリガー (SECURITY DEFINER)
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND dm_role = 'Admin')
  );

-- 確認
SELECT id, email, full_name, dm_role, avatar_url FROM public.profiles ORDER BY full_name;
