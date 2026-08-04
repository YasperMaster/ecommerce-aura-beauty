import { useEffect, useState } from "react";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import PageLoader from "../components/common/PageLoader";
import { getMyOrdersService } from "../services/checkoutServices";
import { formatCurrency, formatDateTime } from "../utils/formatters";

const MyPurchases = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      try {
        const data = await getMyOrdersService();
        if (isMounted) setOrders(data);
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <h1 className="text-3xl font-bold text-center">Mis compras</h1>
      <p className="mt-2 text-center text-sm text-base-content/70">
        Acá podés revisar el detalle de todas tus compras aprobadas.
      </p>

      <div className="mt-8">
        {isLoading ? (
          <PageLoader message="Cargando tus compras..." />
        ) : error ? (
          <div className="rounded-box border border-error/30 bg-error/10 p-6 text-center text-error">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-box border border-base-300 bg-base-100 p-6 text-center shadow-sm">
            Todavía no tenés compras registradas.
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <article
                className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm"
                key={order._id}
              >
                <div className="flex flex-col gap-2 border-b border-base-300 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-base-content/60">
                      Orden #{order._id}
                    </p>
                    <p className="text-sm text-base-content/70">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <p className="text-lg font-bold">
                    Total: {formatCurrency(order.totalAmount)}
                  </p>
                </div>

                <div className="mt-3 divide-y divide-base-200">
                  {order.items.map((item, index) => (
                    <div
                      className="flex items-center justify-between gap-4 py-2"
                      key={`${order._id}-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          alt={item.title}
                          className="h-14 w-14 rounded-xl object-cover"
                          src={item.image}
                        />
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-base-content/60">
                            {formatCurrency(item.unitPrice)} x{item.quantity}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 rounded-box border border-base-300 bg-base-100 p-6 text-center shadow-sm">
        <p className="text-base-content/80">
          ¿Tenés alguna duda? Contactáte conmigo y te doy una mano
        </p>
        <div className="flex justify-center items-center gap-4 text-sm text-base-content/70">
              <a
                aria-label="Instagram de Aura Beauty (@aura_beauty2625)"
                className="btn btn-ghost btn-sm gap-2"
                href="https://instagram.com/aura_beauty2625"
                rel="noreferrer"
                target="_blank"
              >
                <FaInstagram size={18} /> @aura_beauty2625
              </a>
              <a
                aria-label="WhatsApp de Aura Beauty (+54 346 459-4165)"
                className="btn btn-ghost btn-sm gap-2"
                href="https://wa.me/543464594165"
                rel="noreferrer"
                target="_blank"
              >
                <FaWhatsapp size={18} /> 3464594165
              </a>
            </div>
      </div>
    </div>
  );
};

export default MyPurchases;
