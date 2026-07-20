import { Routes, Route, useParams, useLocation } from "react-router-dom";
import RadarBackground from "./components/RadarBackground";
import SoundToggle from "./components/SoundToggle";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Curtain from "./components/Curtain";
import Depoimentos from "./components/Depoimentos";
import ImageGrid from "./components/ImageGrid";
import OutrosProdutos from "./components/OutrosProdutos";
import Footer from "./components/Footer";
import ProductPage from "./components/ProductPage";
import CollectionPage from "./components/CollectionPage";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import CartDrawer from "./components/CartDrawer";
import { CartProvider } from "./CartContext";

// Home enxuta, na ordem exata do frame HOME do Figma (27:39):
// NAVBAR (27:40) → HERO (27:57) → CATEGORIA (27:64, as fatias da Curtain)
// → DESTAQUE DE LANÇAMENTO (27:77, revelado atrás da Curtain) →
// PROVA SOCIAL/Depoimentos (27:103) → PROVA SOCIAL/Banner Duplo (27:172,
// ImageGrid) → OUTROS PRODUTOS (27:176) → footer (27:196).
// Seções que existiam no código mas NÃO existem no Figma (Shop, About,
// Works, Services, Testimonials antigo, Contact, Mosaic) foram removidas
// da home — os arquivos continuam no repositório, só saíram da rota.
function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Curtain />
        <Depoimentos />
        <ImageGrid />
        <OutrosProdutos />
      </main>
      <Footer />
    </>
  );
}

// key={slug} força remount ao trocar de produto via navegação client-side
// (ex.: clicar em "Confira também") — sem isso o React Router só re-
// renderiza a mesma instância, e o useState local (foto ativa, material,
// tamanho selecionado) ficaria preso no produto anterior.
function ProductPageRoute() {
  const { slug } = useParams();
  return <ProductPage key={slug} />;
}

function CollectionPageRoute() {
  const { slug } = useParams();
  return <CollectionPage key={slug} />;
}

// ProductPage e CollectionPage têm navbar/footer próprios (fiéis aos
// nodes 27:400 e 27:670 do Figma) — ficam direto na rota.
// O botão de som acompanha as páginas de conteúdo do site; numa tela de
// entrada (login) ele só polui o canto. Único uso da rota aqui.
const ROTAS_SEM_SOM = ["/login", "/criar-conta"];

function SiteSound() {
  const { pathname } = useLocation();
  const nua = ROTAS_SEM_SOM.some((r) => pathname.startsWith(r));
  return nua ? null : <SoundToggle />;
}

function App() {
  return (
    // CartProvider por fora de tudo: o ícone da navbar (contador), a
    // página de produto (adicionar) e a gaveta precisam do mesmo estado.
    <CartProvider>
      <RadarBackground />
      <SiteSound />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/produto/:slug" element={<ProductPageRoute />} />
          <Route path="/colecao/:slug" element={<CollectionPageRoute />} />
          {/* Telas de conta (node 27:368): entrada, sem navbar/footer —
              o cartão é o conteúdo inteiro e elas têm o próprio "voltar".
              As duas usam a mesma casca (AuthShell). */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/criar-conta" element={<RegisterPage />} />
        </Routes>
      </div>
      {/* fora do .app-content: a gaveta cobre a página inteira */}
      <CartDrawer />
    </CartProvider>
  );
}

export default App;
