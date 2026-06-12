import { Link } from "react-router";
import { useCart } from "../../context/CartContext";

const Cart = () => {
  const { itemCount } = useCart();

  return (
    <Link
      aria-label="Ir al carrito"
      className="btn btn-circle btn-primary btn-outline relative"
      to="/cart"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
      <span className="badge badge-sm indicator-item absolute -right-1 -top-1">
        {itemCount}
      </span>
    </Link>
  );
};

export default Cart;
