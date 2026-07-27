-- gnation — 0008: a música da home vira conteúdo, não código
--
-- Hoje a trilha é uma constante no SoundToggle:
--
--   const TRACK = "/assets/audio/theme.mp3";
--
-- Trocar a música exige um desenvolvedor, um commit e um deploy. Numa
-- loja cuja identidade é cultura de rua, a trilha muda com a coleção —
-- é conteúdo, na mesma prateleira que foto de produto e texto de banner.
--
-- Duas peças aqui: as colunas que dizem QUAL música tocar, e um bucket de
-- Storage onde o arquivo vive. Sem o bucket, "trocar a música" viraria
-- "peça pro programador subir o arquivo" — que é o problema que estamos
-- resolvendo.

alter table public.configuracoes
  add column if not exists musica_url text,
  add column if not exists musica_nome text,
  -- O SoundToggle já pula os primeiros segundos da faixa (a intro sem
  -- graça). Cada música tem um ponto diferente onde "começa" de verdade,
  -- então isso deixa de ser número mágico no código.
  add column if not exists musica_inicio_seg numeric not null default 0
    check (musica_inicio_seg >= 0),
  add column if not exists musica_volume numeric not null default 0.55
    check (musica_volume > 0 and musica_volume <= 1),
  -- Poder desligar o som do site inteiro sem apagar a faixa escolhida.
  add column if not exists musica_ativa boolean not null default true;

-- A faixa que já está no ar vira o valor inicial: a migration não muda o
-- que o visitante ouve hoje, só passa a permitir trocar.
update public.configuracoes
   set musica_url = coalesce(musica_url, '/assets/audio/theme.mp3'),
       musica_nome = coalesce(musica_nome, 'Tema G-Nation')
 where id = 1;

-- ============================================================
-- BUCKET DA LOJA
-- ============================================================
-- `public = true`: são arquivos que o site serve pra qualquer visitante
-- (a música toca antes de qualquer login, a foto do produto aparece na
-- vitrine). Público aqui é sobre LEITURA — quem escreve continua sendo
-- só o admin, pelas policies abaixo.
insert into storage.buckets (id, name, public)
values ('loja', 'loja', true)
on conflict (id) do update set public = true;

-- Leitura livre: é o que faz a URL do arquivo funcionar na tag <audio>
-- sem token.
drop policy if exists "loja: leitura publica" on storage.objects;
create policy "loja: leitura publica" on storage.objects
  for select using (bucket_id = 'loja');

-- Escrita só do admin. Sem isto, qualquer cliente logado subiria arquivo
-- pro bucket da loja — e um bucket público onde estranhos escrevem é
-- hospedagem grátis pra quem quiser.
drop policy if exists "loja: admin envia" on storage.objects;
create policy "loja: admin envia" on storage.objects
  for insert with check (bucket_id = 'loja' and public.eh_admin());

drop policy if exists "loja: admin troca" on storage.objects;
create policy "loja: admin troca" on storage.objects
  for update using (bucket_id = 'loja' and public.eh_admin())
  with check (bucket_id = 'loja' and public.eh_admin());

drop policy if exists "loja: admin apaga" on storage.objects;
create policy "loja: admin apaga" on storage.objects
  for delete using (bucket_id = 'loja' and public.eh_admin());
