-- ============================================================
-- 0. Типы данных
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('manager', 'executor');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('new', 'in_progress', 'on_review', 'accepted', 'rework');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 1. Профили пользователей
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'executor',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Безопасная функция для получения роли (обходит RLS, предотвращает рекурсию)
CREATE OR REPLACE FUNCTION public.get_user_role(target_user_id uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = target_user_id;
$$;

CREATE POLICY "profiles: read own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles: read all for managers" ON public.profiles FOR SELECT USING (public.get_user_role(auth.uid()) = 'manager');
CREATE POLICY "profiles: update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Триггер автозаполнения профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', new.email), 'executor');
  RETURN new;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 2. Объекты (стройки)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "objects: managers full access" ON public.objects FOR ALL USING (public.get_user_role(auth.uid()) = 'manager') WITH CHECK (public.get_user_role(auth.uid()) = 'manager');
CREATE POLICY "objects: executors read assigned" ON public.objects FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.object_id = objects.id AND t.assignee_id = auth.uid())
);

-- ============================================================
-- 3. Задачи
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'new',
  assignee_id uuid REFERENCES public.profiles(id),
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks: managers full access" ON public.tasks FOR ALL USING (public.get_user_role(auth.uid()) = 'manager') WITH CHECK (public.get_user_role(auth.uid()) = 'manager');
CREATE POLICY "tasks: executors read own" ON public.tasks FOR SELECT USING (assignee_id = auth.uid());
CREATE POLICY "tasks: executors update own" ON public.tasks FOR UPDATE USING (assignee_id = auth.uid());

-- Триггер обновления timestamp (без дублирования истории!)
CREATE OR REPLACE FUNCTION public.tasks_update_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS tasks_before_update ON public.tasks;
CREATE TRIGGER tasks_before_update BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_update_timestamp();

-- ============================================================
-- 4. История статусов
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  from_status task_status,
  to_status task_status NOT NULL,
  changed_by uuid NOT NULL REFERENCES public.profiles(id),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_history: read if can see task" ON public.task_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_history.task_id AND (t.assignee_id = auth.uid() OR public.get_user_role(auth.uid()) = 'manager'))
);
CREATE POLICY "task_history: no direct insert" ON public.task_history FOR INSERT WITH CHECK (false);
CREATE POLICY "task_history: no direct update" ON public.task_history FOR UPDATE USING (false);
CREATE POLICY "task_history: no direct delete" ON public.task_history FOR DELETE USING (false);

-- ============================================================
-- 5. Функция смены статуса (валидация переходов)
-- ============================================================
CREATE OR REPLACE FUNCTION public.change_task_status(
  p_task_id uuid,
  p_new_status task_status,
  p_comment text DEFAULT null
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_task record;
  v_user record;
  v_old_status task_status;
  v_allowed boolean := false;
BEGIN
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
  SELECT * INTO v_user FROM public.profiles WHERE id = auth.uid();

  IF NOT FOUND THEN RAISE EXCEPTION 'Задача не найдена'; END IF;
  IF v_user.id IS NULL THEN RAISE EXCEPTION 'Пользователь не найден'; END IF;

  v_old_status := v_task.status;
  IF v_old_status = p_new_status THEN
    RETURN jsonb_build_object('ok', true, 'message', 'Статус не изменился');
  END IF;

  CASE v_old_status
    WHEN 'new' THEN
      IF p_new_status = 'in_progress' AND v_task.assignee_id = v_user.id AND v_user.role = 'executor' THEN v_allowed := true; END IF;
    WHEN 'in_progress' THEN
      IF p_new_status = 'on_review' AND v_task.assignee_id = v_user.id AND v_user.role = 'executor' THEN v_allowed := true; END IF;
    WHEN 'on_review' THEN
      IF p_new_status IN ('accepted', 'rework') AND v_user.role = 'manager' THEN v_allowed := true; END IF;
      IF p_new_status = 'rework' AND (p_comment IS NULL OR trim(p_comment) = '') THEN
        RAISE EXCEPTION 'При переводе на доработку комментарий обязателен';
      END IF;
    WHEN 'rework' THEN
      IF p_new_status = 'in_progress' AND v_task.assignee_id = v_user.id AND v_user.role = 'executor' THEN v_allowed := true; END IF;
    WHEN 'accepted' THEN
      v_allowed := false;
  END CASE;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Недопустимый переход статуса "%" → "%" для роли "%"', v_old_status, p_new_status, v_user.role;
  END IF;

  UPDATE public.tasks SET status = p_new_status, updated_at = now() WHERE id = p_task_id;

  INSERT INTO public.task_history (task_id, from_status, to_status, changed_by, comment)
  VALUES (p_task_id, v_old_status, p_new_status, v_user.id, p_comment);

  RETURN jsonb_build_object('ok', true, 'task_id', p_task_id, 'from', v_old_status, 'to', p_new_status);
END; $$;

-- ============================================================
-- 6. Индексы для производительности
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_object ON public.tasks(object_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_history_task ON public.task_history(task_id);