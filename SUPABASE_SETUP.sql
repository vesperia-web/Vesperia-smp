-- СКОПИРУЙ ЭТОТ КОД И ВСТАВЬ В SUPABASE SQL EDITOR
-- Это исправит ошибку, когда пишет, что ты "замьючен"

-- 1. Разрешаем создание тем всем авторизованным пользователям
create policy "Enable insert for authenticated users only" 
on public.topics for insert 
to authenticated 
with check (true);

-- 2. Разрешаем отвечать в темах
create policy "Enable insert for posts for authenticated users" 
on public.posts for insert 
to authenticated 
with check (true);

-- 3. Разрешаем удалять свои посты
create policy "Enable delete for users based on user_id" 
on public.posts for delete 
to authenticated 
using (auth.uid() = author_id);

-- 4. Разрешаем добавление картинок в галерею
create policy "Enable insert for gallery" 
on public.gallery for insert 
to authenticated 
with check (true);

-- 5. Разрешаем удалять картинки из галереи (всем авторизованным, или добавьте проверку на админа)
create policy "Enable delete for gallery" 
on public.gallery for delete 
to authenticated 
using (true);

-- Нажмите RUN в SQL Editor, чтобы применить!