import "./Mosaic.css";

const TILES = [
  "mosaic/tile-1.png",
  "mosaic/tile-2.png",
  "products/tennis-ice.png",
  "mosaic/tile-4.png",
  "mosaic/tile-5.png",
  "products/anel-cruz-ice.png",
  "mosaic/tile-7.png",
  "products/anel-cruz-royal.png",
  "mosaic/tile-9.png",
  "products/trevo-royal.png",
  "products/elo-grumet.png",
  "mosaic/tile-12.png",
];

export default function Mosaic() {
  return (
    <section className="mosaic">
      {TILES.map((t, i) => (
        <div className="mosaic__tile" key={i}>
          <img src={`/assets/${t}`} alt="" />
        </div>
      ))}
    </section>
  );
}
