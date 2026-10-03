-- ReadEasy schema. Every table has RLS. Anonymous readers never touch tables
-- directly; they call the security-definer RPCs at the bottom with a share token.

-- ---------------------------------------------------------------- enums
create type public.grade_band as enum ('3-5', '6-8', '9-12');
create type public.class_theme as enum ('teal', 'plum', 'rust', 'indigo', 'forest', 'berry');
create type public.material_status as enum ('draft', 'processing', 'needs_review', 'published');
create type public.section_status as enum ('pending', 'processing', 'done', 'flagged', 'failed');
create type public.source_type as enum ('file', 'paste', 'url');
create type public.asset_kind as enum ('upload', 'image');

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.version = coalesce(old.version, 0) + 1;
  return new;
end $$;

-- 128-bit URL-safe token from a v4 uuid (122 random bits), 22 chars.
create or replace function public.gen_share_token()
returns text language sql volatile as $$
  select translate(
    rtrim(encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64'), '='),
    '+/', '-_'
  );
$$;

-- 6-char class code from an alphabet without look-alikes (no 0/O/1/I).
create or replace function public.gen_class_code()
returns text language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  i int;
begin
  loop
    new_code := '';
    for i in 1..6 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.classes c where c.code = new_code);
  end loop;
  return new_code;
end $$;

-- ---------------------------------------------------------------- teachers
create table public.teachers (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null check (email = lower(email)),
  display_name text,
  daily_generation_cap int not null default 40,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.teachers (id, email) values (new.id, lower(new.email))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger teachers_updated before update on public.teachers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- classes
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  grade_band public.grade_band not null,
  handle text not null unique check (handle = lower(handle) and handle ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  theme public.class_theme not null default 'teal',
  welcome text check (welcome is null or char_length(welcome) <= 160),
  code text not null unique default public.gen_class_code(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1
);

create index classes_teacher_idx on public.classes (teacher_id);

create trigger classes_updated before update on public.classes
  for each row execute function public.set_updated_at();

-- Reserved handles that would collide with routes or look official.
create or replace function public.handle_is_reserved(h text)
returns boolean language sql immutable as $$
  select lower(h) = any (array[
    'api','c','r','go','auth','admin','dashboard','login','signin','signup','logout',
    'about','help','privacy','terms','styleguide','static','_next','www','app','new',
    'class','classes','material','materials','settings','teacher','teachers','readeasy','demo'
  ]);
$$;

alter table public.classes add constraint classes_handle_not_reserved
  check (not public.handle_is_reserved(handle));

-- ---------------------------------------------------------------- materials
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.teachers (id) on delete cascade,
  -- Owned by an anonymous "try it" session until claimed at sign-in. Server-only.
  -- One session can own many drafts, so this is indexed but not unique.
  draft_token text,
  class_id uuid references public.classes (id) on delete set null,
  title text not null default 'Untitled' check (char_length(title) <= 200),
  source_type public.source_type not null,
  source_name text,
  source_language text not null default 'en',
  direction text not null default 'ltr' check (direction in ('ltr', 'rtl')),
  source_text text,
  content_hash text,
  pii_report jsonb,
  supports jsonb not null default '{"levels":["medium","simple"],"tldr":true,"words":true,"quick_checks":true,"steps":true}'::jsonb,
  status public.material_status not null default 'draft',
  share_token text not null unique default public.gen_share_token(),
  share_rotated_at timestamptz,
  published_at timestamptz,
  position int not null default 0,
  tldr jsonb,
  word_preview jsonb,
  assignment_steps jsonb,
  image_descriptions jsonb,
  listen_seconds int not null default 0,
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  constraint materials_owner check (teacher_id is not null or draft_token is not null)
);

create index materials_teacher_idx on public.materials (teacher_id);
create index materials_class_idx on public.materials (class_id, position);
create index materials_hash_idx on public.materials (teacher_id, content_hash);
create index materials_draft_idx on public.materials (draft_token) where draft_token is not null;

create trigger materials_updated before update on public.materials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- sections
create table public.sections (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id) on delete cascade,
  position int not null,
  status public.section_status not null default 'pending',
  attempts int not null default 0,
  lease_until timestamptz,
  title text,
  about text,
  original jsonb not null,
  levels jsonb not null default '{}'::jsonb,
  quick_checks jsonb not null default '[]'::jsonb,
  fact_guard jsonb not null default '{"status":"unchecked","missing":[],"acknowledged":false}'::jsonb,
  readability jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  unique (material_id, position)
);

create index sections_material_idx on public.sections (material_id, position);

create trigger sections_updated before update on public.sections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- assets
create table public.material_assets (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id) on delete cascade,
  kind public.asset_kind not null,
  storage_path text not null,
  mime text not null,
  bytes int not null check (bytes >= 0),
  created_at timestamptz not null default now()
);

create index material_assets_material_idx on public.material_assets (material_id);

-- ---------------------------------------------------------------- limits (server only)
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

create table public.generation_usage (
  subject text not null,
  day date not null,
  count int not null default 0,
  primary key (subject, day)
);

-- Atomic sliding-window-ish counter: returns the new count for this window.
create or replace function public.bump_rate_limit(p_key text, p_window_seconds int)
returns int language plpgsql security definer set search_path = public as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c int;
begin
  insert into public.rate_limits (key, window_start, count) values (p_key, w, 1)
  on conflict (key, window_start) do update set count = rate_limits.count + 1
  returning count into c;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return c;
end $$;

create or replace function public.bump_generation_usage(p_subject text)
returns int language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into public.generation_usage (subject, day, count) values (p_subject, current_date, 1)
  on conflict (subject, day) do update set count = generation_usage.count + 1
  returning count into c;
  return c;
end $$;

-- ---------------------------------------------------------------- RLS
alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.materials enable row level security;
alter table public.sections enable row level security;
alter table public.material_assets enable row level security;
alter table public.rate_limits enable row level security;
alter table public.generation_usage enable row level security;

-- Nothing is readable by anon through tables. Students use the RPCs below.
revoke all on all tables in schema public from anon;

grant select, update on public.teachers to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, update, delete on public.materials to authenticated;
grant select, insert, update, delete on public.sections to authenticated;
grant select, insert, delete on public.material_assets to authenticated;

create policy teachers_self_select on public.teachers for select to authenticated
  using (id = auth.uid());
create policy teachers_self_update on public.teachers for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy classes_owner on public.classes for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy materials_owner on public.materials for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy sections_owner on public.sections for all to authenticated
  using (exists (select 1 from public.materials m where m.id = sections.material_id and m.teacher_id = auth.uid()))
  with check (exists (select 1 from public.materials m where m.id = sections.material_id and m.teacher_id = auth.uid()));

create policy material_assets_owner on public.material_assets for all to authenticated
  using (exists (select 1 from public.materials m where m.id = material_assets.material_id and m.teacher_id = auth.uid()))
  with check (exists (select 1 from public.materials m where m.id = material_assets.material_id and m.teacher_id = auth.uid()));

-- ---------------------------------------------------------------- public RPCs (students, no login)
-- Each returns only the columns a student may see, only for published content.

create or replace function public.public_class(p_handle text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', c.name,
    'grade_band', c.grade_band,
    'handle', c.handle,
    'theme', c.theme,
    'welcome', c.welcome,
    'code', c.code,
    'materials', coalesce((
      select jsonb_agg(jsonb_build_object(
        'token', m.share_token,
        'title', m.title,
        'listen_seconds', m.listen_seconds,
        'section_count', (select count(*) from public.sections s where s.material_id = m.id),
        'language', m.source_language,
        'published_at', m.published_at
      ) order by m.position, m.published_at desc)
      from public.materials m
      where m.class_id = c.id and m.status = 'published'
    ), '[]'::jsonb)
  )
  from public.classes c
  where c.handle = lower(p_handle);
$$;

create or replace function public.public_class_by_code(p_code text)
returns text language sql stable security definer set search_path = public as $$
  select c.handle from public.classes c where c.code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'));
$$;

create or replace function public.public_material(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'token', m.share_token,
    'title', m.title,
    'language', m.source_language,
    'direction', m.direction,
    'supports', m.supports,
    'tldr', m.tldr,
    'word_preview', m.word_preview,
    'assignment_steps', m.assignment_steps,
    'image_descriptions', m.image_descriptions,
    'listen_seconds', m.listen_seconds,
    'updated_at', m.updated_at,
    'class', (select jsonb_build_object('name', c.name, 'handle', c.handle, 'theme', c.theme, 'grade_band', c.grade_band)
              from public.classes c where c.id = m.class_id),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'position', s.position,
        'title', s.title,
        'about', s.about,
        'original', s.original,
        'levels', s.levels,
        'quick_checks', s.quick_checks
      ) order by s.position)
      from public.sections s
      where s.material_id = m.id and s.status in ('done', 'flagged')
    ), '[]'::jsonb)
  )
  from public.materials m
  where m.share_token = p_token and m.status = 'published';
$$;

-- Called by a signed-in teacher to take ownership of every "try it" draft
-- from their anonymous session. Returns the most recent one.
create or replace function public.claim_draft_material(p_draft_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  mid uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  with claimed as (
    update public.materials
      set teacher_id = auth.uid(), draft_token = null
      where draft_token = p_draft_token and teacher_id is null
      returning id, created_at
  )
  select id into mid from claimed order by created_at desc limit 1;
  return mid;
end $$;

grant execute on function public.public_class(text) to anon, authenticated;
grant execute on function public.public_class_by_code(text) to anon, authenticated;
grant execute on function public.public_material(text) to anon, authenticated;
grant execute on function public.claim_draft_material(text) to authenticated;

-- Postgres grants EXECUTE to PUBLIC on new functions, and Supabase's default
-- privileges add anon/authenticated. Lock down everything that is not a student RPC.
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function public.public_class(text) to anon, authenticated;
grant execute on function public.public_class_by_code(text) to anon, authenticated;
grant execute on function public.public_material(text) to anon, authenticated;
grant execute on function public.claim_draft_material(text) to authenticated;
-- Column defaults, check constraints, and triggers run as the inserting role.
grant execute on function public.gen_share_token() to authenticated;
grant execute on function public.gen_class_code() to authenticated;
grant execute on function public.set_updated_at() to authenticated;
grant execute on function public.handle_is_reserved(text) to anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.handle_new_user() to supabase_auth_admin;
  end if;
end $$;
