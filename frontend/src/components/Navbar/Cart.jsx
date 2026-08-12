import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useCart } from "../../context/CartContext";

const PULSE_DURATION_MS = 900;

const Cart = () => {
  const { itemCount, cartPulseKey } = useCart();
  const [isPulsing, setIsPulsing] = useState(false);
  const isFirstPulseRef = useRef(true);
  const itemCountRef = useRef(itemCount);

  // Keep a ref of the latest itemCount so the pulse effect below can read
  // an up-to-date value without needing itemCount itself as a dependency
  // (which would re-fire the pulse on every quantity change elsewhere,
  // e.g. from the cart page — not just on an actual addItem).
  useEffect(() => {
    itemCountRef.current = itemCount;
  }, [itemCount]);

  // Briefly animate the icon whenever an item is added, so there's a clear
  // "look here" cue pointing at where it landed.
  useEffect(() => {
    if (isFirstPulseRef.current) {
      isFirstPulseRef.current = false;
      return;
    }

    // Guard against animating for an empty cart (e.g. any edge case where
    // this fires without a real addition landing).
    if (itemCountRef.current <= 0) return;

    setIsPulsing(true);
    const timeout = setTimeout(() => setIsPulsing(false), PULSE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [cartPulseKey]);

  return (
    <div className="relative">
      <Link
        aria-label="Ir al carrito"
        className={`btn btn-circle btn-primary btn-outline relative ${
          isPulsing ? "animate-cart-pop ring-4 ring-primary/50" : ""
        }`}
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
        <span
          className={`badge badge-sm indicator-item absolute -right-1 -top-1 ${
            isPulsing ? "badge-secondary" : ""
          }`}
        >
          {itemCount}
        </span>
      </Link>

      {/* Bottom-aligned tooltip, pointing up at the cart icon */}
      {isPulsing && (
        <div
          className="animate-tooltip-pop pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap"
          role="status"
        >
          <div className="relative rounded-full bg-neutral px-3 py-1.5 text-xs font-medium text-neutral-content shadow-lg">
            <span
              aria-hidden="true"
              className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-neutral"
            />
            Producto añadido
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;