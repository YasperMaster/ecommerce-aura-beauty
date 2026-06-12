import { authApi, getApiErrorMessage } from "./api";

export const createCheckoutPreferenceService = async (items) => {
  try {
    const response = await authApi.post("/checkout/mercadopago/preference", {
      items,
    });

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudo iniciar el checkout."),
    );
  }
};

export const getOrderStatusService = async (orderId) => {
  try {
    const response = await authApi.get(`/checkout/orders/${orderId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudo obtener el estado de la compra."),
    );
  }
};

export const getAdminOrdersService = async () => {
  try {
    const response = await authApi.get("/checkout/orders/admin");
    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudieron cargar las órdenes."),
    );
  }
};
