-- ============================================================
-- INTERCLASSE - ATUALIZAÇÃO DO BANCO (Supabase > SQL Editor)
-- Deixa a classificação 100% automática:
--   * cada jogo cadastrado em "resultados" alimenta os pontos;
--   * a visão "classificacao" calcula PJ, PTS, V, E, D, GP, GC, SG;
--   * não é mais preciso manter a planilha de pontos.
-- Execute os blocos NA ORDEM, um de cada vez.
-- ============================================================

-- ------------------------------------------------------------
-- 1) RESULTADOS: colunas neutras (Time 1 / Time 2)
--    Permite cadastrar empates e mantém os jogos antigos
--    (o antigo "vencedor" passa a ser o Time 1, com os mesmos gols).
-- ------------------------------------------------------------
alter table public.resultados rename column time_vencedor   to time1;
alter table public.resultados rename column time_perdedor   to time2;
alter table public.resultados rename column gols_vencedor   to gols_time1;
alter table public.resultados rename column gols_perdedor   to gols_time2;
alter table public.resultados rename column gols_vencedor_f to gols_time1_f;
alter table public.resultados rename column gols_perdedor_f to gols_time2_f;

-- Garante que não existe gol nulo antes de tornar obrigatório
update public.resultados set gols_time1 = 0 where gols_time1 is null;
update public.resultados set gols_time2 = 0 where gols_time2 is null;

alter table public.resultados alter column time1 set not null;
alter table public.resultados alter column time2 set not null;
alter table public.resultados alter column gols_time1 set not null;
alter table public.resultados alter column gols_time2 set not null;

-- Time 1 e Time 2 não podem ser o mesmo time
alter table public.resultados
    add constraint resultados_times_diferentes check (time1 <> time2);

-- ------------------------------------------------------------
-- 2) GRUPOS: coluna "grupo" na tabela "jogadores"
--    Todo time nasce no "Grupo 1". Para mudar, edite no Table
--    Editor (aba jogadores) ou rode o exemplo abaixo (sem os --).
-- ------------------------------------------------------------
alter table public.jogadores
    add column if not exists grupo text not null default 'Grupo 1';

-- update public.jogadores set grupo = 'Grupo 2' where time in ('Nome do Time A', 'Nome do Time B');

-- ------------------------------------------------------------
-- 3) VISÃO "classificacao": a tabela de pontos calculada sozinha
--    Usa os times cadastrados em "jogadores" (1 linha por time).
--    IMPORTANTE: o nome do time em "resultados" precisa ser
--    EXATAMENTE igual ao da coluna "time" em "jogadores".
-- ------------------------------------------------------------
create or replace view public.classificacao as
select
    calculo.time,
    calculo.grupo,
    calculo.pj,
    calculo.pts,
    calculo.v,
    calculo.e,
    calculo.d,
    calculo.gp,
    calculo.gc,
    (calculo.gp - calculo.gc) as sg
from (
    select
        t.time                                              as time,
        coalesce(nullif(t.grupo, ''), 'Sem grupo')          as grupo,
        count(r.id)::int                                    as pj,
        coalesce(sum(
            case
                when (r.time1 = t.time and r.gols_time1 > r.gols_time2)
                  or (r.time2 = t.time and r.gols_time2 > r.gols_time1) then 3
                when r.gols_time1 = r.gols_time2 then 1
                else 0
            end
        ), 0)::int                                          as pts,
        count(r.id) filter (where
            (r.time1 = t.time and r.gols_time1 > r.gols_time2)
             or (r.time2 = t.time and r.gols_time2 > r.gols_time1)
        )::int                                              as v,
        count(r.id) filter (where r.gols_time1 = r.gols_time2)::int as e,
        count(r.id) filter (where
            (r.time1 = t.time and r.gols_time1 < r.gols_time2)
             or (r.time2 = t.time and r.gols_time2 < r.gols_time1)
        )::int                                              as d,
        coalesce(sum(
            case
                when r.time1 = t.time then r.gols_time1
                when r.time2 = t.time then r.gols_time2
                else 0
            end
        ), 0)::int                                          as gp,
        coalesce(sum(
            case
                when r.time1 = t.time then r.gols_time2
                when r.time2 = t.time then r.gols_time1
                else 0
            end
        ), 0)::int                                          as gc
    from public.jogadores t
    left join public.resultados r
        on r.time1 = t.time
        or r.time2 = t.time
    group by t.id, t.time, t.grupo
) as calculo;

-- Acesso público de leitura para o site
grant select on public.classificacao to anon, authenticated;

-- ------------------------------------------------------------
-- 4) ATUALIZAÇÃO AO VIVO (opcional, recomendado)
--    Faz a tabela da página principal se atualizar sozinha quando
--    um jogo é cadastrado, sem precisar dar F5.
--    Se der erro "already member of publication", já está ativo.
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.resultados;

-- ------------------------------------------------------------
-- 5) TESTE: veja a classificação calculada
-- ------------------------------------------------------------
select * from public.classificacao
order by grupo, pts desc, sg desc, gp desc;

-- ------------------------------------------------------------
-- 6) PERMISSÃO para cadastrar times pelo admin (idempotente)
--    Necessária para o formulário "Cadastrar time" do adm.html
--    funcionar. Se já existir uma política de INSERT, esta etapa
--    não muda nada.
-- ------------------------------------------------------------
drop policy if exists "Cadastro publico de times" on public.jogadores;
create policy "Cadastro publico de times"
    on public.jogadores for insert
    to anon, authenticated
    with check (true);