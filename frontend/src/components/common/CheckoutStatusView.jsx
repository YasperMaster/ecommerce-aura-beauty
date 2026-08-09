import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useUser } from "../../context/UserContext";
import { useCart } from "../../context/CartContext";
import { getOrderStatusService } from "../../services/checkoutServices";
import { formatCurrency } from "../../utils/formatters";
import PageLoader from "./PageLoader";

// Poll interval for pending payments (bank transfer, ATM, etc.)
const POLL_INTERVAL_MS = 8000;
const MAX_POLLS = 15; // stop after ~2 minutes

const STATUS_LABEL = {
  approved: "Completada",
  pending: "Pendiente",
  in_process: "En proceso",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

const STATUS_BADGE_CLASS = {
  approved: "badge-success",
  pending: "badge-warning",
  in_process: "badge-warning",
  rejected: "badge-error",
  cancelled: "badge-ghost",
};

const contentByVariant = {
  success: {
    badge: "Pago recibido",
    title: "¡Gracias por tu compra!",
    description:
      "Tu pedido fue registrado. En algunos métodos de pago puede demorar unos minutos. En breve me voy a poner en contacto con vos.",
    alertClass: "alert-success",
  },
  pending: {
    badge: "Pago pendiente",
    title: "Tu pago todavía está en proceso",
    description:
      "Mercado Pago informó que la operación sigue pendiente. Actualizamos el estado automáticamente cada pocos segundos.",
    alertClass: "alert-warning",
  },
  failure: {
    badge: "Pago no completado",
    title: "La compra no pudo completarse",
    description:
      "No se confirmó el pago. Revisá el estado de la orden y, si querés, volvé al carrito para intentarlo nuevamente.",
    alertClass: "alert-error",
  },
};

const CheckoutStatusView = ({ variant }) => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useUser();
  const { clearCart } = useCart();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pollCountRef = useRef(0);
  const pollTimerRef = useRef(null);

  const orderId = searchParams.get("orderId");
  const viewContent = useMemo(() => contentByVariant[variant], [variant]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const fetchOrder = useCallback(async () => {
    if (!orderId || !isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const orderData = await getOrderStatusService(orderId);
      setOrder(orderData);
      setError("");
      return orderData;
    } catch (fetchError) {
      setError(fetchError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [orderId, isAuthenticated]);

  // On success/pending pages, poll until the order is in a terminal state
  const shouldPoll = variant === "success" || variant === "pending";

  const scheduleNextPoll = useCallback(
    (currentOrder) => {
      if (!shouldPoll) return;

      const isTerminal =
        currentOrder?.status === "approved" ||
        currentOrder?.status === "rejected" ||
        currentOrder?.status === "cancelled";

      if (isTerminal || pollCountRef.current >= MAX_POLLS) {
        stopPolling();
        return;
      }

      pollTimerRef.current = setTimeout(async () => {
        pollCountRef.current += 1;
        const updated = await fetchOrder();
        scheduleNextPoll(updated);
      }, POLL_INTERVAL_MS);
    },
    [shouldPoll, fetchOrder, stopPolling],
  );

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const initialOrder = await fetchOrder();

      if (!isMounted) return;

      scheduleNextPoll(initialOrder);
    };

    init();

    return () => {
      isMounted = false;
      stopPolling();
    };
  }, [fetchOrder, scheduleNextPoll, stopPolling]);

  // Clear cart when the user lands on the success page (optimistic — the
  // user is done with the cart) OR when the order transitions to "approved"
  // during polling on the pending page.
  useEffect(() => {
    if (variant === "success") {
      clearCart();
    }
  }, [variant, clearCart]);

  // Also clear the cart when a pending order becomes approved during polling
  useEffect(() => {
    if (order?.status === "approved") {
      clearCart();
    }
  }, [order?.status, clearCart]);

  if (loading) {
    return <PageLoader message="Consultando el estado de tu compra..." />;
  }

  return (
    <section className="mx-auto mt-10 flex max-w-3xl flex-col gap-6">
      <div className={`alert ${viewContent.alertClass} shadow-lg`}>
        <div className="flex flex-col gap-2">
          <span className="badge badge-outline w-fit">{viewContent.badge}</span>
          <h1 className="text-2xl font-bold">{viewContent.title}</h1>
          <p>{viewContent.description}</p>
        </div>
      </div>

      {!orderId && (
        <div className="rounded-box border border-base-300 bg-base-100 p-6 shadow-sm">
          <p className="text-base-content/70">
            No recibimos un identificador de compra. Si acabás de volver de
            Mercado Pago, revisá tu sesión e intentá nuevamente.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-box border border-error/30 bg-error/10 p-6 text-error">
          {error}
        </div>
      )}

      {order && (
        <div className="rounded-box border border-base-300 bg-base-100 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-base-content/60">
                Orden
              </p>
              <p className="font-mono text-sm font-semibold">#{order._id}</p>
            </div>
            <div className="flex items-center gap-3">
              {(order.status === "pending" ||
                order.status === "in_process") && (
                <span className="loading loading-spinner loading-xs text-warning" />
              )}
              <span
                className={`badge badge-lg capitalize ${
                  STATUS_BADGE_CLASS[order.status] || "badge-ghost"
                }`}
              >
                {STATUS_LABEL[order.status] || order.status}
              </span>
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-base-content/60">
                Total
              </p>
              <p className="font-semibold">
                {formatCurrency(order.totalAmount)}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {order.items.map((item) => (
              <div
                className="flex items-center gap-4 rounded-box bg-base-200 p-3"
                key={item.product}
              >
                <img
                  alt={item.title}
                  className="h-16 w-16 rounded-xl object-cover"
                  src={item.image}
                />
                <div className="flex-1">
                  <h2 className="font-semibold">{item.title}</h2>
                </div>
                <div className="text-right text-sm">
                  <p>x{item.quantity}</p>
                  <p className="font-semibold">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link className="btn btn-primary" to="/">
          Seguir comprando
        </Link>
        {variant !== "success" && (
          <Link className="btn btn-outline" to="/cart">
            Volver al carrito
          </Link>
        )}
      </div>
    </section>
  );
};

export default CheckoutStatusView;
