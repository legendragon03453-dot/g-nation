// As etiquetas de status do Figma: PAGO em verde, PENDENTE em amarelo,
// ENVIADO em azul — contorno fino, fundo translúcido, texto em caixa
// alta. Os outros três estados do banco não aparecem no frame (ele só
// mostra cinco pedidos de exemplo), então ganham tom coerente com o
// significado: produção segue o azul de "andando", entregue acompanha o
// verde de "deu certo", cancelado fica no vermelho da marca.
//
// Vive em arquivo próprio porque três telas mostram a mesma etiqueta
// (dashboard, lista de pedidos e, depois, a ficha do pedido). Duplicar o
// mapa em cada uma é como as cores param de bater entre telas.
export const STATUS = {
  aguardando_pagamento: { rotulo: "Pendente", tom: "espera" },
  pago: { rotulo: "Pago", tom: "ok" },
  em_producao: { rotulo: "Em produção", tom: "andando" },
  enviado: { rotulo: "Enviado", tom: "andando" },
  entregue: { rotulo: "Entregue", tom: "ok" },
  cancelado: { rotulo: "Cancelado", tom: "ruim" },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.aguardando_pagamento;
  return <span className={`adm__badge adm__badge--${s.tom}`}>{s.rotulo}</span>;
}
