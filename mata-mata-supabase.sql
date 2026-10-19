-- ============================================================
-- INTERCLASSE - MATA-MATA (Supabase > SQL Editor)
-- Execute este bloco UMA VEZ para criar a chave do mata-mata.
-- Depois o painel adm.html gera e edita os confrontos sozinho.
-- ============================================================

-- 1) TABELA do mata-mata: cada linha = 1 confronto da chave
create table if not exists public.mata_mata (
    id bigint generated always as identity primary key,
    fase text not null,
    fase_ordem int not null default 0,
    posicao int not null default 1,
    time1 text,
    time2 text,
    gols_time1 int,
    gols_time2 int,
    data date,
    hora time,
    local text,
    status text not null default 'agendado',
    criado_em timestamptz not null default now()
);

-- 2) LIBERA ACESSO (mesmo padrão aberto já usado no site)
alter table public.mata_mata enable row level security;

drop policy if exists "Leitura publica mata-mata" on public.mata_mata;
create policy "Leitura publica mata-mata"
    on public.mata_mata for select
    to anon, authenticated
    using (true);

drop policy if exists "Escrita publica mata-mata" on public.mata_mata;
create policy "Escrita publica mata-mata"
    on public.mata_mata for insert
    to anon, authenticated
    with check (true);

drop policy if exists "Atualizacao publica mata-mata" on public.mata_mata;
create policy "Atualizacao publica mata-mata"
    on public.mata_mata for update
    to anon, authenticated
    using (true)
    with check (true);

drop policy if exists "Exclusao publica mata-mata" on public.mata_mata;
create policy "Exclusao publica mata-mata"
    on public.mata_mata for delete
    to anon, authenticated
    using (true);

-- 3) ATUALIZAÇÃO AO VIVO na página do mata-mata (opcional)
-- Se der erro "already member", é porque já está ativo: pode ignorar.
alter publication supabase_realtime add table public.mata_mata;

-- 4) TESTE: ver a chave ordenada por fase
-- select * from public.mata_mata order by fase_ordem, posicao;
