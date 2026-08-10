import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    longDescription: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      required: false,
      trim: true,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    // Optional product variants — e.g. Color, Talle, Tipo. A product either
    // has no optionGroup at all (behaves exactly as before, using the
    // top-level price/stock/image), or has one with 1+ options, each with
    // its own image and its own stock count. Price stays the same across
    // all options of a product.
    optionGroup: {
      type: new mongoose.Schema(
        {
          name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 40,
          },
          options: {
            type: [
              new mongoose.Schema(
                {
                  label: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 60,
                  },
                  image: {
                    type: String,
                    required: true,
                    trim: true,
                  },
                  stock: {
                    type: Number,
                    required: true,
                    min: 0,
                    default: 0,
                  },
                },
                { _id: true },
              ),
            ],
            validate: {
              validator: (options) => options.length > 0,
              message: "El grupo de opciones debe tener al menos una opción.",
            },
          },
        },
        { _id: false },
      ),
      required: false,
      default: undefined,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Product", ProductSchema);