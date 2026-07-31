import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router";
import PageLoader from "../components/common/PageLoader";
import ImageCarousel from "../components/products/ImageCarousel";
import { useCart } from "../context/CartContext";
import { useUser } from "../context/UserContext";
import { getProductByIdService } from "../services/productServices";
import { formatCurrency } from "../utils/formatters";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, getItemQuantity } = useCart();
  const { isAuthenticated } = useUser();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getProductByIdService(id);
        if (isMounted) {
          setProduct(data);
          setQty(1);
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Same source of truth ProductCard uses: don't let someone add more than
  // is actually left once whatever's already in their cart is accounted for.
  const reservedQuantity = product ? getItemQuantity(product._id) : 0;
  const availableStock = product
    ? Math.max(product.stock - reservedQuantity, 0)
    : 0;

  const images = useMemo(() => {
    if (!product) return [];
    if (product.images?.length > 0) return product.images;
    return product.image ? [product.image] : [];
  }, [product]);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error("Iniciá sesión para agregar productos al carrito.");
      navigate("/login", { state: { redirectTo: `/product/${id}` } });
      return;
    }

    if (availableStock <= 0) {
      toast.error("No hay más stock disponible para este producto.");
      return;
    }

    addItem(product, qty);
    toast.success(`${product.title} agregado al carrito.`);
  };

  if (loading) {
    return <PageLoader message="Cargando producto..." />;
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-[600px] px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">
          {error || "Producto no encontrado"}
        </h1>
        <p className="mt-2 text-sm text-base-content/70">
          Puede que el producto ya no esté disponible.
        </p>
        <Link className="btn btn-primary mt-6" to="/products">
          Volver a productos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8">
      <Link
        className="link link-primary text-sm"
        to="/products"
      >
        ← Volver a productos
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
        {/* The photo is the star here — it gets the wider column and the
            carousel is keyed by product id so switching between products
            never leaves the slide index pointing at a stale, out-of-range
            image from the previous product. */}
        <div>
          <ImageCarousel images={images} key={product._id} />
        </div>

        <div className="flex flex-col">
          {product.category && (
            <span className="badge badge-ghost mb-2 w-fit">
              {product.category}
            </span>
          )}
          <h1 className="text-3xl font-bold">{product.title}</h1>
          <p className="mt-2 text-2xl font-bold text-primary">
            {formatCurrency(product.price)}
          </p>

          <p className="mt-4 whitespace-pre-line text-base-content/80">
            {product.longDescription || product.description}
          </p>

          <p className="mt-4 text-sm">
            {availableStock > 0 ? (
              <span className="text-base-content/70">
                Stock disponible: <strong>{availableStock}</strong>
              </span>
            ) : (
              <span className="font-semibold text-error">Sin stock</span>
            )}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm" htmlFor="qty">
              Cantidad
              <input
                className="input input-bordered input-no-spinner w-20"
                disabled={availableStock <= 0}
                id="qty"
                inputMode="numeric"
                max={availableStock || 1}
                min="1"
                onChange={(e) => {
                  const parsed = Number(e.target.value);
                  const clamped = Math.min(
                    Math.max(parsed || 1, 1),
                    availableStock || 1,
                  );
                  setQty(clamped);
                }}
                type="number"
                value={qty}
              />
            </label>
          </div>

          <button
            className="btn btn-primary btn-lg mt-6 w-full sm:w-fit"
            disabled={availableStock <= 0}
            onClick={handleAddToCart}
            type="button"
          >
            {availableStock <= 0 ? "Sin stock" : "Agregar al carrito"}
          </button>

          {reservedQuantity > 0 && (
            <p className="mt-2 text-xs text-base-content/60">
              Ya tenés {reservedQuantity} en tu carrito.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
