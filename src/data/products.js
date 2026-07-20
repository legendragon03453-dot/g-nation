// Fonte única de produtos — antes cada seção (Curtain, Shop, OutrosProdutos,
// Works) tinha seu próprio array duplicado, alguns com fotos reais, outros
// com uma foto placeholder compartilhada. Consolidado aqui por slug, pra
// toda seção linkar pro mesmo /produto/:slug com o mesmo dado real.
//
// FOTO: os 4 produtos abaixo (Trevo Royal, Cubana Cravejada, Tennis Ice,
// Anel Cruz Ice) usam a mesma foto real da pulseira que já aparece nos
// cards de Lançamentos (figma-lancamentos-foto.png) — é a foto de verdade
// da peça, a mesma que o usuário vê no card antes de clicar. As fotos que
// estavam registradas antes (trevo-royal.png, cubana-cravejada.png,
// tennis-ice.png) eram fotos de lifestyle sem a joia visível — não eram
// fotos do produto, foram substituídas.
export const PRODUCTS = [
  {
    slug: "trevo-royal",
    title: "Trevo Royal",
    category: "Pulseiras",
    price: "R$ 319,00",
    priceValue: 319,
    img: "figma-lancamentos-foto.png",
    description:
      "Pulseira em prata com banho reforçado e cravação densa em trevos, fecho duplo de segurança. Peso real, presença de vitrine.",
    materials: ["Prata 925", "Banho Ouro 18k"],
    sizes: ["16cm", "18cm", "20cm"],
  },
  {
    slug: "cubana-cravejada",
    title: "Cubana Cravejada",
    category: "Cordões",
    price: "R$ 289,00",
    priceValue: 289,
    img: "figma-lancamentos-foto.png",
    description:
      "Corrente cubana clássica com cravação total em zircônia, acabamento polido à mão e fecho reforçado com trava dupla.",
    materials: ["Prata 925", "Banho Ouro 18k"],
    sizes: ["50cm", "55cm", "60cm"],
  },
  {
    slug: "tennis-ice",
    title: "Tennis Ice",
    category: "Cordões",
    price: "R$ 259,00",
    priceValue: 259,
    img: "figma-lancamentos-foto.png",
    description:
      "Tennis chain de cravação corrida, brilho parelho do início ao fim, fecho de segurança discreto. Um clássico atemporal.",
    materials: ["Prata 925", "Banho Ródio"],
    sizes: ["45cm", "50cm", "55cm"],
  },
  {
    slug: "anel-cruz-ice",
    title: "Anel Cruz Ice",
    category: "Anéis",
    price: "R$ 329,00",
    priceValue: 329,
    img: "figma-lancamentos-foto.png",
    description:
      "Anel de brasão com cruz cravejada, volume generoso e acabamento gelado. Peça de assinatura pra quem não passa despercebido.",
    materials: ["Prata 925", "Banho Ródio"],
    sizes: ["18", "20", "22", "24"],
  },
  {
    slug: "anel-cruz-royal",
    title: "Anel Cruz Royal",
    category: "Anéis",
    price: "R$ 349,00",
    priceValue: 349,
    img: "anel-cruz-royal.png",
    description:
      "Versão royal do anel de brasão, cravação baguete e detalhes em banho reforçado. Feito pra durar e pra ser visto.",
    materials: ["Prata 925", "Banho Ouro 18k"],
    sizes: ["18", "20", "22", "24"],
  },
  {
    // Foto real: node 27:11 do Figma ("Foto de #(9) 1"), baixada via
    // download_assets — pulseira trevo em banho rosé com zircônia rosa.
    slug: "trevo-rose",
    title: "Trevo Rosé",
    category: "Pulseiras",
    price: "R$ 339,00",
    priceValue: 339,
    img: "bracelet-foto-9.png",
    description:
      "Pulseira trevo em banho rosé com cravação em zircônia rosa, fecho gaveta cravejado com trava dupla. A versão mais delicada da linha, sem perder presença.",
    materials: ["Prata 925", "Banho Rosé"],
    sizes: ["16cm", "18cm", "20cm"],
  },
  {
    // Foto real: node 27:10 do Figma ("Foto de #(10) 1"), baixada via
    // download_assets — pulseira trevo em banho ouro com zircônia verde.
    slug: "trevo-gold",
    title: "Trevo Gold",
    category: "Pulseiras",
    price: "R$ 349,00",
    priceValue: 349,
    img: "bracelet-foto-10.png",
    description:
      "Pulseira trevo em banho ouro 18k com cravação em zircônia verde esmeralda, fecho gaveta cravejado com trava dupla. Peso real e brilho de vitrine.",
    materials: ["Prata 925", "Banho Ouro 18k"],
    sizes: ["16cm", "18cm", "20cm"],
  },
  {
    // PENDENTE: elo-grumet.png também é foto de lifestyle sem a corrente
    // visível — mesmo problema que os 4 acima tinham. Ainda não trocada
    // porque não tenho uma foto real dessa peça (nem a macro da pulseira
    // serve aqui, é uma corrente, não pulseira). Precisa de foto real.
    slug: "elo-grumet",
    title: "Elo Grumet",
    category: "Cordões",
    price: "R$ 249,00",
    priceValue: 249,
    img: "elo-grumet.png",
    description:
      "Corrente elo grumet trançado, acabamento espelhado e fecho reforçado. Discreta no dia a dia, presente na vitrine.",
    materials: ["Prata 925", "Banho Ouro 18k"],
    sizes: ["50cm", "55cm", "60cm", "70cm"],
  },
];

export function getProductBySlug(slug) {
  return PRODUCTS.find((p) => p.slug === slug);
}

// Coleções — a página /colecao/:slug (fiel ao node 27:670 do Figma,
// "CATEGORIA — CORRENTES") filtra a MESMA fonte de produtos acima, sem
// duplicar dado. category:null = mostra tudo (G-Shop é a loja inteira).
// Coleções cujo filtro não bate com nenhum produto registrado (ex.:
// g-customizadas, pingentes) mostram estado vazio honesto — nada de
// preencher com produto de outra categoria pra parecer cheio.
export const COLLECTIONS = {
  "g-shop": { title: "G-Shop", category: null },
  "g-customizadas": { title: "G-Customizadas", category: "G-Customizadas" },
  correntes: { title: "Correntes", category: "Cordões" },
  aneis: { title: "Anéis", category: "Anéis" },
  pulseiras: { title: "Pulseiras", category: "Pulseiras" },
  pingentes: { title: "Pingentes", category: "Pingentes" },
};

export function getCollection(slug) {
  const c = COLLECTIONS[slug];
  if (!c) return null;
  const products = c.category
    ? PRODUCTS.filter((p) => p.category === c.category)
    : PRODUCTS;
  return { ...c, slug, products };
}
