import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { formatCurrency } from "../utils/formatters";
import { useCart } from "../context/CartContext";
import ImageCarousel from "../components/products/ImageCarousel";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let mounted = true;
    async function fetchProduct() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/products/${id}`);
        if (!res.ok) {
          setProduct(null);
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (!mounted) return;
        setProduct(data);
      } catch (err) {
        console.error(err);
        setProduct(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchProduct();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!product) return <div className="p-6">Producto no encontrado</div>;

  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.image
      ? [product.image]
      : [];

  const availableStock = product.stock ?? 0;

  function handleAddToCart() {
    if (availableStock <= 0) return;
    addItem({
      ...product,
      quantity: qty,
    });
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <ImageCarousel images={images} />
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">{product.title}</h1>
          <p className="text-lg text-primary mb-4">{formatCurrency(product.price)}</p>
          <p className="mb-4 text-sm text-base-content/70">
            {product.longDescription || product.description}
          </p>

          <p className="mb-4">
            <strong>Stock:</strong> {availableStock > 0 ? availableStock : "Sin stock"}
          </p>

          <div className="flex items-center gap-3 mb-4">
            <label className="flex items-center gap-2">
              Cantidad:
              <input
                type="number"
                min="1"
                max={availableStock}
                value={qty}
                onChange={(e) =>
                  setQty(Math.max(1, Math.min(availableStock, Number(e.target.value || 1))))
                }
                className="input input-bordered w-24"
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="btn btn-primary"
              onClick={handleAddToCart}
              disabled={availableStock <= 0}
              type="button"
            >
              Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
