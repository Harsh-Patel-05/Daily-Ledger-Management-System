import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import { useAuth } from './AuthContext';
import * as inventoryApi from '../api/inventory';
import { sameId } from '../api/ids';

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [statsExtra, setStatsExtra] = useState(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearLocal = useCallback(() => {
    setCategories([]);
    setBrands([]);
    setSuppliers([]);
    setProducts([]);
    setMovements([]);
    setStatsExtra(null);
    setReady(false);
    setError(null);
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const stats = await inventoryApi.getInventoryStats();
      setStatsExtra(stats);
    } catch {
      // keep computed stats from local lists
    }
  }, []);

  const refreshAll = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const settled = (p, fallback) => p.then((v) => v).catch(() => fallback);
      const [cats, brandList, sups, prods, movs, stats] = await Promise.all([
        settled(inventoryApi.listCategories(), []),
        settled(inventoryApi.listBrands(), []),
        settled(inventoryApi.listSuppliers(), []),
        settled(inventoryApi.listProducts(), []),
        settled(inventoryApi.listMovements(), []),
        settled(inventoryApi.getInventoryStats(), null),
      ]);
      setCategories(cats);
      setBrands(brandList);
      setSuppliers(sups);
      setProducts(prods);
      setMovements(movs);
      setStatsExtra(stats);
      setReady(true);
    } catch (err) {
      console.error(err);
      setReady(true);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      clearLocal();
      return;
    }
    refreshAll().catch(() => {});
  }, [isAuthenticated, authLoading, refreshAll, clearLocal]);

  // Allow other modules (Settings refresh, invoice create) to trigger reload
  useEffect(() => {
    const onRefresh = () => {
      if (isAuthenticated) refreshAll().catch(() => {});
    };
    window.addEventListener('dlms:refresh-inventory', onRefresh);
    window.addEventListener('dlms-company-changed', onRefresh);
    return () => {
      window.removeEventListener('dlms:refresh-inventory', onRefresh);
      window.removeEventListener('dlms-company-changed', onRefresh);
    };
  }, [isAuthenticated, refreshAll]);

  const getCategory = useCallback(
    (id) => categories.find((c) => sameId(c.id, id)),
    [categories]
  );

  const getBrand = useCallback(
    (id) => brands.find((b) => sameId(b.id, id)),
    [brands]
  );

  const getSupplier = useCallback(
    (id) => suppliers.find((s) => sameId(s.id, id)),
    [suppliers]
  );

  const getProduct = useCallback(
    (id) => products.find((p) => sameId(p.id, id)),
    [products]
  );

  const getProductMovements = useCallback(
    (productId) =>
      movements
        .filter((m) => sameId(m.productId, productId))
        .sort(
          (a, b) =>
            String(b.date || '').localeCompare(String(a.date || '')) ||
            String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
        ),
    [movements]
  );

  const addCategory = useCallback(async (data) => {
    const category = await inventoryApi.createCategory(data);
    setCategories((prev) => [...prev, category]);
    refreshStats();
    return category;
  }, [refreshStats]);

  const updateCategory = useCallback(async (id, data) => {
    const category = await inventoryApi.updateCategory(id, data);
    setCategories((prev) => prev.map((c) => (sameId(c.id, id) ? category : c)));
    return category;
  }, []);

  const deleteCategory = useCallback(async (id) => {
    const res = await inventoryApi.deleteCategory(id);
    setCategories((prev) => prev.filter((c) => !sameId(c.id, id)));
    refreshStats();
    return res;
  }, [refreshStats]);

  const addBrand = useCallback(async (data) => {
    const brand = await inventoryApi.createBrand(data);
    setBrands((prev) => [...prev, brand]);
    refreshStats();
    return brand;
  }, [refreshStats]);

  const updateBrand = useCallback(async (id, data) => {
    const brand = await inventoryApi.updateBrand(id, data);
    setBrands((prev) => prev.map((b) => (sameId(b.id, id) ? brand : b)));
    return brand;
  }, []);

  const deleteBrand = useCallback(async (id) => {
    const res = await inventoryApi.deleteBrand(id);
    setBrands((prev) => prev.filter((b) => !sameId(b.id, id)));
    refreshStats();
    return res;
  }, [refreshStats]);

  const addSupplier = useCallback(async (data) => {
    const supplier = await inventoryApi.createSupplier(data);
    setSuppliers((prev) => [...prev, supplier]);
    refreshStats();
    return supplier;
  }, [refreshStats]);

  const updateSupplier = useCallback(async (id, data) => {
    const supplier = await inventoryApi.updateSupplier(id, data);
    setSuppliers((prev) => prev.map((s) => (sameId(s.id, id) ? supplier : s)));
    return supplier;
  }, []);

  const deleteSupplier = useCallback(async (id) => {
    const res = await inventoryApi.deleteSupplier(id);
    setSuppliers((prev) => prev.filter((s) => !sameId(s.id, id)));
    setProducts((prev) =>
      prev.map((p) => (sameId(p.supplierId, id) ? { ...p, supplierId: '' } : p))
    );
    refreshStats();
    return res;
  }, [refreshStats]);

  const addProduct = useCallback(async (data) => {
    const product = await inventoryApi.createProduct(data);
    setProducts((prev) => [...prev, product]);
    const movs = await inventoryApi.listMovements().catch(() => null);
    if (movs) setMovements(movs);
    await refreshStats();
    return product;
  }, [refreshStats]);

  const updateProduct = useCallback(async (id, data) => {
    const product = await inventoryApi.updateProduct(id, data);
    setProducts((prev) => prev.map((p) => (sameId(p.id, id) ? product : p)));
    await refreshStats();
    return product;
  }, [refreshStats]);

  const deleteProduct = useCallback(async (id) => {
    const res = await inventoryApi.deleteProduct(id);
    setProducts((prev) => prev.filter((p) => !sameId(p.id, id)));
    setMovements((prev) => prev.filter((m) => !sameId(m.productId, id)));
    await refreshStats();
    return res;
  }, [refreshStats]);

  const recordStockMovement = useCallback(async (data) => {
    const movement = await inventoryApi.createMovement(data);
    setMovements((prev) => [movement, ...prev]);
    const product = await inventoryApi.getProduct(data.productId).catch(() => null);
    if (product) {
      setProducts((prev) => prev.map((p) => (sameId(p.id, product.id) ? product : p)));
    }
    await refreshStats();
    return movement;
  }, [refreshStats]);

  const recordStockMovements = useCallback(async (list = []) => {
    const created = [];
    for (const data of list) {
      created.push(await recordStockMovement(data));
    }
    return created;
  }, [recordStockMovement]);

  const hasStockForReference = useCallback(
    (reference) => {
      if (!reference) return false;
      return movements.some((m) => m.reference === reference && m.type === 'out');
    },
    [movements]
  );

  const getInventorySnapshot = useCallback(
    () => ({ categories, brands, suppliers, products, movements }),
    [categories, brands, suppliers, products, movements]
  );

  const stats = useMemo(() => {
    const active = products.filter((p) => p.status === 'active');
    const lowStockLocal = products.filter(
      (p) =>
        p.status !== 'discontinued' &&
        Number(p.stockQty) > 0 &&
        Number(p.stockQty) <= 10
    );
    const outOfStockLocal = products.filter(
      (p) => p.status !== 'discontinued' && Number(p.stockQty) <= 0
    );
    const stockValueWithoutGstLocal = products.reduce(
      (sum, p) => sum + Number(p.stockQty || 0) * (Number(p.purchasePrice) || 0),
      0
    );
    const stockValueWithGstLocal = products.reduce(
      (sum, p) => sum + Number(p.stockQty || 0) * (Number(p.purchasePriceWithGst) || 0),
      0
    );
    const retailValueWithoutGstLocal = products.reduce(
      (sum, p) => sum + Number(p.stockQty || 0) * (Number(p.sellingPrice) || 0),
      0
    );
    const retailValueWithGstLocal = products.reduce(
      (sum, p) => sum + Number(p.stockQty || 0) * (Number(p.sellingPriceWithGst) || 0),
      0
    );

    if (statsExtra) {
      const lowItems = statsExtra.lowStockItems?.length ? statsExtra.lowStockItems : lowStockLocal;
      const outItems = statsExtra.outOfStockItems?.length ? statsExtra.outOfStockItems : outOfStockLocal;
      const stockWithout = statsExtra.stockValueWithoutGst ?? stockValueWithoutGstLocal;
      const stockWith = statsExtra.stockValueWithGst ?? stockValueWithGstLocal;
      const retailWithout = statsExtra.retailValueWithoutGst ?? retailValueWithoutGstLocal;
      const retailWith = statsExtra.retailValueWithGst ?? retailValueWithGstLocal;
      return {
        totalProducts: statsExtra.totalProducts ?? products.length,
        activeProducts: statsExtra.activeProducts ?? active.length,
        categories: statsExtra.categories ?? categories.length,
        brands: statsExtra.brands ?? brands.length,
        suppliers: statsExtra.suppliers ?? suppliers.length,
        lowStock: statsExtra.lowStock ?? lowItems.length,
        outOfStock: statsExtra.outOfStock ?? outItems.length,
        stockValueWithoutGst: stockWithout,
        stockValueWithGst: stockWith,
        stockValue: stockWith || stockWithout,
        retailValueWithoutGst: retailWithout,
        retailValueWithGst: retailWith,
        retailValue: retailWith || retailWithout,
        recentMovements: statsExtra.recentMovements || movements.slice(0, 8),
        lowStockItems: lowItems,
        outOfStockItems: outItems,
      };
    }

    return {
      totalProducts: products.length,
      activeProducts: active.length,
      categories: categories.length,
      brands: brands.length,
      suppliers: suppliers.length,
      lowStock: lowStockLocal.length,
      outOfStock: outOfStockLocal.length,
      stockValueWithoutGst: stockValueWithoutGstLocal,
      stockValueWithGst: stockValueWithGstLocal,
      stockValue: stockValueWithGstLocal || stockValueWithoutGstLocal,
      retailValueWithoutGst: retailValueWithoutGstLocal,
      retailValueWithGst: retailValueWithGstLocal,
      retailValue: retailValueWithGstLocal || retailValueWithoutGstLocal,
      recentMovements: movements.slice(0, 8),
      lowStockItems: lowStockLocal,
      outOfStockItems: outOfStockLocal,
    };
  }, [products, categories, brands, suppliers, movements, statsExtra]);

  const value = {
    ready,
    loading,
    error,
    categories,
    brands,
    suppliers,
    products,
    movements,
    stats,
    getCategory,
    getBrand,
    getSupplier,
    getProduct,
    getProductMovements,
    addCategory,
    updateCategory,
    deleteCategory,
    addBrand,
    updateBrand,
    deleteBrand,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addProduct,
    updateProduct,
    deleteProduct,
    recordStockMovement,
    recordStockMovements,
    hasStockForReference,
    getInventorySnapshot,
    refreshAll,
    refreshStats,
    resetInventory: refreshAll,
  };

  return (
    <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
}

/** Dispatch from outside InventoryProvider (e.g. AppContext refresh). */
export function requestInventoryRefresh() {
  window.dispatchEvent(new Event('dlms:refresh-inventory'));
}
