const CART_STORAGE_KEY = "aura-beauty-cart";

export const loadCart = () => {
  try {
    const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    return storedCart ? JSON.parse(storedCart) : [];
  } catch {
    return [];
  }
};

export const saveCart = (items) => {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage full or unavailable (private browsing quota) — fail silently
  }
};
