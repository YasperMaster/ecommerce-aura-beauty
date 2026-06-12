import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { useCart } from "../../context/CartContext";
import { useUser } from "../../context/UserContext";
import { formatCurrency } from "../../utils/formatters";

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { addItem, getItemQuantity } = useCart();
  const { isAuthenticated } = useUser();

  const reservedQuantity = getItemQuantity(product._id);
  const availableStock = Math.max(product.stock - reservedQuantity, 0);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error("Iniciá sesión para agregar productos al carrito.");
      navigate("/login", {
        state: {
          redirectTo: "/",
        },
      });
      return;
    }

    if (availableStock <= 0) {
      toast.error("No hay más stock disponible para este producto.");
      return;
    }

    addItem(product);
    navigate("/cart");
  };

  return (
    <article className="card h-full bg-base-100 shadow-xl transition-transform duration-200 hover:-translate-y-1">
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
          <button
            className="btn btn-primary"
            disabled={availableStock === 0}
            onClick={handleAddToCart}
            type="button"
          >
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
