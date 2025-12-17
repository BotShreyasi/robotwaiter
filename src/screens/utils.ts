// src/screens/utils.ts

export const extractEmojis = (text: string): string => {
  const emojiRegex = /(\u00d83c\u00de00-\u00d83c\u00de9f)|(\u00d83d\u00de00-\u00d83d\u00deff)|(\u00d83e\u00de00-\u00d83e\u00deff)|[\u2600-\u27BF]|[\u2300-\u23FF]|[\u2000-\u206F]|[\u2700-\u27BF]|[\u{1F000}-\u{1F9FF}]/gu;
  const emojis = text.match(emojiRegex);
  return emojis ? emojis.join(' ') : '';
};

export const getQuantityFromOrderMap = (orderMap: any, itemName: string): number => {
  let qty = 1;
  Object.entries(orderMap).forEach(([key]) => {
    const m = key.match(/^(.*?)\((\d+)\)$/);
    if (m) {
      const name = m[1];
      const q = parseInt(m[2], 10);
      if (name.trim().toLowerCase() === itemName.trim().toLowerCase()) {
        qty = q;
      }
    }
  });
  return qty;
};

export const parseOrderMapToCart = (orderMap: any) => {
  const newCart: { [key: string]: { price: number; quantity: number } } = {};
  Object.entries(orderMap).forEach(([key, totalPrice]) => {
    const match = key.match(/^(.*?)\((\d+)\)$/);
    if (match) {
      const itemName = match[1];
      const quantity = parseInt(match[2], 10);
      const unitPrice = (totalPrice as number) / quantity;
      newCart[itemName] = { price: unitPrice, quantity };
    }
  });
  return newCart;
};

export type OrientationString =
  | 'PORTRAIT'
  | 'LANDSCAPE-LEFT'
  | 'LANDSCAPE-RIGHT'
  | 'PORTRAIT-UPSIDEDOWN'
  | 'UNKNOWN'
  | 'FACE-UP'
  | 'FACE-DOWN';
