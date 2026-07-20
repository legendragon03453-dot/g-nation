import { Routes, Route, useParams } from "react-router-dom";
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
function App() {
  return (
    <>
      <RadarBackground />
      <SoundToggle />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
      <Route path="/produto/:slug" element={<ProductPageRoute />} />
          <Route path="/colecao/:slug" element={<CollectionPageRoute />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
