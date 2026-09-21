import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'sm_pinned_products';
const PinnedProductsContext = createContext(null);

function getProductKey(product) {
  return product.id ?? `${product.productName}-${product.company}-${product.godown}-${product.dateOfLoad}`;
}

function readStoredProducts() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function PinnedProductsProvider({ children }) {
  const [pinnedProducts, setPinnedProducts] = useState(readStoredProducts);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedProducts));
  }, [pinnedProducts]);

  const value = useMemo(
    () => ({
      pinnedProducts,
      isPinned: (product) => pinnedProducts.some((pinnedProduct) => getProductKey(pinnedProduct) === getProductKey(product)),
      togglePinned: (product) => {
        setPinnedProducts((currentProducts) => {
          const productKey = getProductKey(product);
          const alreadyPinned = currentProducts.some((pinnedProduct) => getProductKey(pinnedProduct) === productKey);
          return alreadyPinned
            ? currentProducts.filter((pinnedProduct) => getProductKey(pinnedProduct) !== productKey)
            : [...currentProducts, product];
        });
      },
    }),
    [pinnedProducts],
  );

  return <PinnedProductsContext.Provider value={value}>{children}</PinnedProductsContext.Provider>;
}

export function usePinnedProducts() {
  const context = useContext(PinnedProductsContext);
  if (!context) {
    throw new Error('usePinnedProducts must be used inside PinnedProductsProvider');
  }
  return context;
}
