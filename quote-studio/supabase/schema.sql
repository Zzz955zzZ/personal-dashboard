-- ============================================================
-- Quote Studio · Supabase 数据表结构（多租户工作室内部工具）
-- 运行方式：Supabase 后台 → SQL Editor → 粘贴全文 → Run
-- 可重复执行（幂等：drop policy if exists / exception when duplicate）
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- 核心表 ----------

create table if not exists public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Mi Estudio',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  email text,
  role text not null default 'staff',
  created_at timestamptz not null default now()
);

create table if not exists public.carpetas (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null,
  color text not null default '#8c7b6b',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.category_groups (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null,
  name_es text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_templates (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.category_groups(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  name text not null,
  name_es text,
  model text,
  note text,
  default_cost numeric not null default 0,
  default_sale_price numeric not null default 0,
  default_unit text,
  photo_urls jsonb not null default '[]'::jsonb,
  sort int not null default 0
);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  carpeta_id uuid references public.carpetas(id) on delete set null,
  title text not null default 'Sin título',
  quote_number text,
  vat_rate numeric not null default 21,
  validity_days int not null default 30,
  notes text,
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  category_group_id uuid references public.category_groups(id) on delete set null,
  name text not null,
  name_es text,
  model text,
  photo_urls jsonb not null default '[]'::jsonb,
  customer_note text,
  internal_note text,
  cost numeric not null default 0,
  sale_price numeric not null default 0,
  quantity numeric not null default 1,
  unit text,
  line_total numeric not null default 0,
  status_id text,
  sort int not null default 0
);

create table if not exists public.canvas_notes (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  text text,
  x numeric not null default 0,
  y numeric not null default 0,
  color text,
  width numeric not null default 180,
  height numeric not null default 160,
  image_url text,
  sort int not null default 0
);

-- 工作室设置（单位/状态/公司资料/PDF/AI 等整体存 jsonb，低频变更）
create table if not exists public.studio_settings (
  studio_id uuid primary key references public.studios(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- 索引 ----------

create index if not exists idx_carpetas_studio on public.carpetas(studio_id);
create index if not exists idx_category_groups_studio on public.category_groups(studio_id);
create index if not exists idx_product_templates_studio on public.product_templates(studio_id);
create index if not exists idx_product_templates_group on public.product_templates(group_id);
create index if not exists idx_quotations_studio on public.quotations(studio_id);
create index if not exists idx_quotation_items_quotation on public.quotation_items(quotation_id);
create index if not exists idx_canvas_notes_quotation on public.canvas_notes(quotation_id);

-- ---------- 行更新时间触发 ----------

create or replace function public.touch_updated() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists quotations_touch on public.quotations;
create trigger quotations_touch before update on public.quotations
  for each row execute function public.touch_updated();

-- ---------- 新用户自动建工作室 + 档案（解决鸡生蛋）----------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer as $$
declare
  new_studio uuid;
begin
  insert into public.studios (name) values (coalesce(new.email, 'Estudio')) returning id into new_studio;
  insert into public.profiles (id, studio_id, email) values (new.id, new_studio, new.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 加入已有工作室（管理员把 studio_id 发给同事，同事登录后调用）
create or replace function public.join_studio(target text) returns void
language plpgsql security definer as $$
declare
  sid uuid;
begin
  select id into sid from public.studios where id::text = target;
  if sid is null then
    select id into sid from public.studios where name = target;
  end if;
  if sid is null then
    raise exception 'studio not found';
  end if;
  update public.profiles set studio_id = sid where id = auth.uid();
end $$;

grant execute on function public.join_studio(text) to authenticated;

-- ---------- 当前工作室辅助函数（供 RLS 使用）----------

create or replace function public.current_studio_id() returns uuid
language sql stable as $$
  select studio_id from public.profiles where id = auth.uid()
$$;

-- ---------- 行级安全 RLS ----------

alter table public.studios enable row level security;
alter table public.profiles enable row level security;
alter table public.carpetas enable row level security;
alter table public.category_groups enable row level security;
alter table public.product_templates enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.canvas_notes enable row level security;
alter table public.studio_settings enable row level security;

-- profiles：仅本人可读写
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- studios：同工作室成员可访问
drop policy if exists studios_read on public.studios;
create policy studios_read on public.studios
  for select using (id = public.current_studio_id());
drop policy if exists studios_member on public.studios;
create policy studios_member on public.studios
  for all using (public.current_studio_id() = id) with check (public.current_studio_id() = id);

-- 其余数据表：同工作室成员全权
do $$
declare
  t text;
  pname text;
begin
  foreach t in array array[
    'carpetas', 'category_groups', 'product_templates',
    'quotations', 'quotation_items', 'canvas_notes', 'studio_settings'
  ] loop
    pname := t || '_studio';
    execute format('drop policy if exists %I on public.%I', pname, t);
    execute format(
      'create policy %I on public.%I for all '
      'using (studio_id = public.current_studio_id()) '
      'with check (studio_id = public.current_studio_id())',
      pname, t
    );
  end loop;
end $$;

-- ---------- Realtime（多设备亚秒级同步）----------

do $$
declare
  t text;
begin
  foreach t in array array[
    'carpetas', 'category_groups', 'product_templates',
    'quotations', 'quotation_items', 'canvas_notes', 'studio_settings'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
