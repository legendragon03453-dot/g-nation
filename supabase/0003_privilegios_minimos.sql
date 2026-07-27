-- gnation — 0003: privilégio mínimo nas tabelas novas
--
-- Toda tabela criada no schema `public` do Supabase nasce com GRANT
-- amplo pra `anon` e `authenticated` (é o default do projeto, não algo
-- que a 0002 pediu). Conferindo depois de aplicar a 0002:
--
--   anon | produtos  | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE
--   anon | cupons    | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE
--
-- Na prática o RLS já barra (as policies de escrita exigem `eh_admin()`),
-- então não havia furo aberto. Mas privilégio que não é usado não deve
-- existir: se um dia alguém criar uma policy permissiva sem perceber, o
-- grant já estaria lá esperando. Mesma lógica do revoke que a 0002 fez
-- em `pedidos`.
--
-- POR QUE `authenticated` MANTÉM a escrita em produtos/variantes/cupons:
-- o admin do painel é um usuário logado comum — `authenticated` é o
-- papel dele também. Quem separa o dono da loja do cliente é o RLS via
-- `eh_admin()`, não o GRANT. Revogar aqui mataria o painel-admin.
-- Já `anon` (visitante sem conta) não escreve nada, em nenhuma hipótese.

revoke insert, update, delete, truncate on public.produtos  from anon;
revoke insert, update, delete, truncate on public.variantes from anon;
revoke insert, update, delete, truncate on public.cupons    from anon;

-- Cupom não é lido por ninguém além do admin. `anon` não precisa nem do
-- SELECT — sem isso, um `select * from cupons` sem login já morre no
-- privilégio, antes mesmo de chegar na policy.
revoke select on public.cupons from anon;

-- TRUNCATE em tabela de pedido é destruição em massa que nenhum papel de
-- cliente deveria carregar. A 0002 revogou insert/update/delete; faltou
-- este.
revoke truncate on public.pedidos      from anon, authenticated;
revoke truncate on public.itens_pedido from anon, authenticated;
revoke truncate on public.perfis       from anon, authenticated;
revoke truncate on public.enderecos    from anon, authenticated;
