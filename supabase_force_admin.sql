-- 上田様のメールアドレスを Admin に更新
-- k_ueda@fts.co.jp の dm_role を強制的に Admin に書き換えます。

UPDATE public.profiles 
SET dm_role = 'Admin' 
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'k_ueda@fts.co.jp'
);

-- 確認用クエリ
-- SELECT p.full_name, p.dm_role, u.email 
-- FROM public.profiles p 
-- JOIN auth.users u ON p.id = u.id 
-- WHERE u.email = 'k_ueda@fts.co.jp';
