import mongoose from "mongoose";
import { ZodError } from "zod";
import ProductModel from "../models/ProductModel.js";
import { productSchema } from "../schemas/productSchema.js";

const PUBLIC_PRODUCT_FIELDS =
  "_id slug title description longDescription category image images price stock isActive optionGroup";
const ADMIN_PRODUCT_FIELDS = `${PUBLIC_PRODUCT_FIELDS} createdAt updatedAt`;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildUniqueSlug = async (title, excludeProductId = null) => {
  const baseSlug = slugify(title) || `product-${Date.now()}`;
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await ProductModel.findOne({
      slug: candidate,
      ...(excludeProductId ? { _id: { $ne: excludeProductId } } : {}),
    }).select("_id");

    if (!existing) return candidate;

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
};

const parseProductPayload = (body) =>
  productSchema.parse({
    title: body?.title,
    description: body?.description,
    longDescription: body?.longDescription,
    category: body?.category,
    image: body?.image,
    images: body?.images,
    price: body?.price,
    stock: body?.stock,
    isActive: body?.isActive,
    optionGroup: body?.optionGroup ?? null,
  });

const handleProductError = (res, error) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Los datos del producto no son válidos.",
      issues: error.flatten(),
    });
  }

  console.error(error);
  return res.status(500).json({ message: "No se pudo procesar el producto." });
};

export const getProducts = async (_req, res) => {
  try {
    const products = await ProductModel.find({ isActive: true })
      .select(PUBLIC_PRODUCT_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json(products);
  } catch (error) {
    return handleProductError(res, error);
  }
};

export const getAdminProducts = async (_req, res) => {
  try {
    const products = await ProductModel.find({})
      .select(ADMIN_PRODUCT_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json(products);
  } catch (error) {
    return handleProductError(res, error);
  }
};

export const getProductById = async (req, res) => {
  try {
    if (!isValidId(req.params.productId)) {
      return res.status(400).json({ message: "ID de producto no válido." });
    }

    const product = await ProductModel.findOne({
      _id: req.params.productId,
      isActive: true,
    }).select(PUBLIC_PRODUCT_FIELDS);

    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    return res.status(200).json(product);
  } catch (error) {
    return handleProductError(res, error);
  }
};

export const createProduct = async (req, res) => {
  try {
    const parsedData = parseProductPayload(req.body);
    const slug = await buildUniqueSlug(parsedData.title);

    const product = await ProductModel.create({
      ...parsedData,
      slug,
      optionGroup: parsedData.optionGroup || undefined,
    });

    return res.status(201).json({
      message: "Producto creado correctamente.",
      product,
    });
  } catch (error) {
    return handleProductError(res, error);
  }
};

export const updateProduct = async (req, res) => {
  try {
    if (!isValidId(req.params.productId)) {
      return res.status(400).json({ message: "ID de producto no válido." });
    }

    const existingProduct = await ProductModel.findById(req.params.productId);

    if (!existingProduct) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    const parsedData = parseProductPayload(req.body);
    const slug =
      parsedData.title !== existingProduct.title
        ? await buildUniqueSlug(parsedData.title, existingProduct._id)
        : existingProduct.slug;

    existingProduct.title = parsedData.title;
    existingProduct.description = parsedData.description;
    existingProduct.longDescription = parsedData.longDescription || existingProduct.longDescription;
    existingProduct.category = parsedData.category;
    existingProduct.image = parsedData.image || existingProduct.image;
    existingProduct.images = Array.isArray(parsedData.images) ? parsedData.images : existingProduct.images;
    existingProduct.price = parsedData.price;
    existingProduct.stock = parsedData.stock;
    existingProduct.isActive = parsedData.isActive;
    existingProduct.slug = slug;
    existingProduct.optionGroup = parsedData.optionGroup || undefined;
    existingProduct.markModified("optionGroup");

    await existingProduct.save();

    return res.status(200).json({
      message: "Producto actualizado correctamente.",
      product: existingProduct,
    });
  } catch (error) {
    return handleProductError(res, error);
  }
};

export const deleteProduct = async (req, res) => {
  try {
    if (!isValidId(req.params.productId)) {
      return res.status(400).json({ message: "ID de producto no válido." });
    }

    const product = await ProductModel.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    await product.deleteOne();

    return res
      .status(200)
      .json({ message: "Producto eliminado correctamente." });
  } catch (error) {
    return handleProductError(res, error);
  }
};