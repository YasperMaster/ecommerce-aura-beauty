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

// A cart line is identified by product id + variant option id (if any), so
// "Red case" and "Blue case" of the same product can coexist as separate
// lines. Products with no variants just use null here, same as before.
const lineKey = (productId, variantOptionId = null) =>
  variantOptionId ? `${productId}:${variantOptionId}` : productId;

export const CartContextProvider = ({ children }) => {
  const { userInfo } = useUser();
  const userId = userInfo?.id || null;

  // Load the cart for the current user (or anonymous cart if not logged in).
  // When the user changes (login/logout/switch account), the cart reloads
  // from that user's localStorage key so carts don't leak between accounts.
  const [items, setItems] = useState(() => loadCart(userId));

  // Bumped every time addItem succeeds. The navbar and cart icon watch this
  // to reveal the navbar if it's currently hidden (scrolled away) and to
  // play a short "look here" animation on the cart icon.
  const [cartPulseKey, setCartPulseKey] = useState(0);

  // Reload cart from storage whenever the user identity changes
  useEffect(() => {
    setItems(loadCart(userId));
  }, [userId]);

  // Persist cart to the current user's storage key
  useEffect(() => {
    saveCart(items, userId);
  }, [items, userId]);

  /**
   * @param {object} product - the product being added
   * @param {number} quantity
   * @param {object|null} selectedOption - the chosen variant option, e.g.
   *   { _id, label, image, stock, groupName }, or null/undefined for a
   *   product with no variants.
   */
  const addItem = useCallback((product, quantity = 1, selectedOption = null) => {
    const safeQuantity = Math.max(1, Math.trunc(quantity) || 1);
    const variantOptionId = selectedOption?._id || null;
    const itemStock = selectedOption ? selectedOption.stock : product.stock;
    const itemImage = selectedOption ? selectedOption.image : product.image;
    const variantLabel = selectedOption
      ? `${selectedOption.groupName}: ${selectedOption.label}`
      : "";
    const key = lineKey(product._id, variantOptionId);

    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => lineKey(item.id, item.variantOptionId) === key,
      );

      if (!existingItem) {
        return [
          ...currentItems,
          {
            id: product._id,
            slug: product.slug,
            title: product.title,
            price: product.price,
            image: itemImage,
            stock: itemStock,
            quantity: Math.min(safeQuantity, itemStock),
            variantOptionId,
            variantLabel,
          },
        ];
      }

      return currentItems.map((item) => {
        if (lineKey(item.id, item.variantOptionId) !== key) {
          return item;
        }

        return {
          ...item,
          stock: itemStock,
          quantity: Math.min(item.quantity + safeQuantity, itemStock),
        };
      });
    });

    setCartPulseKey((key) => key + 1);
  }, []);

  const removeItem = useCallback((productId, variantOptionId = null) => {
    const key = lineKey(productId, variantOptionId);
    setItems((currentItems) =>
      currentItems.filter(
        (item) => lineKey(item.id, item.variantOptionId) !== key,
      ),
    );
  }, []);

  const updateQuantity = useCallback(
    (productId, nextQuantity, variantOptionId = null) => {
      const key = lineKey(productId, variantOptionId);

      setItems((currentItems) => {
        if (nextQuantity <= 0) {
          return currentItems.filter(
            (item) => lineKey(item.id, item.variantOptionId) !== key,
          );
        }

        return currentItems.map((item) => {
          if (lineKey(item.id, item.variantOptionId) !== key) {
            return item;
          }

          return {
            ...item,
            quantity: Math.min(nextQuantity, item.stock),
          };
        });
      });
    },
    [],
  );

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

          // Variant line: re-derive from that specific option's current
          // stock/image, not the product's top-level fields. If the option
          // was removed entirely, drop the line.
          if (item.variantOptionId) {
            const matchingOption = matchingProduct.optionGroup?.options?.find(
              (option) => option._id === item.variantOptionId,
            );

            if (!matchingOption || matchingOption.stock <= 0) {
              return null;
            }

            return {
              ...item,
              title: matchingProduct.title,
              price: matchingProduct.price,
              image: matchingOption.image,
              stock: matchingOption.stock,
              variantLabel: `${matchingProduct.optionGroup.name}: ${matchingOption.label}`,
              quantity: Math.min(item.quantity, matchingOption.stock),
            };
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
    (productId, variantOptionId = null) => {
      const key = lineKey(productId, variantOptionId);
      return (
        items.find((item) => lineKey(item.id, item.variantOptionId) === key)
          ?.quantity || 0
      );
    },
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
      cartPulseKey,
      addItem,
      removeItem,
      updateQuantity,
      syncProductStock,
      getItemQuantity,
      clearCart,
    };
  }, [
    items,
    cartPulseKey,
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