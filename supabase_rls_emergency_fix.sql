-- ============================================================
-- 緊急RLS修正スクリプト（他アプリ互換性維持）
-- ============================================================
-- 問題：前回の変更で他アプリのprofilesアクセスがブロックされた
-- 原因：「FOR ALL」ポリシーがAdmin以外の全操作を制限してしまった
-- 解決：各操作（SELECT/INSERT/UPDATE）を個別に安全に設定

-- 1. 問題を起こしたポリシーを削除
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own or admin all" ON public.profiles;

-- 2. SELECT: 認証済みユーザーなら誰でも全profiles参照OK（他アプリも含む）
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
CREATE POLICY "Authenticated users can read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- 3. UPDATE: 自分自身のプロフィールは誰でも更新可能
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 4. INSERT: サービスロール（トリガー）経由のみ許可
--    手動追加が必要な場合は service_role key を使うか、
--    以下のAdmin用ポリシーを有効化してください：
-- CREATE POLICY "Admin insert profiles" ON public.profiles
--   FOR INSERT TO authenticated
--   WITH CHECK (
--     EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND dm_role = 'Admin')
--   );

-- 5. 確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies WHERE tablename = 'profiles';
