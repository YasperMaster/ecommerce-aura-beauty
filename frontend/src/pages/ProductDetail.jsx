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
  const [selectedOptionId, setSelectedOptionId] = useState(null);

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
          setSelectedOptionId(null);
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

  const hasVariants = Boolean(product?.optionGroup?.options?.length);

  const selectedOption = useMemo(() => {
    if (!hasVariants || !selectedOptionId) return null;
    return (
      product.optionGroup.options.find((o) => o._id === selectedOptionId) ||
      null
    );
  }, [hasVariants, product, selectedOptionId]);

  // Same source of truth ProductCard uses: don't let someone add more than
  // is actually left once whatever's already in their cart is accounted for.
  const reservedQuantity = product
    ? getItemQuantity(product._id, selectedOption?._id || null)
    : 0;
  const stockForSelection = hasVariants
    ? selectedOption?.stock ?? 0
    : product?.stock ?? 0;
  const availableStock = Math.max(stockForSelection - reservedQuantity, 0);

  const images = useMemo(() => {
    if (!product) return [];

    // When a variant is selected, its own image leads the carousel so it's
    // the first thing shown — the product's other photos still follow, in
    // case someone wants to see the item's general angles/packaging too.
    const base = [product.image, ...(product.images || [])].filter(Boolean);

    if (selectedOption?.image) {
      return [
        selectedOption.image,
        ...base.filter((src) => src !== selectedOption.image),
      ];
    }

    return base;
  }, [product, selectedOption]);

  const handleSelectOption = (optionId) => {
    setSelectedOptionId(optionId);
    setQty(1);
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error("Iniciá sesión para agregar productos al carrito.");
      navigate("/login", { state: { redirectTo: `/product/${id}` } });
      return;
    }

    if (hasVariants && !selectedOption) {
      toast.error("Elegí una opción antes de agregar al carrito.");
      return;
    }

    if (availableStock <= 0) {
      toast.error("No hay más stock disponible para esta opción.");
      return;
    }

    const optionForCart = selectedOption
      ? { ...selectedOption, groupName: product.optionGroup.name }
      : null;

    addItem(product, qty, optionForCart);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        {/* The photo is the star here — it gets the wider column. Keyed by
            product AND selected option so the carousel resets to slide 0
            (showing that option's own image first) whenever the selection
            changes, instead of staying on whatever slide index it was on. */}
        <div>
          <ImageCarousel
            images={images}
            key={`${product._id}-${selectedOption?._id || "default"}`}
          />
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

          {hasVariants && (
            <div className="mt-6">
              <span className="text-sm font-medium">
                {product.optionGroup.name}
                {selectedOption ? `: ${selectedOption.label}` : ""}
              </span>
              <div className="mt-3 flex flex-wrap gap-3">
                {product.optionGroup.options.map((option) => {
                  const isSelected = option._id === selectedOption?._id;
                  const isOutOfStock = option.stock <= 0;

                  return (
                    <button
                      aria-label={`Elegir opción ${option.label}`}
                      aria-pressed={isSelected}
                      className={`flex flex-col items-center gap-1 rounded-box border-2 p-1.5 transition-colors ${
                        isSelected
                          ? "border-primary"
                          : "border-base-300 hover:border-base-content/30"
                      } ${isOutOfStock ? "opacity-40" : ""}`}
                      disabled={isOutOfStock}
                      key={option._id}
                      onClick={() => handleSelectOption(option._id)}
                      type="button"
                    >
                      <img
                        alt={option.label}
                        className="h-14 w-14 rounded-field object-cover"
                        src={option.image}
                      />
                      <span className="max-w-16 truncate text-xs">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p className="mt-4 text-sm">
            {hasVariants && !selectedOption ? (
              <span className="text-base-content/70">
                Elegí una opción para ver el stock disponible.
              </span>
            ) : availableStock > 0 ? (
              <span className="text-base-content/70">
                Stock disponible: <strong>{availableStock}</strong>
              </span>
            ) : (
              <span className="font-semibold text-error">Sin stock</span>
            )}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <span className="text-sm font-medium">Cantidad</span>
            <div className="flex items-center gap-2">
              <button
                aria-label={`Quitar una unidad de ${product.title}`}
                className="btn btn-outline btn-sm"
                disabled={availableStock <= 0 || qty <= 1}
                onClick={() => setQty((prev) => Math.max(prev - 1, 1))}
                type="button"
              >
                -
              </button>
              <span
                aria-live="polite"
                className="min-w-8 text-center font-semibold"
              >
                {qty}
              </span>
              <button
                aria-label={`Agregar una unidad de ${product.title}`}
                className="btn btn-outline btn-sm"
                disabled={availableStock <= 0 || qty >= availableStock}
                onClick={() =>
                  setQty((prev) => Math.min(prev + 1, availableStock || 1))
                }
                type="button"
              >
                +
              </button>
            </div>
          </div>

          <div
            className={`mt-6 w-full sm:w-fit ${
              availableStock > 0 && !(hasVariants && !selectedOption)
                ? "aura-glow-wrap text-primary"
                : ""
            }`}
          >
            <button
              className="btn btn-primary btn-lg w-full"
              disabled={availableStock <= 0}
              onClick={handleAddToCart}
              type="button"
            >
              {hasVariants && !selectedOption
                ? "Elegí una opción"
                : availableStock <= 0
                  ? "Sin stock"
                  : "Agregar al carrito"}
            </button>
          </div>

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