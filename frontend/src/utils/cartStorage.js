const CART_STORAGE_KEY_PREFIX = "aura-beauty-cart";

// Anonymous (not logged-in) users share a single cart key.
// Authenticated users get a per-user key so carts don't leak between accounts.
const getCartKey = (userId) =>
  userId ? `${CART_STORAGE_KEY_PREFIX}-${userId}` : CART_STORAGE_KEY_PREFIX;

export const loadCart = (userId) => {
  try {
    const storedCart = window.localStorage.getItem(getCartKey(userId));
    return storedCart ? JSON.parse(storedCart) : [];
  } catch {
    return [];
  }
};

export const saveCart = (items, userId) => {
  try {
    window.localStorage.setItem(getCartKey(userId), JSON.stringify(items));
  } catch {
    // localStorage full or unavailable (private browsing quota) — fail silently
  }
};

// Remove the cart for a specific user (or the anonymous cart if no userId)
export const clearStoredCart = (userId) => {
  try {
    window.localStorage.removeItem(getCartKey(userId));
  } catch {
    // fail silently
  }
};