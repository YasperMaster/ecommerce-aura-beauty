import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router";
import CartItemRow from "../components/cart/CartItemRow";
import { useCart } from "../context/CartContext";
import { useUser } from "../context/UserContext";
import { createCheckoutPreferenceService } from "../services/checkoutServices";
import { formatCurrency } from "../utils/formatters";

const Cart = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart, updateQuantity, removeItem } = useCart();
  const { isAuthenticated } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error("Tu carrito está vacío.");
      return;
    }

    if (!isAuthenticated) {
      toast.error("Necesitás iniciar sesión para comprar.");
      navigate("/login", { state: { redirectTo: "/cart" } });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await createCheckoutPreferenceService(
        items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      );

      window.location.href = response.checkoutUrl;
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <section className="mx-auto mt-16 max-w-2xl rounded-box border border-base-300 bg-base-100 p-10 text-center shadow-sm">
        <h1 className="text-3xl font-bold">Tu carrito está vacío</h1>
        <p className="mt-3 text-base-content/70">
          Agregá productos del catálogo para iniciar tu compra.
        </p>
        <Link className="btn btn-primary mt-6" to="/">
          Explorar productos
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-8 py-10 lg:grid-cols-[1.6fr_0.9fr]">
      <div className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-base-content/60">
            Carrito
          </p>
          <h1 className="text-3xl font-bold">Revisá tu selección</h1>
        </div>

        {items.map((item) => (
          <CartItemRow
            item={item}
            key={item.id}
            onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
            onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
            onRemove={() => removeItem(item.id)}
          />
        ))}

        <Link
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          to="/"
        >
          ← Añadí más productos
        </Link>
      </div>

      <aside className="rounded-box border border-base-300 bg-base-100 p-6 shadow-sm lg:sticky lg:top-6 lg:h-fit">
        <h2 className="text-2xl font-bold">Resumen</h2>
        <div className="mt-6 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Artículos</span>
            <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
          </div>
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
        </div>

        <div className="divider" />

        {!isAuthenticated && (
          <div className="mb-4 rounded-box border border-warning/40 bg-warning/10 p-4 text-sm text-warning-content">
            Para continuar con Mercado Pago tenés que iniciar sesión.
          </div>
        )}

        <button
          className="btn btn-primary w-full"
          disabled={isSubmitting}
          onClick={handleCheckout}
          type="button"
        >
          {isSubmitting ? "Redirigiendo..." : "Pagar con Mercado Pago"}
        </button>
        <button
          className="btn btn-ghost mt-3 w-full"
          onClick={clearCart}
          type="button"
        >
          Vaciar carrito
        </button>
      </aside>
    </section>
  );
};

export default Cart;
