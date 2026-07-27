-- gnation — 0009: conferir o cupom antes de fechar o pedido
--
-- `criar_pedido` já valida o cupom, mas só no momento de fechar. Do lado
-- do cliente isso é ruim: ele digita o código, não vê nada mudar, e só
-- descobre que era inválido depois de clicar em "fechar pedido" — ou
-- pior, vê o desconto aparecer só na tela de confirmação, quando já não
-- dá pra desistir.
--
-- Esta função responde "esse código vale, e o desconto seria X" SEM
-- consumir o cupom e SEM criar pedido. O cálculo é o mesmo, no mesmo
-- lugar — o front continua sem saber a regra.
--
-- Por que não deixar o cliente ler a tabela `cupons` direto: porque aí um
-- `select` no console listaria todo código de desconto ativo da loja.
-- Aqui ele só consegue perguntar sobre um código que já conhece.
create or replace function public.validar_cupom(
  p_codigo text,
  p_subtotal_centavos integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cupom public.cupons%rowtype;
  v_desconto integer;
begin
  -- Só pra quem tem conta: sem isso, a função vira um oráculo pra testar
  -- códigos de desconto no chute, sem nem se cadastrar.
  if auth.uid() is null then
    raise exception 'PRECISA_LOGIN';
  end if;

  select * into v_cupom
    from public.cupons
   where codigo = upper(trim(coalesce(p_codigo, '')));

  -- Mensagem única pra "não existe" e "desligado": dizer que o código
  -- existe mas está desativado entrega informação sobre as campanhas da
  -- loja pra quem está adivinhando códigos.
  if not found or not v_cupom.ativo then
    return jsonb_build_object('valido', false, 'motivo', 'CUPOM_INVALIDO');
  end if;

  if v_cupom.inicia_em is not null and now() < v_cupom.inicia_em then
    return jsonb_build_object('valido', false, 'motivo', 'CUPOM_INVALIDO');
  end if;

  if v_cupom.expira_em is not null and now() > v_cupom.expira_em then
    return jsonb_build_object('valido', false, 'motivo', 'CUPOM_EXPIRADO');
  end if;

  if v_cupom.limite_usos is not null and v_cupom.usos >= v_cupom.limite_usos then
    return jsonb_build_object('valido', false, 'motivo', 'CUPOM_ESGOTADO');
  end if;

  if p_subtotal_centavos < v_cupom.minimo_centavos then
    return jsonb_build_object(
      'valido', false,
      'motivo', 'CUPOM_MINIMO',
      'minimo_centavos', v_cupom.minimo_centavos
    );
  end if;

  v_desconto := case
    when v_cupom.tipo = 'percentual' then (p_subtotal_centavos * v_cupom.valor) / 100
    else v_cupom.valor
  end;
  v_desconto := least(v_desconto, p_subtotal_centavos);

  return jsonb_build_object(
    'valido', true,
    'codigo', v_cupom.codigo,
    'desconto_centavos', v_desconto,
    'tipo', v_cupom.tipo,
    'valor', v_cupom.valor
  );
end;
$$;

revoke all on function public.validar_cupom(text, integer) from public, anon;
grant execute on function public.validar_cupom(text, integer) to authenticated;
