import { formatCurrency } from "../../utils/formatters";

const CartItemRow = ({ item, onDecrease, onIncrease, onRemove }) => {
  return (
    <article className="flex flex-col gap-4 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm md:flex-row md:items-center">
      <img
        alt={item.title}
        className="h-24 w-full rounded-xl object-cover md:w-24"
        src={item.image}
      />

      <div className="flex-1">
        <h2 className="text-lg font-semibold">{item.title}</h2>
        <p className="text-sm text-base-content/70">
          Stock disponible: {item.stock}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          aria-label={`Quitar una unidad de ${item.title}`}
          className="btn btn-outline btn-sm"
          onClick={onDecrease}
          type="button"
        >
          -
        </button>
        <span aria-live="polite" className="min-w-8 text-center font-semibold">
          {item.quantity}
        </span>
        <button
          aria-label={`Agregar una unidad de ${item.title}`}
          className="btn btn-outline btn-sm"
          onClick={onIncrease}
          type="button"
        >
          +
        </button>
      </div>

      <div className="text-right">
        <p className="font-semibold">
          {formatCurrency(item.price * item.quantity)}
        </p>
        <p className="text-sm text-base-content/60">
          {formatCurrency(item.price)} c/u
        </p>
      </div>

      <button
        aria-label={`Eliminar ${item.title} del carrito`}
        className="btn btn-ghost text-error"
        onClick={onRemove}
        type="button"
      >
        Eliminar
      </button>
    </article>
  );
};

export default CartItemRow;
