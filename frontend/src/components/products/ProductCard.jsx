import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router";
import { useCart } from "../../context/CartContext";
import { useUser } from "../../context/UserContext";
import { formatCurrency } from "../../utils/formatters";

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { addItem, getItemQuantity } = useCart();
  const { isAuthenticated } = useUser();

  const hasVariants = Boolean(product.optionGroup?.options?.length);

  // For a product with variants, there's no single "stock" number that
  // makes sense to reserve against here — each option has its own. Show
  // the combined total just so the card isn't blank, but the actual
  // reservation/selection happens on the product detail page.
  const reservedQuantity = hasVariants ? 0 : getItemQuantity(product._id);
  const availableStock = hasVariants
    ? product.optionGroup.options.reduce((sum, o) => sum + o.stock, 0)
    : Math.max(product.stock - reservedQuantity, 0);

  const productUrl = `/product/${product._id}`;

  const handleAddToCart = (e) => {
    // stop propagation if event provided (button click)
    if (e && e.stopPropagation) e.stopPropagation();

    if (hasVariants) {
      // Ambiguous which option they want from the grid — send them to the
      // product page where they can actually pick one.
      navigate(productUrl);
      return;
    }

    if (!isAuthenticated) {
      toast.error("Iniciá sesión para agregar productos al carrito.");
      // redirect back to this product after login
      navigate(`/login`, { state: { redirectTo: `/product/${product._id}` } });
      return;
    }

    if (availableStock <= 0) {
      toast.error("No hay más stock disponible para este producto.");
      return;
    }

    addItem(product);
    toast.success(`${product.title} agregado al carrito.`);
  };

  return (
    <article className="card h-full overflow-hidden rounded-box border border-base-300/80 bg-base-100/90 shadow-sm backdrop-blur transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
      <Link
        aria-label={`Ver detalles de ${product.title}`}
        className="product-card-link block h-full"
        to={productUrl}
      >
        <figure className="aspect-[4/3] overflow-hidden">
          <img
            alt={product.title}
            className="h-full w-full object-cover"
            src={product.image}
          />
        </figure>
        <div className="card-body gap-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="card-title text-lg">{product.title}</h2>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(product.price)}
            </span>
          </div>
          <p className="text-sm text-base-content/70">{product.description}</p>
          <div className="mt-auto flex items-center justify-between gap-3">
            <span className="text-sm text-base-content/60">
              {availableStock > 0 ? `${availableStock} disponibles` : "Sin stock"}
            </span>
          </div>
        </div>
      </Link>
      <div className="card-actions justify-end px-4 pb-4">
        <button
          className="btn btn-primary"
          disabled={availableStock === 0}
          onClick={handleAddToCart}
          type="button"
        >
          {hasVariants ? "Ver opciones" : "Agregar"}
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
