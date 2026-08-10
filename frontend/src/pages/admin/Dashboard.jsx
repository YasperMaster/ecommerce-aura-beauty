import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import PageLoader from "../../components/common/PageLoader";
import { getAdminOrdersService } from "../../services/checkoutServices";
import {
  createProductService,
  deleteProductService,
  getAdminProductsService,
  updateProductService,
} from "../../services/productServices";
import { formatCurrency, formatDateTime } from "../../utils/formatters";

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

const emptyValues = {
  title: "",
  description: "",
  price: "",
  stock: "",
  isActive: true,
};

const capitalizeFirst = (value) =>
  value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const MAX_TOTAL_IMAGES = 9; // 1 main + up to 8 additional
const MAX_OPTIONS = 12;

let localOptionKeyCounter = 0;
// Local-only key for React list rendering, since a brand new option has no
// _id yet (the backend assigns one on save). Never sent to the API.
const makeLocalOptionKey = () => `local-${++localOptionKeyCounter}`;

const emptyOption = () => ({
  _localKey: makeLocalOptionKey(),
  _id: undefined,
  label: "",
  image: "",
  stock: "",
});

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [allImages, setAllImages] = useState([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [optionGroupName, setOptionGroupName] = useState("");
  const [options, setOptions] = useState([]); // [] means "no variants"
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: emptyValues });

  const loadProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const adminProducts = await getAdminProductsService();
      setProducts(adminProducts);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      const adminOrders = await getAdminOrdersService();
      setOrders(adminOrders);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, [loadProducts, loadOrders]);

  const sortedProducts = useMemo(
    () =>
      [...products].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      ),
    [products],
  );

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [orders],
  );

  const startEditing = (product) => {
    setEditingProductId(product._id);
    const images = [product.image, ...(product.images || [])];
    setAllImages(images);
    setOptionGroupName(product.optionGroup?.name || "");
    setOptions(
      (product.optionGroup?.options || []).map((option) => ({
        _localKey: makeLocalOptionKey(),
        _id: option._id,
        label: option.label,
        image: option.image,
        stock: String(option.stock),
      })),
    );
    reset({
      title: product.title,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      isActive: product.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const stopEditing = () => {
    setEditingProductId(null);
    setAllImages([]);
    setImageUrlInput("");
    setOptionGroupName("");
    setOptions([]);
    reset(emptyValues);
  };

  const handleImagesUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = ""; // allow re-selecting the same file later

    if (files.length === 0) return;

    const invalidFile = files.find((file) => !file.type.startsWith("image/"));
    if (invalidFile) {
      toast.error("Subí solamente archivos de imagen.");
      return;
    }

    if (allImages.length + files.length > MAX_TOTAL_IMAGES) {
      toast.error(`Podés cargar hasta ${MAX_TOTAL_IMAGES} imágenes en total.`);
      return;
    }

    try {
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      setAllImages((current) => [...current, ...dataUrls]);
      toast.success(
        dataUrls.length > 1
          ? "Imágenes agregadas correctamente."
          : "Imagen agregada correctamente.",
      );
    } catch {
      toast.error("No se pudieron procesar las imágenes seleccionadas.");
    }
  };

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;

    if (allImages.length >= MAX_TOTAL_IMAGES) {
      toast.error(`Podés cargar hasta ${MAX_TOTAL_IMAGES} imágenes en total.`);
      return;
    }

    setAllImages((current) => [...current, url]);
    setImageUrlInput("");
  };

  const handleRemoveImage = (index) => {
    setAllImages((current) => current.filter((_, i) => i !== index));
  };

  const handleAddOption = () => {
    if (options.length >= MAX_OPTIONS) {
      toast.error(`Podés agregar hasta ${MAX_OPTIONS} opciones.`);
      return;
    }
    setOptions((current) => [...current, emptyOption()]);
  };

  const handleRemoveOption = (localKey) => {
    setOptions((current) => current.filter((o) => o._localKey !== localKey));
  };

  const handleOptionFieldChange = (localKey, field, value) => {
    const nextValue = field === "label" ? capitalizeFirst(value) : value;
    setOptions((current) =>
      current.map((o) =>
        o._localKey === localKey ? { ...o, [field]: nextValue } : o,
      ),
    );
  };

  const handleOptionImageUpload = async (localKey, event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Subí solamente archivos de imagen.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      handleOptionFieldChange(localKey, "image", dataUrl);
    } catch {
      toast.error("No se pudo procesar la imagen seleccionada.");
    }
  };

  const onSubmit = async (values) => {
    if (allImages.length === 0) {
      toast.error("Agregá al menos una imagen para el producto.");
      return;
    }

    const hasAnyOptionInput =
      optionGroupName.trim().length > 0 || options.length > 0;

    let optionGroupPayload = null;

    if (hasAnyOptionInput) {
      if (!optionGroupName.trim()) {
        toast.error("Ingresá un nombre para el grupo de opciones (ej: Color).");
        return;
      }
      if (options.length === 0) {
        toast.error("Agregá al menos una opción, o quitá el nombre del grupo si no querés usar opciones.");
        return;
      }
      const incompleteOption = options.find(
        (o) => !o.label.trim() || !o.image || o.stock === "",
      );
      if (incompleteOption) {
        toast.error("Completá la etiqueta, imagen y stock de cada opción.");
        return;
      }

      optionGroupPayload = {
        name: optionGroupName.trim(),
        options: options.map((o) => ({
          ...(o._id ? { _id: o._id } : {}),
          label: o.label.trim(),
          image: o.image,
          stock: Number(o.stock),
        })),
      };
    }

    try {
      setSubmitting(true);

      const payload = {
        title: values.title,
        description: values.description,
        image: allImages[0],
        images: allImages.slice(1),
        price: Number(values.price),
        stock: options.length > 0 ? 0 : Number(values.stock),
        isActive: Boolean(values.isActive),
        optionGroup: optionGroupPayload,
      };

      const response = editingProductId
        ? await updateProductService(editingProductId, payload)
        : await createProductService(payload);

      toast.success(response.message);
      stopEditing();
      await loadProducts();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (productId) => {
    const confirmed = window.confirm(
      "¿Seguro que querés eliminar este producto?",
    );
    if (!confirmed) return;

    try {
      const response = await deleteProductService(productId);
      toast.success(response.message);
      if (editingProductId === productId) stopEditing();
      await loadProducts();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <section className="space-y-10 py-10">
      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.25fr]">
        {/* ── Form ─────────────────────────────────────────── */}
        <div className="rounded-box border border-base-300 bg-base-100 p-6 shadow-sm xl:sticky xl:top-6 xl:h-fit">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-base-content/60">
                Panel de administrador
              </p>
              <h1 className="text-3xl font-bold">Cargá un producto</h1>
            </div>
            {editingProductId && (
              <button
                className="btn btn-ghost"
                onClick={stopEditing}
                type="button"
              >
                Cancelar edición
              </button>
            )}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="label" htmlFor="title">
                <span className="label-text">Título</span>
              </label>
              <input
                {...register("title", {
                  required: "Ingresá un título.",
                  minLength: {
                    value: 3,
                    message: "Debe tener al menos 3 caracteres.",
                  },
                })}
                className="input input-bordered w-full"
                id="title"
                placeholder="Título del producto"
                type="text"
              />
              {errors.title && (
                <p className="mt-2 text-sm text-error">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="description">
                <span className="label-text">Descripción</span>
              </label>
              <textarea
                {...register("description", {
                  required: "Ingresá una descripción.",
                  minLength: {
                    value: 10,
                    message: "Debe tener al menos 10 caracteres.",
                  },
                })}
                className="textarea textarea-bordered min-h-28 w-full"
                id="description"
                placeholder="Descripción comercial del producto"
              />
              {errors.description && (
                <p className="mt-2 text-sm text-error">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* ── Unified images section ─────────────────── */}
            <div className="space-y-3 rounded-box border border-base-300 p-4">
              <div>
                <span className="label-text font-medium">
                  Imágenes del producto
                </span>
                <p className="text-xs text-base-content/60">
                  Podés subir hasta {MAX_TOTAL_IMAGES} imágenes en total.
                </p>
              </div>

              {allImages.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {allImages.map((src, index) => (
                    <div className="relative" key={`${src}-${index}`}>
                      <img
                        alt={`Imagen ${index + 1}`}
                        className="h-20 w-20 rounded-xl object-cover shadow"
                        src={src}
                      />
                      {index === 0 && (
                        <span className="badge badge-primary badge-xs absolute -bottom-2 -left-2">
                          Principal
                        </span>
                      )}
                      <button
                        aria-label="Quitar imagen"
                        className="btn btn-circle btn-error btn-xs absolute -right-2 -top-2"
                        onClick={() => handleRemoveImage(index)}
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Custom file input with Spanish labels */}
              <div className="flex items-center gap-3">
                <input
                  accept="image/*"
                  className="hidden"
                  disabled={allImages.length >= MAX_TOTAL_IMAGES}
                  id="image-upload"
                  multiple
                  onChange={handleImagesUpload}
                  type="file"
                />
                <label
                  className={`btn btn-outline ${allImages.length >= MAX_TOTAL_IMAGES ? "btn-disabled" : ""}`}
                  htmlFor="image-upload"
                >
                  Seleccionar imágenes
                </label>
                <span className="text-sm text-base-content/60">
                  {allImages.length > 0
                    ? `${allImages.length} imágenes cargadas`
                    : "Ninguna imagen seleccionada"}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  className="btn btn-outline"
                  disabled={
                    !imageUrlInput.trim() ||
                    allImages.length >= MAX_TOTAL_IMAGES
                  }
                  onClick={handleAddImageUrl}
                  type="button"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* ── Optional variant options (Color, Talle, etc.) ─────── */}
            <div className="space-y-3 rounded-box border border-base-300 p-4">
              <div>
                <span className="label-text font-medium">
                  Opciones del producto (opcional)
                </span>
                <p className="text-xs text-base-content/60">
                  Usalo si el producto viene en distintas variantes — por
                  ejemplo Color, Talle o Tipo. Cada opción tiene su propia
                  imagen y su propio stock. El precio es el mismo para todas.
                </p>
              </div>

              <div>
                <label className="label" htmlFor="option-group-name">
                  <span className="label-text">Nombre del grupo</span>
                </label>
                <input
                  className="input input-bordered w-full"
                  id="option-group-name"
                  onChange={(e) => setOptionGroupName(capitalizeFirst(e.target.value))}
                  placeholder="Ej: Color, Talle, Tipo"
                  type="text"
                  value={optionGroupName}
                />
              </div>

              {options.length > 0 && (
                <div className="space-y-3">
                  {options.map((option, index) => (
                    <div
                      className="flex flex-col gap-3 rounded-box border border-base-300 p-3 sm:flex-row sm:items-center"
                      key={option._localKey}
                    >
                      {option.image ? (
                        <img
                          alt={option.label || `Opción ${index + 1}`}
                          className="h-16 w-16 shrink-0 rounded-xl object-cover"
                          src={option.image}
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-base-300 text-xs text-base-content/40">
                          Sin foto
                        </div>
                      )}

                      <div className="flex-1 space-y-2">
                        <input
                          className="input input-bordered input-sm w-full"
                          onChange={(e) =>
                            handleOptionFieldChange(
                              option._localKey,
                              "label",
                              e.target.value,
                            )
                          }
                          placeholder="Etiqueta (ej: Rojo)"
                          type="text"
                          value={option.label}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            accept="image/*"
                            className="hidden"
                            id={`option-image-${option._localKey}`}
                            onChange={(e) =>
                              handleOptionImageUpload(option._localKey, e)
                            }
                            type="file"
                          />
                          <label
                            className="btn btn-outline btn-xs"
                            htmlFor={`option-image-${option._localKey}`}
                          >
                            {option.image ? "Cambiar imagen" : "Subir imagen"}
                          </label>
                          <input
                            className="input input-bordered input-sm w-24"
                            inputMode="numeric"
                            min="0"
                            onChange={(e) =>
                              handleOptionFieldChange(
                                option._localKey,
                                "stock",
                                e.target.value,
                              )
                            }
                            placeholder="Stock"
                            step="1"
                            type="number"
                            value={option.stock}
                          />
                        </div>
                      </div>

                      <button
                        aria-label={`Quitar opción ${option.label || index + 1}`}
                        className="btn btn-ghost btn-sm text-error self-start sm:self-center"
                        onClick={() => handleRemoveOption(option._localKey)}
                        type="button"
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn btn-outline btn-sm"
                disabled={options.length >= MAX_OPTIONS}
                onClick={handleAddOption}
                type="button"
              >
                + Agregar opción
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="price">
                  <span className="label-text">Precio</span>
                </label>
                <input
                  {...register("price", {
                    required: "Ingresá un precio.",
                    min: {
                      value: 0,
                      message: "El precio no puede ser negativo.",
                    },
                  })}
                  className="input input-bordered input-no-spinner w-full"
                  id="price"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  type="number"
                />
                {errors.price && (
                  <p className="mt-2 text-sm text-error">
                    {errors.price.message}
                  </p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="stock">
                  <span className="label-text">Stock</span>
                </label>
                <input
                  {...register("stock", {
                    required: 
                      options.length === 0 ? "Ingresá el stock." : false,
                    min: {
                      value: 0,
                      message: "El stock no puede ser negativo.",
                    },
                  })}
                  className={`input input-bordered input-no-spinner w-full ${
                    options.length > 0
                      ? "cursor-not-allowed bg-base-200 text-base-content/40"
                      : ""
                  }`}
                  disabled={options.length > 0}
                  id="stock"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  type="number"
                />
                {errors.stock && (
                  <p className="mt-2 text-sm text-error">
                    {errors.stock.message}
                  </p>
                )}
                {options.length > 0 && (
                  <p className="mt-2 text-xs text-base-content/60">
                    Se ignora: cada opción de abajo tiene su propio stock.
                  </p>
                )}
              </div>
            </div>

            <label className="label cursor-pointer justify-start gap-3">
              <input
                {...register("isActive")}
                className="checkbox checkbox-primary"
                type="checkbox"
              />
              <span className="label-text">
                Producto visible en el catálogo
              </span>
            </label>

            <button
              className="btn btn-primary w-full"
              disabled={submitting}
              type="submit"
            >
              {submitting
                ? "Guardando..."
                : editingProductId
                  ? "Actualizar producto"
                  : "Crear producto"}
            </button>
          </form>
        </div>

        {/* ── Product list ─────────────────────────────────── */}
        <div className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-base-content/60">
              Inventario
            </p>
            <h2 className="text-3xl font-bold">Productos cargados</h2>
          </div>

          {productsLoading ? (
            <PageLoader message="Cargando inventario..." />
          ) : sortedProducts.length === 0 ? (
            <div className="rounded-box border border-base-300 bg-base-100 p-6 shadow-sm">
              Todavía no hay productos creados.
            </div>
          ) : (
            <div className="grid gap-4">
              {sortedProducts.map((product) => (
                <article
                  className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm"
                  key={product._id}
                >
                  <div className="flex flex-col gap-4 md:flex-row">
                    <div className="flex flex-col items-start gap-2 md:w-40">
                      <img
                        alt={product.title}
                        className="h-32 w-full rounded-2xl object-cover"
                        src={product.image}
                      />
                      {product.images?.length > 0 && (
                        <span className="badge badge-neutral badge-sm">
                          +{product.images.length} foto
                          {product.images.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">
                            {product.title}
                          </h3>
                          <p className="mt-1 text-sm text-base-content/70">
                            {product.description}
                          </p>
                        </div>
                        <span
                          className={`badge ${product.isActive ? "badge-success" : "badge-ghost"}`}
                        >
                          {product.isActive ? "Visible" : "Oculto"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-base-content/70">
                        <span>
                          Precio:{" "}
                          <strong>{formatCurrency(product.price)}</strong>
                        </span>
                        <span>
                          Stock:{" "}
                          <strong>
                            {product.optionGroup?.options?.length
                              ? product.optionGroup.options.reduce(
                                  (sum, o) => sum + o.stock,
                                  0,
                                )
                              : product.stock}
                          </strong>
                        </span>
                      </div>
                      {product.optionGroup?.options?.length > 0 && (
                        <p className="text-sm text-base-content/70">
                          {product.optionGroup.name}:{" "}
                          {product.optionGroup.options
                            .map((o) => `${o.label} (${o.stock})`)
                            .join(", ")}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => startEditing(product)}
                          type="button"
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-outline btn-error btn-sm"
                          onClick={() => handleDelete(product._id)}
                          type="button"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Orders ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-base-content/60">
            Ventas
          </p>
          <h2 className="text-3xl font-bold">Órdenes recientes</h2>
        </div>

        {ordersLoading ? (
          <PageLoader message="Cargando órdenes..." />
        ) : sortedOrders.length === 0 ? (
          <div className="rounded-box border border-base-300 bg-base-100 p-6 shadow-sm">
            Aún no se registraron compras.
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedOrders.map((order) => (
              <article
                className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm"
                key={order._id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-base-content/60">
                      Orden #{order._id}
                    </p>
                    <h3 className="text-lg font-semibold">
                      {order.user?.fullName || order.fullName || order.userEmail}
                    </h3>
                    <p className="text-sm text-base-content/70">
                      {order.userEmail}
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm text-base-content/70">
                      <span>
                        Teléfono:{" "}
                        <strong>{order.userPhone || "No informado"}</strong>
                      </span>
                      <span>
                        Total:{" "}
                        <strong>{formatCurrency(order.totalAmount)}</strong>
                      </span>
                      <span>
                        Estado:{" "}
                        <strong>
                          {STATUS_LABEL[order.status] || order.status}
                        </strong>
                      </span>
                      <span>
                        Fecha:{" "}
                        <strong>{formatDateTime(order.createdAt)}</strong>
                      </span>
                    </div>
                  </div>
                  <span
                    className={`badge badge-lg ${
                      STATUS_BADGE_CLASS[order.status] || "badge-ghost"
                    }`}
                  >
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {order.items.map((item, index) => (
                    <div
                      className="rounded-box bg-base-200 p-3"
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
                          {item.variantLabel && (
                            <p className="text-sm text-base-content/60">
                              {item.variantLabel}
                            </p>
                          )}
                          <p className="text-sm text-base-content/60">
                            x{item.quantity}
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
    </section>
  );
};

export default Dashboard;