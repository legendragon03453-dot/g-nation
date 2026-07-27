-- gnation — 0010: "Confira também" ganha curadoria própria
--
-- A faixa de Lançamentos já é editável pelo painel: quem marca
-- `destaque` entra na frente. O "Confira também" ficou de fora — ele
-- escolhia as peças por uma lista de slugs escrita no código
-- (anel-cruz-royal, anel-cruz-ice, elo-grumet) e se completava com o
-- catálogo. Ou seja: pra trocar o que aparece lá embaixo, precisava de
-- deploy.
--
-- POR QUE UMA COLUNA NOVA E NÃO REUSAR `destaque`:
-- as duas seções aparecem na MESMA home, uma perto da outra. Se
-- dividissem o mesmo campo, marcar uma peça a colocaria nas duas e o
-- visitante veria a mesma joia duas vezes na mesma rolagem. São duas
-- curadorias com papéis diferentes: Lançamentos é a vitrine do que é
-- novo; "Confira também" é o empurrão de quem chegou ao fim da página e
-- ainda não decidiu.
alter table public.produtos
  add column if not exists confira boolean not null default false;

create index if not exists produtos_confira_idx
  on public.produtos(confira) where confira and ativo;

-- Semeia com as três que a seção já mostrava, pra home não mudar sozinha
-- quando esta migration subir. A partir daqui, quem manda é o painel.
update public.produtos
   set confira = true
 where slug in ('anel-cruz-royal', 'anel-cruz-ice', 'elo-grumet');

-- A segunda linha da seção é rolável na horizontal, então comporta mais
-- peças que a primeira. Marcar algumas a mais aqui dá o que rolar.
update public.produtos
   set confira = true
 where slug in ('trevo-gold', 'trevo-rose', 'tennis-ice', 'medalha-g', 'pingente-coroa-ice');
