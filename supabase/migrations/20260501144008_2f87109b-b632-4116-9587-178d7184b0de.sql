
ALTER TABLE public.forum_threads DROP CONSTRAINT IF EXISTS forum_threads_author_id_fkey;
ALTER TABLE public.forum_replies DROP CONSTRAINT IF EXISTS forum_replies_author_id_fkey;
ALTER TABLE public.forum_likes DROP CONSTRAINT IF EXISTS forum_likes_user_id_fkey;
