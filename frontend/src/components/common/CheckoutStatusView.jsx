import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { useUser } from "../../context/UserContext"
import { useCart } from "../../context/CartContext"
import { getOrderStatusService } from "../../services/checkoutServices"
import { formatCurrency } from "../../utils/formatters"
import PageLoader from "./PageLoader"

const contentByVariant = {
    success: {
        badge: "Pago recibido",
        title: "¡Tu compra fue iniciada correctamente!",
        description: "Mercado Pago te devolvió al sitio. Si el pago ya fue aprobado, el estado de tu orden se actualizará debajo.",
        alertClass: "alert-success",
    },
    pending: {
        badge: "Pago pendiente",
        title: "Tu pago todavía está en proceso",
        description: "Mercado Pago informó que la operación sigue pendiente. Podés revisar el estado actualizado de tu compra debajo.",
        alertClass: "alert-warning",
    },
    failure: {
        badge: "Pago no completado",
        title: "La compra no pudo completarse",
        description: "No se confirmó el pago en Mercado Pago. Revisá el estado de la orden y, si querés, volvé a intentarlo desde el carrito.",
        alertClass: "alert-error",
    },
}

const CheckoutStatusView = ({ variant }) => {
    const [searchParams] = useSearchParams()
    const { isAuthenticated } = useUser()
    const { clearCart } = useCart()
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const orderId = searchParams.get("orderId")
    const viewContent = useMemo(() => contentByVariant[variant], [variant])

    useEffect(() => {
        let isMounted = true

        const fetchOrder = async () => {
            if (!orderId || !isAuthenticated) {
                setLoading(false)
                return
            }

            try {
                const orderData = await getOrderStatusService(orderId)

                if (!isMounted) {
                    return
                }

                setOrder(orderData)
                setError("")
            } catch (fetchError) {
                if (!isMounted) {
                    return
                }

                setError(fetchError.message)
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        fetchOrder()

        return () => {
            isMounted = false
        }
    }, [orderId, isAuthenticated])

    useEffect(() => {
        if (variant === "success" && order?.status === "approved") {
            clearCart()
        }
    }, [variant, order?.status, clearCart])

    if (loading) {
        return <PageLoader message="Consultando el estado de tu compra..." />
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
                        No recibimos un identificador de compra. Si acabás de volver de Mercado Pago, revisá tu sesión y consultá nuevamente desde el carrito.
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
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm uppercase tracking-wide text-base-content/60">Orden</p>
                            <p className="font-semibold">#{order._id}</p>
                        </div>
                        <div>
                            <p className="text-sm uppercase tracking-wide text-base-content/60">Estado actual</p>
                            <span className="badge badge-primary badge-lg capitalize">{order.status}</span>
                        </div>
                        <div>
                            <p className="text-sm uppercase tracking-wide text-base-content/60">Total</p>
                            <p className="font-semibold">{formatCurrency(order.totalAmount)}</p>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        {order.items.map((item) => (
                            <div key={item.product} className="flex items-center gap-4 rounded-box bg-base-200 p-3">
                                <img alt={item.title} className="h-16 w-16 rounded-xl object-cover" src={item.image} />
                                <div className="flex-1">
                                    <h2 className="font-semibold">{item.title}</h2>
                                    <p className="text-sm text-base-content/70">{item.category}</p>
                                </div>
                                <div className="text-right text-sm">
                                    <p>Cantidad: {item.quantity}</p>
                                    <p>{formatCurrency(item.unitPrice)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                <Link className="btn btn-primary" to="/">Seguir comprando</Link>
                <Link className="btn btn-outline" to="/cart">Volver al carrito</Link>
            </div>
        </section>
    )
}

export default CheckoutStatusView
