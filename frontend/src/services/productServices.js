import { authApi, getApiErrorMessage, publicApi } from "./api";

export const getProductsService = async () => {
  try {
    const response = await publicApi.get("/products");
    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudieron cargar los productos."),
    );
  }
};

export const getProductByIdService = async (productId) => {
  try {
    const response = await publicApi.get(`/products/${productId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudo cargar el producto."),
    );
  }
};

export const getAdminProductsService = async () => {
  try {
    const response = await authApi.get("/products/admin");
    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(
        error,
        "No se pudieron cargar los productos del dashboard.",
      ),
    );
  }
};

export const createProductService = async (payload) => {
  try {
    const response = await authApi.post("/products", payload);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear el producto."));
  }
};

export const updateProductService = async (productId, payload) => {
  try {
    const response = await authApi.put(`/products/${productId}`, payload);
    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudo actualizar el producto."),
    );
  }
};

export const deleteProductService = async (productId) => {
  try {
    const response = await authApi.delete(`/products/${productId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudo eliminar el producto."),
    );
  }
};
