-- 安全な RLS 再有効化スクリプト
-- 他のアプリ（備品管理等）との互換性を保ちつつ、認証済みユーザーにのみアクセスを許可します。

-- 1. RLS を再有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. 既存の競合する可能性のあるポリシーを削除
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin and Manager can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;

-- 3. 「認証済みユーザーなら誰でも全プロフィールの参照が可能」という緩やかなポリシーを設定
-- これにより、他のアプリからの参照エラーを回避しつつ、外部（未ログイン）からのアクセスは防ぎます。
CREATE POLICY "Authenticated users can read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- 4. 自分のプロフィールは自分で更新可能（他のアプリの動作も保証）
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 5. 【管理者用】他の人のプロフィールも更新・追加が必要な場合は以下も検討
-- CREATE POLICY "Admins can manage all profiles" ON public.profiles
--   FOR ALL TO authenticated USING (
--     EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND dm_role = 'Admin')
--   );
