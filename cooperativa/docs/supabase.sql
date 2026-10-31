-- ============================================================
-- COJURIS — ESTRUTURA PARA USAR O SUPABASE COMO SEGUNDO BANCO
--
-- Só é necessário se dados/config.js apontar "banco" ou
-- "arquivos" para "supabase".
--
-- 1. Supabase → Authentication → Sign In / Providers →
--    Third-Party Auth → Firebase → ID do projeto: cojuris
--    (o login continua no Firebase; o Supabase aceita o token)
-- 2. Supabase → SQL Editor → cole e execute este arquivo.
-- 3. Preencha url e chaveAnonima em portal/js/dados/config.js.
--
-- No token do Firebase, o identificador do usuário é o "sub".
-- ============================================================


-- ---------- Administradores (espelho do Firestore) ----------
-- Cadastre aqui os mesmos UIDs de administradores/{uid}.

create table if not exists public.administradores (
  uid text primary key
);

alter table public.administradores enable row level security;

create or replace function public.cj_uid()
returns text language sql stable as $$
  select auth.jwt() ->> 'sub'
$$;

create or replace function public.cj_eh_admin()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.administradores where uid = public.cj_uid())
$$;


-- ---------- Registros genéricos ----------
-- "colecao" recebe o mesmo caminho lógico do Firestore:
-- mural | mural/<id>/comentarios | comunicados/<id>/comentarios
-- documentos_pessoais/<uid>/itens | biblioteca

create table if not exists public.registros (
  id         uuid primary key default gen_random_uuid(),
  colecao    text not null,
  dados      jsonb not null,
  autor_uid  text not null default public.cj_uid(),
  criado_em  timestamptz not null default now()
);

create index if not exists registros_colecao_data
  on public.registros (colecao, criado_em desc);

alter table public.registros enable row level security;


-- Leitura: pastas pessoais só do dono e da administração;
-- o restante para qualquer usuário autenticado.
-- (O perfil de cadastro continua sendo checado no Firebase
-- pelas telas; replique-o aqui ao migrar o cadastro.)

create policy "ler registros" on public.registros
for select using (
  public.cj_uid() is not null and (
    public.cj_eh_admin()
    or colecao not like 'documentos_pessoais/%'
    or colecao like 'documentos_pessoais/' || public.cj_uid() || '/%'
  )
);

create policy "criar registros" on public.registros
for insert with check (
  autor_uid = public.cj_uid() and (
    public.cj_eh_admin()
    or colecao = 'mural'
    or colecao ~ '^(mural|comunicados)/[A-Za-z0-9_-]+/comentarios$'
    or colecao = 'documentos_pessoais/' || public.cj_uid() || '/itens'
  )
);

create policy "excluir registros" on public.registros
for delete using (
  public.cj_eh_admin() or autor_uid = public.cj_uid()
);


-- ---------- Armazenamento de arquivos ----------

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

create policy "ler arquivos" on storage.objects
for select using (
  bucket_id = 'documentos' and public.cj_uid() is not null and (
    public.cj_eh_admin()
    or name like 'biblioteca/%'
    or name like 'pessoais/' || public.cj_uid() || '/%'
  )
);

create policy "enviar arquivos" on storage.objects
for insert with check (
  bucket_id = 'documentos' and (
    public.cj_eh_admin()
    or name like 'pessoais/' || public.cj_uid() || '/%'
  )
);

create policy "excluir arquivos" on storage.objects
for delete using (
  bucket_id = 'documentos' and (
    public.cj_eh_admin()
    or name like 'pessoais/' || public.cj_uid() || '/%'
  )
);
