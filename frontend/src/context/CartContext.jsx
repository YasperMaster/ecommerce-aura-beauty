import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useUser } from "./UserContext";
import { clearStoredCart, loadCart, saveCart } from "../utils/cartStorage";

export const CartContext = createContext(null);

export const CartContextProvider = ({ children }) => {
  const { userInfo } = useUser();
  const userId = userInfo?.id || null;

  // Load the cart for the current user (or anonymous cart if not logged in).
  // When the user changes (login/logout/switch account), the cart reloads
  // from that user's localStorage key so carts don't leak between accounts.
  const [items, setItems] = useState(() => loadCart(userId));

  // Reload cart from storage whenever the user identity changes
  useEffect(() => {
    setItems(loadCart(userId));
  }, [userId]);

  // Persist cart to the current user's storage key
  useEffect(() => {
    saveCart(items, userId);
  }, [items, userId]);

  const addItem = useCallback((product) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product._id);

      if (!existingItem) {
        return [
          ...currentItems,
          {
            id: product._id,
            slug: product.slug,
            title: product.title,
            price: product.price,
            image: product.image,
            stock: product.stock,
            quantity: 1,
          },
        ];
      }

      return currentItems.map((item) => {
        if (item.id !== product._id) {
          return item;
        }

        return {
          ...item,
          stock: product.stock,
          quantity: Math.min(item.quantity + 1, product.stock),
        };
      });
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== productId),
    );
  }, []);

  const updateQuantity = useCallback((productId, nextQuantity) => {
    setItems((currentItems) => {
      if (nextQuantity <= 0) {
        return currentItems.filter((item) => item.id !== productId);
      }

      return currentItems.map((item) => {
        if (item.id !== productId) {
          return item;
        }

        return {
          ...item,
          quantity: Math.min(nextQuantity, item.stock),
        };
      });
    });
  }, []);

  const syncProductStock = useCallback((products) => {
    setItems((currentItems) =>
      currentItems
        .map((item) => {
          const matchingProduct = products.find(
            (product) => product._id === item.id,
          );

          if (!matchingProduct) {
            return item;
          }

          const nextQuantity = Math.min(item.quantity, matchingProduct.stock);

          if (matchingProduct.stock <= 0) {
            return null;
          }

          return {
            ...item,
            title: matchingProduct.title,
            price: matchingProduct.price,
            image: matchingProduct.image,
            stock: matchingProduct.stock,
            quantity: nextQuantity,
          };
        })
        .filter(Boolean),
    );
  }, []);

  const getItemQuantity = useCallback(
    (productId) => items.find((item) => item.id === productId)?.quantity || 0,
    [items],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    // Also remove from localStorage so a page refresh doesn't restore it
    clearStoredCart(userId);
  }, [userId]);

  const value = useMemo(() => {
    const subtotal = items.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);

    return {
      items,
      subtotal,
      itemCount,
      addItem,
      removeItem,
      updateQuantity,
      syncProductStock,
      getItemQuantity,
      clearCart,
    };
  }, [
    items,
    addItem,
    removeItem,
    updateQuantity,
    syncProductStock,
    getItemQuantity,
    clearCart,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);