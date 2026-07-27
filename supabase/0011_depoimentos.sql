-- gnation — 0011: depoimentos reais, gerenciáveis
--
-- O QUE ESTAVA NO AR: quatro cards idênticos, com o MESMO texto em INGLÊS
-- ("The quality of the craftsmanship is evident...") assinados pelo MESMO
-- nome (Marcus Henderson), numa loja brasileira. Era o placeholder do
-- Figma, copiado fielmente — o comentário no código dizia que foi de
-- propósito, "pra não inventar depoimento falso". A intenção estava
-- certa; o resultado, não: prova social falsa é pior parada que card
-- vazio, porque engana quem está decidindo comprar.
--
-- A REGRA que fica: depoimento não se inventa. A tabela nasce VAZIA. A
-- seção da home só aparece quando o dono cadastrar depoimento de cliente
-- de verdade pelo painel. Enquanto não houver, a home não mostra a seção
-- — melhor um vão a menos que um elogio fabricado.
create table if not exists public.depoimentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  -- cidade/@ do cliente: dá lastro ("Ana, Juiz de Fora") sem expor o
  -- cliente inteiro. Opcional.
  origem text,
  texto text not null,
  -- 1 a 5 estrelas. Default 5, que é o caso comum de depoimento exibido.
  nota smallint not null default 5 check (nota between 1 and 5),
  -- foto do cliente, se ele autorizar. Opcional — sem ela o card mostra a
  -- inicial do nome, como o painel faz com o admin.
  foto_url text,
  -- ordem de exibição e liga/desliga sem apagar (o cliente pode pedir
  -- pra sair depois)
  ordem integer not null default 0,
  publicado boolean not null default true,
  criado_em timestamptz not null default now()
);

create index if not exists depoimentos_publicados_idx
  on public.depoimentos(ordem) where publicado;

alter table public.depoimentos enable row level security;

-- Qualquer visitante lê os publicados (a home mostra sem login). O admin
-- vê todos, inclusive os despublicados.
drop policy if exists "depoimento: leitura publica" on public.depoimentos;
create policy "depoimento: leitura publica" on public.depoimentos
  for select using (publicado or public.eh_admin());

drop policy if exists "depoimento: admin escreve" on public.depoimentos;
create policy "depoimento: admin escreve" on public.depoimentos
  for all using (public.eh_admin()) with check (public.eh_admin());

-- Privilégio mínimo, como o resto do schema: visitante não escreve.
revoke insert, update, delete, truncate on public.depoimentos from anon;
revoke truncate on public.depoimentos from authenticated;
