# Roteiro — Cena "Categorias que abrem pros Lançamentos"

Data: 2026-07-14. Status: AGUARDANDO VALIDAÇÃO do usuário antes de construir.

## A ideia (do usuário)
O efeito slice do template sai do hero (hero agora aparece direto, FEITO) e vai pra
seção de categorias: as fotos que aparecem/trocam são produtos DA categoria em si.
Ao scrollar em cima de categoria, ela "abre" revelando a seção de Lançamentos com
produtos de verdade. O Figma continua sendo o sitemap (CATEGORIA 27:64 e
DESTAQUE DE LANÇAMENTO 27:77 continuam existindo visualmente), a criatividade
está na TRANSIÇÃO entre as duas.

## O mecanismo real do template (investigado, não chutado)
- "Images Left" (M4x9izFWJ) e "Images Right" (ayjHFrJ1o): componentes com 4 variantes,
  cada um com 3 fotos empilhadas (z3 visível, z2/z1 opacity 0). A troca de variante faz
  crossfade entre as fotos. A animação (loop/tempo) vive nas interações do componente,
  invisível no XML mas preservada por duplicateNode.
- O "abrir" do hero original: PreScroll sticky (z2) segurava os dois painéis por ~1100px
  de scroll e depois rolava pra fora, revelando o conteúdo de baixo (z1). Não é transform
  lateral, é cover sticky + reveal.
- Foto 1 do painel esquerdo já é a corrente no peito (mesma do hero, dedup do Framer).

## A cena (Fase 1 — mecânica comprovada)

```
CategoriaLancamentos (nova seção na home, entre HERO e Shop; altura ~260vh; bg #FFF6F6)
├── CoverCategorias (sticky top 0, 100vh, z2)        ← papel do antigo PreScroll
│   ├── PainelGShop (1fr × 100vh)                    ← duplicata de Images Left
│   │   fotos: peças prontas (corrente peito, medalhão águia, pulseira trevo)
│   │   por cima: overlay preto 20% + "G-SHOP" (Bold 37px) + "Explorar Mais"
│   │   sublinhado, ancorados embaixo (como o Figma 27:66), link /correntes
│   ├── PainelGCustom (1fr × 100vh)                  ← duplicata de Images Right
│   │   fotos: peças custom (pingente letra A, ghostface, letra custom)
│   │   por cima: overlay 20% + "G-CUSTOMIZADAS" + "Explorar Mais", link coleção custom
│   └── hairlines verticais (proporção da grade do Figma: 46/744/1339/1870 ÷ 1.333)
└── LancamentosContent (z1, revelado quando o cover rola embora)
    layout FIEL ao Figma 27:77 em escala 0.75:
    ├── coluna editorial esquerda x≈74: "LANÇAMENTOS" (Archivo extrabold ~42px,
    │   substituto do Benzin) + "VER MAIS" sublinhado + "Os mais recentes
    │   Lançamentos da G-Nation"
    ├── grid 2×2 de cards de produto (título SemiBold 20px + foto + preço Light 15px),
    │   produtos reais do CMS (Trevo Royal, Scream Iced, Medalhão Águia, Berserk Gold)
    └── hairlines verticais + linha horizontal entre as fileiras (y≈320)
```

Leitura do visitante: hero → duas categorias vivas (fotos de produto trocando em
crossfade, cada lado com a cara da sua categoria) → continua scrollando → as categorias
sobem revelando os lançamentos, produtos concretos. A transição acontece ATRAVÉS do
conteúdo (categorias literalmente dão lugar aos produtos delas).

## Fase 2 — CORTINA REAL (em execução, 2026-07-14 noite)
Descoberta no código-fonte espelhado (raw-mirror/original-source/augiA20Il.js): o efeito
"fatias abrem" do template NÃO está nos componentes (eles só fazem crossfade 1s/variante,
spring damping 30). Está em SCROLL TRANSFORMS gravados nas INSTÂNCIAS originais dentro
do PreScroll da página:
- painel esq (lAvMpg3xJ): transform onScrollTarget, threshold 0.5, alvo = seção hero
  (eW193xwPS), destino x = -1000 (voa pra esquerda)
- painel dir (wkasS6n00): idem com x = +1000 (voa pra direita)
- ScrollInstruction: opacity -> 0 no mesmo alvo
- entradas: esq desliza de x -300, dir de x +300 (spring 200/30)

A ponte MCP não cria/edita esses efeitos, mas MOVER os nós preserva. PLANO:
1. Transplantar o PreScroll original (yBmG2Oa1g, com ImageSlices + as 2 instâncias FX)
   pra dentro de CategoriaLancamentos (V98WxdyRP), como 1º filho, visible=true.
2. Mover overlay (dZH6N8At1) e os 2 grupos de rótulos (CcQvFacso, BSKAeZdox) pra dentro
   do PreScroll (z2/z3 sobre as fatias).
3. WhiteUnder (dXR7DSprw) -> #080808: quando as fatias voam, sobra cortina PRETA com os
   nomes das categorias em branco (contraste ok), que depois sobe revelando LANÇAMENTOS.
4. Esconder ScrollInstruction (HhYBidUe0) e deletar o cover antigo (veHk4Q9mb com as
   instâncias sem efeito).
5. PASSO MANUAL DO USUÁRIO (efeito não é editável via MCP): no editor, selecionar cada
   painel dentro do PreScroll -> painel Effects/Scroll Transform -> trocar o Scroll
   Target da seção hero antiga pra seção CategoriaLancamentos. Sem isso o voo dispara
   cedo demais (alvo antigo = hero, que sai da tela antes do cover pinar).

## Decisões assumidas (falar se discordar)
1. Nomes das categorias = G-SHOP e G-CUSTOMIZADAS (o Figma diz "CATEGORIA UM/DOIS",
   placeholder; a navbar do próprio Figma nomeia as duas).
2. Grid de lançamentos usa 4 das 6 peças do CMS existente.
3. "Explorar Mais" esquerdo → /correntes; direito → /projects (vira coleção custom depois).
4. As seções antigas do template (Shop, About etc.) ficam intactas por enquanto;
   vão sendo substituídas seção por seção.

## Ordem de construção (quando autorizado)
1. duplicateNode nos componentes Images Left/Right → renomear "Categoria G-Shop" /
   "Categoria G-Custom" (originais intocados).
2. Trocar as 3 fotos de cada duplicata (URLs de asset do Figma MCP; catbox não funciona).
3. Criar a seção CategoriaLancamentos na home (container alto + cover sticky + painéis
   + textos/overlay/hairlines).
4. Construir LancamentosContent fiel ao 27:77 embaixo.
5. QA: getNodeXml + zoom + conferência visual contra home-full.png; um passo por vez
   (updateXmlForNode com upload dá timeout se a operação for gorda).
6. Apresentar pro usuário validar antes de ir pra DEPOIMENTOS.
