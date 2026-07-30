import { authApi, getApiErrorMessage } from "./api";

export const getProfileService = async () => {
  try {
    const response = await authApi.get("/auth/profile");
    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudo obtener la sesión actual."),
    );
  }
};

export const loginService = async (credentials) => {
  try {
    const response = await authApi.post("/auth/login", credentials);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo iniciar sesión."));
  }
};

export const registerService = async (data) => {
  try {
    const response = await authApi.post("/auth/register", data);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear la cuenta."));
  }
};

export const verifyEmailService = async ({ email, code }) => {
  try {
    const response = await authApi.post("/auth/verify-email", {
      email,
      code,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudo confirmar el código."),
    );
  }
};

export const resendCodeService = async (email) => {
  try {
    const response = await authApi.post("/auth/resend-code", { email });
    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudo reenviar el código."),
    );
  }
};

export const forgotPasswordService = async (email) => {
  try {
    const response = await authApi.post("/auth/forgot-password", { email });
    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudo enviar el código."),
    );
  }
};

export const resetPasswordService = async ({ email, code, newPassword }) => {
  try {
    const response = await authApi.post("/auth/reset-password", {
      email,
      code,
      newPassword,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudo restablecer la contraseña."),
    );
  }
};

export const logoutService = async () => {
  try {
    const response = await authApi.post("/auth/logout");
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cerrar sesión."));
  }
};
