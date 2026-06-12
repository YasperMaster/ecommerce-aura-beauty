import { ZodError } from "zod";
import ProductModel from "../models/ProductModel.js";
import { productSchema } from "../schemas/productSchema.js";

const PUBLIC_PRODUCT_FIELDS =
  "_id slug title description image price stock isActive";
const ADMIN_PRODUCT_FIELDS = `${PUBLIC_PRODUCT_FIELDS} createdAt updatedAt`;

const slugify = (value) => {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const buildUniqueSlug = async (title, excludeProductId = null) => {
  const baseSlug = slugify(title) || `product-${Date.now()}`;
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const existingProduct = await ProductModel.findOne({
      slug: candidate,
      ...(excludeProductId ? { _id: { $ne: excludeProductId } } : {}),
    }).select("_id");

    if (!existingProduct) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
};

const parseProductPayload = (body) => {
  return productSchema.parse({
    title: body?.title,
    description: body?.description,
    image: body?.image,
    price: body?.price,
    stock: body?.stock,
    isActive: body?.isActive,
  });
};

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
  const products = await ProductModel.find({ isActive: true })
    .select(PUBLIC_PRODUCT_FIELDS)
    .sort({ createdAt: -1 });

  return res.status(200).json(products);
};

export const getAdminProducts = async (_req, res) => {
  const products = await ProductModel.find({})
    .select(ADMIN_PRODUCT_FIELDS)
    .sort({ createdAt: -1 });

  return res.status(200).json(products);
};

export const getProductById = async (req, res) => {
  const product = await ProductModel.findOne({
    _id: req.params.productId,
    isActive: true,
  }).select(PUBLIC_PRODUCT_FIELDS);

  if (!product) {
    return res.status(404).json({ message: "Producto no encontrado." });
  }

  return res.status(200).json(product);
};

export const createProduct = async (req, res) => {
  try {
    const parsedData = parseProductPayload(req.body);
    const slug = await buildUniqueSlug(parsedData.title);

    const product = await ProductModel.create({
      ...parsedData,
      slug,
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
    existingProduct.image = parsedData.image;
    existingProduct.price = parsedData.price;
    existingProduct.stock = parsedData.stock;
    existingProduct.isActive = parsedData.isActive;
    existingProduct.slug = slug;

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
  const product = await ProductModel.findById(req.params.productId);

  if (!product) {
    return res.status(404).json({ message: "Producto no encontrado." });
  }

  await product.deleteOne();

  return res.status(200).json({ message: "Producto eliminado correctamente." });
};
