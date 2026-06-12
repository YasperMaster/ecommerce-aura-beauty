import mongoose from "mongoose"

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
        category: {
            type: String,
            required: true,
            trim: true,
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
    },
    {
        _id: false,
    },
)

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
        items: {
            type: [OrderItemSchema],
            required: true,
            validate: {
                validator: (items) => items.length > 0,
                message: "Order must contain at least one item",
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
            preferenceId: {
                type: String,
                trim: true,
                default: "",
            },
            paymentId: {
                type: Number,
                default: null,
            },
            merchantOrderId: {
                type: String,
                trim: true,
                default: "",
            },
            status: {
                type: String,
                trim: true,
                default: "",
            },
            statusDetail: {
                type: String,
                trim: true,
                default: "",
            },
            initPoint: {
                type: String,
                trim: true,
                default: "",
            },
        },
    },
    {
        timestamps: true,
    },
)

export default mongoose.model("Order", OrderSchema)
