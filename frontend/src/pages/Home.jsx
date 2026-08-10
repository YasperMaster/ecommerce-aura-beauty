import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router";
import heroImage from "../assets/background.png";
import PageLoader from "../components/common/PageLoader";
import FadeInOnScroll from "../components/common/FadeInOnScroll";
import ProductGrid from "../components/products/ProductGrid";
import { useCart } from "../context/CartContext";
import { getProductsService } from "../services/productServices";

const Home = () => {
  const { pathname } = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { syncProductStock } = useCart();

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const productList = await getProductsService();
      setProducts(productList);
      syncProductStock(productList);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [syncProductStock]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (pathname === "/products") {
      document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [pathname, loading]);

  return (
    <div className="space-y-10 py-10">
      <section className="relative overflow-hidden rounded-box border border-base-300/80 bg-base-100/90 px-6 py-10 shadow-sm backdrop-blur lg:px-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-24 h-40 bg-gradient-to-b from-primary/10 to-transparent blur-2xl"
        />
        <div className="hero-content relative flex-col gap-8 lg:flex-row-reverse">
          {/* Logo — appears first with a smooth scale-up */}
          <div
            className="h-[300px] w-[300px] shrink-0 overflow-hidden rounded-full border border-base-300/80 bg-white shadow-2xl lg:h-[360px] lg:w-[360px] animate-scale-up animation-delay-100"
          >
            <img
              alt="Aura Beauty logo"
              className="h-full w-full object-cover object-center"
              src={heroImage}
            />
          </div>

          {/* Text + button block — animated as a single cohesive unit */}
          <div className="max-w-xl animate-fade-up animation-delay-100">
            <span className="badge badge-primary badge-outline mb-4">
              Nuevo sitio web
            </span>
            <h1 className="font-display text-4xl italic font-semibold leading-tight lg:text-5xl">
              Belleza para todos los días
            </h1>
            <p className="py-6 text-base-content/75">
              Descubrí productos de maquillaje y cosmética.
              <br />
              Registrate, armá tu carrito y finalizá tu compra.
            </p>
            <a className="btn btn-primary" href="#products">
              Ver productos
            </a>
          </div>
        </div>
      </section>

      <section className="space-y-5" id="products">
        <FadeInOnScroll translateY={16} threshold={0.3}>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-base-content/60">
                Catálogo
              </p>
              <h2 className="font-display text-3xl italic font-semibold">
                Productos disponibles
              </h2>
            </div>
            <p className="text-sm text-base-content/70">
              Agregá productos y pasá directo al carrito para pagar.
            </p>
          </div>
        </FadeInOnScroll>

        {loading && <PageLoader message="Cargando productos..." />}

        {!loading && error && (
          <div className="rounded-box border border-error/30 bg-error/10 p-6 text-error">
            {error}
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="rounded-box border border-base-300 bg-base-100 p-6 text-base-content/70 shadow-sm">
            No hay productos disponibles por ahora.
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <ProductGrid products={products} />
        )}
      </section>
    </div>
  );
};

export default Home;
