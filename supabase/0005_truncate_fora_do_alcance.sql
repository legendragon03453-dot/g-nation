-- gnation — 0005: TRUNCATE fora do alcance do cliente
--
-- A 0003 tirou TRUNCATE de `anon` nas tabelas do catálogo, mas deixou em
-- `authenticated` — porque o admin é um usuário logado e a ideia era
-- deixar o RLS separar, como acontece com INSERT/UPDATE/DELETE.
--
-- O detalhe que quebra esse raciocínio: **RLS não se aplica a TRUNCATE**.
-- Policy filtra linha; TRUNCATE não olha linha nenhuma, esvazia a tabela
-- inteira. Não existe policy que proteja contra ele — só o GRANT.
--
-- Na prática o PostgREST não expõe um endpoint de TRUNCATE, então não
-- havia caminho pronto pra explorar isso pela API. Mas privilégio que
-- não é usado não deve existir, e "não tem rota hoje" não é garantia
-- nenhuma: basta uma função `security invoker` futura, ou alguém com a
-- credencial em mãos e um cliente Postgres qualquer.
--
-- Ninguém precisa de TRUNCATE. Nem o admin: apagar catálogo se faz com
-- `ativo = false`, que preserva o histórico dos pedidos que apontam pra
-- aquele produto.

revoke truncate on public.produtos  from authenticated;
revoke truncate on public.variantes from authenticated;
revoke truncate on public.cupons    from authenticated;

-- E as duas que a 0003 não cobriu, pelo mesmo motivo.
revoke truncate on public.perfis    from authenticated, anon;
revoke truncate on public.enderecos from authenticated, anon;
