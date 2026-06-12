import UserModel from "../models/UserModel.js";
import { COOKIE_NAME, verifyAuthToken } from "../utils/auth.js";

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res
        .status(401)
        .json({ message: "Debes iniciar sesión para continuar." });
    }

    const payload = verifyAuthToken(token);
    const user = await UserModel.findById(payload.userId).select(
      "_id username email isAdmin",
    );

    if (!user) {
      return res.status(401).json({ message: "La sesión ya no es válida." });
    }

    req.user = user;
    next();
  } catch (_error) {
    return res
      .status(401)
      .json({ message: "La sesión expiró o no es válida." });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res
      .status(403)
      .json({ message: "No tienes permisos para realizar esta acción." });
  }

  return next();
};
