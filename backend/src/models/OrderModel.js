import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    // category is optional — products created without one must not block orders
    category: {
      type: String,
      trim: true,
      default: "",
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // Present only when the product had an option group (Color, Talle, etc.)
    // and the customer picked a specific option.
    variantOptionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    variantLabel: {
      // e.g. "Color: Rojo" — denormalized so order history still reads
      // correctly even if the product's options change or get removed later.
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    userPhone: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "El pedido debe contener al menos un producto.",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "ARS",
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_process", "approved", "rejected", "cancelled"],
      default: "pending",
      required: true,
    },
    paymentProvider: {
      type: String,
      default: "mercadopago",
      required: true,
      trim: true,
    },
    mercadoPago: {
      preferenceId: { type: String, trim: true, default: "" },
      paymentId: { type: Number, default: null },
      merchantOrderId: { type: String, trim: true, default: "" },
      status: { type: String, trim: true, default: "" },
      statusDetail: { type: String, trim: true, default: "" },
      initPoint: { type: String, trim: true, default: "" },
    },
    adminNotified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Order", OrderSchema);