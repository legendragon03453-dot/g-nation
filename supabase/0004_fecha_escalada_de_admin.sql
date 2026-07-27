-- gnation — 0004: fecha a escalada de privilégio aberta pela 0002
--
-- O QUE ESTAVA ERRADO
--
-- A 0002 acrescentou `perfis.admin` (boolean) pra separar o dono da loja
-- do cliente. Só que a policy de UPDATE de perfil, herdada da 0001, é:
--
--   for update using (auth.uid() = id) with check (auth.uid() = id)
--
-- Ela autoriza a pessoa a editar O PRÓPRIO perfil — e não diz nada sobre
-- QUAIS colunas. Como `authenticated` tinha UPDATE em todas elas, a nova
-- coluna entrou junto no pacote. Resultado, verificado em
-- information_schema.column_privileges:
--
--   perfis, colunas atualizáveis por authenticated:
--     admin, atualizado_em, cpf, criado_em, id, nome, telefone
--            ^^^^^
--
-- Qualquer cliente logado rodava, do console:
--
--   supabase.from('perfis').update({ admin: true }).eq('id', meuId)
--
-- ...e virava admin. Daí lia o pedido de todo mundo (nome, CPF, telefone
-- e endereço dos clientes), editava preço do catálogo e — porque a 0002
-- também deu `grant update (status, ...) on pedidos to authenticated`,
-- contando com o RLS pra separar — marcava o próprio pedido como 'pago'.
--
-- Isso anulava por fora todo o trabalho de tirar o preço do navegador:
-- não adianta o total nascer no servidor se o cliente pode se promover a
-- dono da loja e carimbar o pedido como pago.
--
-- A LIÇÃO, que vale pro resto do schema: policy responde "QUEM pode
-- escrever nesta LINHA". Ela não responde "QUAIS COLUNAS". Quando uma
-- linha tem coluna que o próprio dono não pode mexer — flag de permissão,
-- saldo, status de pagamento —, quem responde isso é o GRANT por coluna.
-- As duas coisas trabalham juntas; RLS sozinho não cobre esse caso.

-- ============================================================
-- PERFIS — o dono edita os dados dele, não a permissão dele
-- ============================================================
revoke update on public.perfis from authenticated, anon;

-- Lista explícita: só o que é dado cadastral. `admin` fica de fora, e
-- `id`/`criado_em` também — trocar o id do próprio perfil apontaria a
-- linha pra outra conta.
grant update (nome, telefone, cpf) on public.perfis to authenticated;

-- Mesma cerca no INSERT. O perfil já nasce pelo trigger `ao_criar_usuario`,
-- mas o checkout faz `upsert`, que precisa do INSERT: sem restringir as
-- colunas, dava pra criar o próprio perfil já com admin = true e pular a
-- cerca de cima.
revoke insert on public.perfis from authenticated, anon;
grant insert (id, nome, telefone, cpf) on public.perfis to authenticated;

-- ============================================================
-- PEDIDOS — cliente não carimba o próprio pagamento
-- ============================================================
-- A 0002 concedeu estas colunas a `authenticated` porque o admin também
-- é um usuário logado, e contou só com a policy `eh_admin()` pra separar.
-- Com a escalada acima isso ruía. Mesmo com ela fechada, o cinto e
-- suspensório vale aqui: `status` e `pago_em` decidem se a peça sai pelo
-- correio, e nenhum cliente precisa deles nem no papel.
--
-- Quando o painel-admin for construído, ele NÃO vai escrever direto
-- nestas colunas: muda status por função `security definer` própria, do
-- mesmo jeito que `criar_pedido` faz. Assim a regra de transição de
-- status ("enviado" só sai de "pago") vive num lugar só.
revoke update on public.pedidos from authenticated, anon;

-- ============================================================
-- CONFERÊNCIA
-- ============================================================
-- Depois de aplicar, o esperado é:
--
--   select table_name, column_name from information_schema.column_privileges
--    where grantee='authenticated' and privilege_type='UPDATE'
--      and table_name in ('perfis','pedidos');
--
--   perfis  | nome
--   perfis  | telefone
--   perfis  | cpf
--   (pedidos: nenhuma linha)
