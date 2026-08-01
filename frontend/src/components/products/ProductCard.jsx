import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router";
import { useCart } from "../../context/CartContext";
import { useUser } from "../../context/UserContext";
import { formatCurrency } from "../../utils/formatters";

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { addItem, getItemQuantity } = useCart();
  const { isAuthenticated } = useUser();

  const reservedQuantity = getItemQuantity(product._id);
  const availableStock = Math.max(product.stock - reservedQuantity, 0);

  const handleAddToCart = (e) => {
    // stop propagation if event provided (button click)
    if (e && e.stopPropagation) e.stopPropagation();

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

  const productUrl = `/product/${product._id}`;

  return (
    <article className="card h-full bg-base-100 shadow-xl transition-transform duration-200 hover:-translate-y-1">
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
          Agregar
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
