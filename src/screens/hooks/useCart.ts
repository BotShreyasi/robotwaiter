// src/screens/hooks/useCart.ts
import { useState } from 'react';
import { CartItem } from '../../types';

export const useCart = () => {
  const [cart, setCart] = useState<{ [key: string]: CartItem }>({});
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const increaseQuantity = (item: string) => {
    setCart((prevCart) => ({
      ...prevCart,
      [item]: { ...prevCart[item], quantity: prevCart[item].quantity + 1 },
    }));
  };

  const decreaseQuantity = (item: string) => {
    setCart((prevCart) => {
      const newCart = { ...prevCart };
      if (newCart[item].quantity > 1) {
        newCart[item].quantity -= 1;
      } else {
        delete newCart[item];
      }
      return newCart;
    });
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      setCart((prevCart) => {
        const newCart = { ...prevCart };
        delete newCart[itemToDelete];
        return newCart;
      });
      setItemToDelete(null);
    }
    setShowConfirmDelete(false);
  };

  const clearCart = () => {
    setCart({});
  };

  return {
    cart,
    setCart,
    itemToDelete,
    setItemToDelete,
    showConfirmDelete,
    setShowConfirmDelete,
    increaseQuantity,
    decreaseQuantity,
    handleConfirmDelete,
    clearCart,
  };
};
