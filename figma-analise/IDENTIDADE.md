# G-NATION — Identidade da HOME (Figma → Framer)

Fonte: Figma `TXte9vygIeSP76UVjnbwLT`, frame `HOME` (node 27:39), canvas **1920×5250**.
Screenshot de referência: `home-full.png`. Assets reais em `assets/` e `raws/`.
Análise feita em 2026-07-14 com get_metadata + get_design_context + download_assets.
O arquivo NÃO tem variáveis Figma — todos os valores abaixo foram lidos nó a nó.

## 1. Alma do design

Streetwear premium editorial. Página clara (creme rosado) com tinta preta e um único
vermelho puro de marca. As fotos escuras (correntes/joias cravejadas em peito e mãos
tatuadas) fazem o contraste dramático contra o fundo claro. Uma **grade editorial de
hairlines pretas verticais** costura todas as seções, como papel de revista pautado.
Sem raio de borda em NADA: botão, cards, imagens = cantos retos. Luxo bruto.

## 2. Tokens (centralizados por mim, hardcoded no arquivo)

### Cor
| papel | valor |
|---|---|
| `bg-page` (seções claras) | `#FFF6F6` (creme rosado) e `#FFFFFF` (seções de foto/produto) |
| `bg-ink` (navbar, cards depoimento) | `#080808` (navbar) / `#000000` (cards) |
| `brand-red` | `#FF0000` puro (wordmark hero, CTA, watermark) |
| `brand-red-watermark` | `rgba(255,0,0,0.2)` (G gigante da navbar) |
| `overlay-foto` | `rgba(0,0,0,0.4)` no hero; `rgba(0,0,0,0.2)` nas categorias |
| `text-ink` | `#000000` |
| `text-on-dark` | `#FFFFFF` |
| `divider-sutil` | `#666666` (traço de atribuição no depoimento) |
| hairlines da grade | preto, ~1px (linhas vetor no Figma) |

### Tipografia (5 vozes, cada uma com papel único)
| voz | fonte | uso | tamanhos lidos |
|---|---|---|---|
| Wordmark | **Hyperwave One** (script brush) | "G-NATION" no hero | 283.75px, vermelho |
| Watermark | **MONSTERA Regular** | "G" gigante rotacionado 90° na navbar | 2758px, rgba(255,0,0,.2) |
| Display de seção | **Benzin-Bold** | LANÇAMENTOS / DEPOIMENTOS / CONFIRA TAMBÉM: | 55–55.6px, preto, uppercase |
| UI/corpo | **Open Sauce One** (Light/SemiBold/Bold) | sub do hero (30 Light), CTA (30.77 Bold underline), título de card (26 SemiBold), preço (20 Light), CATEGORIA UM/DOIS (48.9 Bold), Explorar Mais (26.9 Light underline), VER MAIS (31.65 Light underline) | |
| Nav + depoimento | **Neue Montreal Regular** (nav 20.9px) e **Inter** (review 18 Regular lh 1.6, nome 14 SemiBold uppercase) | | |

Fallbacks se faltar licença: Hyperwave One ≈ script brush similar; Benzin-Bold ≈ display geométrico pesado; Open Sauce One ≈ Inter/Manrope. Confirmar o que o Framer tem antes de substituir.

### Grade editorial (a assinatura do layout)
- Trilhos verticais hairline em x = **46** e **1870** (margem de conteúdo = 46px de cada lado).
- Colunas internas variam por seção: CATEGORIA/LANÇAMENTOS dividem em x = **744** e **1339**;
  OUTROS PRODUTOS divide em 4 colunas iguais: x = 510 / 963.3 / 1416.7.
- Horizontais: y=426 dentro de LANÇAMENTOS (separa as 2 fileiras de produto);
  y=3267 global (linha 49→1870 no topo de DEPOIMENTOS).
- As linhas ATRAVESSAM as seções (top negativo, altura 1062–1176) — são contínuas, de página, não por-seção.

## 3. Seção por seção

### NAVBAR (27:40) — 1920×155, bg #080808
- Watermark: "G" MONSTERA 2758px, rotate 90°, rgba(255,0,0,0.2), vazando (left -270, top -506). Dá textura vermelha abstrata no canto direito.
- Logo central: imagem `assets/logo-navbar.png` (raw01), caixa 182×114 centrada, top 21.
- Links esquerda (x=150, y=65): G-SHOP · G-CUSTOMIZADAS · CONTATO — Neue Montreal 20.9px branco, gap 35.
- Ícones direita (x≈1622, y=61): carrinho / usuário / busca — mask groups brancos 34×34, gap 23 (`assets/icon-*.png` como máscara alpha, recoloríveis).

### HERO (27:57) — 1920×1080
- Foto `assets/hero-foto.png` (raw13, corrente no peito) **2043×1174 sangrando** (left -62, top -94), overlay preto 40%.
- "G-NATION" Hyperwave One 283.75px `red`, centrado, topo ~277 (~y 25.6% da seção).
- Sub centrado 800px de largura, Open Sauce One Light 30px branco, y≈488:
  "Marca de joias e acessórios de streetwear premium. Cultura de rua com acabamento de luxo. Curadoria fechada, peças com presença, preço que filtra."
- CTA: retângulo `red` **360×87 SEM raio**, centrado, y=644; "VER PEÇAS" Open Sauce One Bold 30.77px branco **sublinhado**.
- Ritmo vertical: título 277 → sub 488 → CTA 644.

### CATEGORIA (27:64) — 1920×1080, bg #FFF6F6
- Dois painéis-foto **900×901** lado a lado: esquerdo x=50, direito x=970, ambos y=56 (respiro de 56 top / ~123 bottom / vão central de 20).
- Cada painel: foto cover + overlay preto 20%, conteúdo ancorado embaixo (padding-y 75):
  "CATEGORIA UM/DOIS" Open Sauce One Bold 48.9px branco + "Explorar Mais" Light 26.9px sublinhado, gap 15, centrado.
- Fotos: esquerda = raw06/categoria-um-b + hero-foto empilhadas; direita = `assets/categoria-dois.png` (raw16, corrente com letra A).
- Hairlines: x=46, 744, 1339, 1870 atravessando (altura 1176, vazando da seção).

### DESTAQUE DE LANÇAMENTO (27:77) — 1920×950, bg #FFF6F6
- Coluna editorial esquerda (x=98, 593 de largura, centrada verticalmente, gap 287):
  "LANÇAMENTOS" Benzin-Bold 55.6px centrado → "VER MAIS" Open Sauce Light 31.65px sublinhado → "Os mais recentes Lançamentos da G-Nation" Light 30px (w 399).
- Grade de 4 produtos em 2×2 à direita: colunas x=851 e 1414, fileiras y=41 e 508, célula = **card de produto** (ver §4).
- Hairlines: verticais 46/744/1339/1870 + horizontal y=426 entre as fileiras.

### PROVA SOCIAL — DEPOIMENTOS (27:103) — 1920×561, bg #FFF6F6
- "DEPOIMENTOS" Benzin-Bold 55px preto, centrado, y=58.
- 4 cards pretos 400×306 em linha centrada (gap 50), y=178 (ver §4).
- Hairlines 46/1870; linha horizontal de topo y=3267 global.

### PROVA SOCIAL — BANNER DUPLO (27:172) — 1920×936, bg #FFFFFF
- Duas fotos gigantes lado a lado, centradas, sangrando verticalmente (top -177):
  esquerda `assets/banner-esq.png` 1060×1324 (homem de balaclava Nike), direita `assets/banner-dir.png` 1032×1289 (mãos tatuadas com anéis).
- **ANOTAÇÃO DE PRODUTO no Figma**: "Quando a pessoa clicar no banner ela vai para uma coleção" → cada banner é um LINK para coleção.

### OUTROS PRODUTOS (27:176) — 1920×488, bg #FFFFFF
- "CONFIRA TAMBÉM:" Benzin-Bold 55px em 2 linhas (lh 1.4), x=96, centrado verticalmente.
- 3 cards de produto nas 3 colunas restantes (y=69.5), colunas separadas por hairlines 510/963/1417/1870.

## 4. Componentes reutilizáveis

### Card de produto (aparece 7×: 4 em Lançamentos, 3 em Confira Também)
- Coluna auto-layout 381 de largura, gap 8, centrado:
  1. Título "Título da jóia Rara dos cara" — Open Sauce One SemiBold 26px preto centrado
  2. Foto da joia 269×276 (no Figma está **rotacionada 90°** — a foto raw06/produto-joia.png é a corrente borboleta)
  3. Preço "4.000 BRL" — Open Sauce One Light 20px preto centrado
- Sem card/borda/sombra: produto flutua no creme, separado só pelas hairlines da grade.

### Card de depoimento
- Preto sólido 400×306, padding 40, coluna gap 24, SEM raio:
  1. rating-row: 5 estrelas 16px (assets/star.png), gap 4
  2. review: Inter Regular 18px branco, line-height 1.6 (inglês placeholder — traduzir na versão final?)
  3. attribution: traço 12×1 #666 + "MARCUS HENDERSON" Inter SemiBold 14px uppercase branco, gap 8

### Painel de categoria
- 900×901, foto cover + overlay 20%, texto centrado ancorado no rodapé (pad 75): título Bold 48.9 + link sublinhado Light 26.9, gap 15.

## 5. Regras de fidelidade pro Framer
- Cantos retos em tudo. Nada de radius, nada de sombra suave genérica.
- O vermelho é UM só (#FF0000) e aparece pouco: wordmark, CTA, watermark. Não espalhar.
- Hairlines contínuas de página são parte do design — construir como elementos reais.
- Fotos sempre sangrando/cover com overlay preto (40% hero / 20% categorias), nunca a foto "encaixada".
- Placeholders reais do arquivo: títulos "Título da jóia Rara dos cara" e "4.000 BRL" — trocar por produto real quando houver, manter formato.
- Banner duplo = link pra coleção (anotação do designer).
- Navbar: NÃO mexer por enquanto (pedido do usuário — sem acesso via MCP ao componente atual).
