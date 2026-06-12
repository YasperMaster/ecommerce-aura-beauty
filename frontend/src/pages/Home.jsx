import { useCallback, useEffect, useState } from "react";
import heroImage from "../assets/background.png";
import PageLoader from "../components/common/PageLoader";
import ProductGrid from "../components/products/ProductGrid";
import { useCart } from "../context/CartContext";
import { getProductsService } from "../services/productServices";

const Home = () => {
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

  return (
    <div className="space-y-10 py-10">
      <section className="hero overflow-hidden rounded-[2rem] bg-gradient-to-r from-primary/15 via-secondary/15 to-accent/10 px-6 py-10 lg:px-10">
        <div className="hero-content flex-col gap-8 lg:flex-row-reverse">
          <div className="h-[360px] w-full max-w-[300px] overflow-hidden rounded-3xl bg-white shadow-2xl lg:h-[460px] lg:max-w-[360px]">
            <img
              alt="Aura Beauty logo"
              className="h-full w-full object-cover object-center"
              src={heroImage}
            />
          </div>
          <div className="max-w-xl">
            <span className="badge badge-primary badge-outline mb-4">
              Nueva colección
            </span>
            <h1 className="text-4xl font-black leading-tight lg:text-5xl">
              Rutinas de belleza modernas para todos los días
            </h1>
            <p className="py-6 text-base-content/75">
              Descubrí skincare y makeup curados para una experiencia premium.
              Registrate, armá tu carrito y finalizá tu compra con Mercado Pago.
            </p>
            <a className="btn btn-primary" href="#products">
              Ver productos
            </a>
          </div>
        </div>
      </section>

      <section className="space-y-5" id="products">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-base-content/60">
              Catálogo
            </p>
            <h2 className="text-3xl font-bold">Productos disponibles</h2>
          </div>
          <p className="text-sm text-base-content/70">
            Agregá productos y pasá directo al carrito para pagar.
          </p>
        </div>

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
