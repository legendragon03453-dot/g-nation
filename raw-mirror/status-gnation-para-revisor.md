# gnation — status do porte Framer → código (React/Vite)

## Contexto
Site original construído no Framer (marca de streetwear/joias "gnation"), publicado em
`https://easier-daisy-091687.framer.app`. Objetivo: reconstruir fielmente em código
(React + Vite + framer-motion), com assets originais e efeitos de motion reais — sem usar
o plugin pago de export (React Export / unframer, US$450+/ano), extraindo em vez disso o
código-fonte real via os source maps (`.map`) que a própria Framer publica junto com o
site (contêm `sourcesContent` com o JS não-minificado gerado pela Framer para cada
componente, incluindo valores exatos de spring/scroll/timing).

## Páginas que existem no projeto Framer (via API do projeto)
| Rota | Status no clone |
|---|---|
| `/` (Home) | ✅ Construída — todas as 8 seções (Hero, Shop, About, Works, Services, Testimonials, Grid, Contact) com assets originais + efeitos de motion reais extraídos do source map |
| `/projects` | ❌ Não iniciada |
| `/projects/:slug` | ❌ Não iniciada (detalhe de projeto/CMS) |
| `/about` | ❌ Não iniciada |
| `/contact` | ❌ Não iniciada |
| `/produto` | ❌ Não iniciada |
| `/correntes` | ❌ Não iniciada |
| `/conta` | ❌ Não iniciada |
| `/page` | ❌ Não iniciada — nome genérico, conteúdo ainda não investigado |
| `/page-2` | ❌ Não iniciada — nome genérico, conteúdo ainda não investigado |
| `/404` | ❌ Não iniciada |

## O que já foi validado na Home
- Efeito real do hero: as duas fotos se abrem feito portas (±1000px) conforme o scroll,
  usando o valor exato de `transformTrigger:"onScrollTarget"` encontrado no source.
- Crossfade automático das fotos do hero (troca a cada 1000ms, spring
  `damping:30 mass:0.1 stiffness:300`).
- Marquee de logos e do slideshow de contato com motor real de `px/segundo` (não CSS
  keyframe estimado).
- Reveal de títulos ao entrar em viewport (fade + subida 40px, spring
  `damping:50 stiffness:200`), replicando o `ContainerWithFX` real da Framer.
- Cor de fundo confirmada `#000000` puro (não era um token, era literal) em todas as
  seções escuras; navbar corrigida para sólida.

## Pergunta pro revisor
Dado esse método (extração de source map, sem gasto), quais seções/páginas você
recomendaria priorizar a seguir, e há algo no que já foi descrito acima que parece
faltando, redundante, ou merece reconsideração antes de continuar?
