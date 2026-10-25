import React, { useState, useMemo, useEffect } from 'react';
import {
  Coffee,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  RotateCcw,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { Product } from '../db/indexedDb';
import { formatInr } from '../utils/format';

export const ProductManagementScreen: React.FC = () => {
  const { products, saveProduct, removeProduct, resetDemoCatalog, refreshProducts } = usePosStore();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Coffee & Espresso');
  const [formPrice, setFormPrice] = useState('');
  const [formUnit, setFormUnit] = useState('Cup');
  const [formBarcode, setFormBarcode] = useState('');
  const [formStock, setFormStock] = useState('99');
  const [formIsVeg, setFormIsVeg] = useState(true);

  // Sync latest menu from cloud database on screen mount
  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  const categories = [
    'All',
    'Coffee & Espresso',
    'Tea & Refreshers',
    'Bakery & Pastry',
    'Cafe Bites',
    'Desserts & Shakes',
  ];

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshProducts();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('Coffee & Espresso');
    setFormPrice('');
    setFormUnit('Cup');
    // Generate next sequential KWI-PRD barcode preview
    const existingNums = products
      .map((p) => {
        const m = p.id.match(/KWI-PRD-(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const nextNum = (existingNums.length > 0 ? Math.max(...existingNums) : 0) + 1;
    setFormBarcode(`SPC-${String(nextNum).padStart(3, '0')}`);
    setFormStock('99');
    setFormIsVeg(true);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormCategory(prod.category);
    setFormPrice(prod.price.toString());
    setFormUnit(prod.unit);
    setFormBarcode(prod.barcode);
    setFormStock(prod.stock.toString());
    setFormIsVeg(prod.isVeg ?? true);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice) return;

    let targetId = editingProduct ? editingProduct.id : '';
    if (!targetId) {
      const existingNums = products
        .map((p) => {
          const m = p.id.match(/KWI-PRD-(\d+)/);
          return m ? parseInt(m[1], 10) : 0;
        })
        .filter((n) => !isNaN(n));
      const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
      targetId = `KWI-PRD-${String(maxNum + 1).padStart(4, '0')}`;
    }

    const prodToSave: Product = {
      id: targetId,
      name: formName.trim(),
      category: formCategory.trim() || 'Coffee & Espresso',
      price: parseFloat(formPrice) || 0,
      unit: formUnit.trim() || 'Cup',
      barcode: formBarcode.trim() || targetId.replace('KWI-PRD-', 'SPC-'),
      stock: parseInt(formStock, 10) || 99,
      isVeg: formIsVeg,
    };

    await saveProduct(prodToSave);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" from the menu? It will also be removed from the cloud database.`)) {
      await removeProduct(id);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCat === 'All' || p.category.toLowerCase() === selectedCat.toLowerCase();
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q);

      return matchCat && matchSearch;
    });
  }, [products, selectedCat, search]);

  return (
    <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 bg-slate-100 dark:bg-slate-950 flex flex-col gap-3 max-w-7xl mx-auto w-full h-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coffee className="w-5 h-5 text-brand" />
            <span>Menu & Product Management</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
              {products.length} Items Total
            </span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Real-time synchronized with Supabase PostgreSQL cloud database & offline local cache.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Fetch latest items directly from Supabase database"
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand' : ''}`} />
            <span>Sync with Cloud</span>
          </button>

          <button
            onClick={resetDemoCatalog}
            title="Restore all default cafe beverages & bakery items"
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default Menu</span>
          </button>

          <button
            onClick={openAddModal}
            className="h-9 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, category, SKU, or ID (e.g. KWI-PRD-0001)..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCat === cat
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table with Guaranteed Scrollbar & Sticky Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col flex-1 min-h-[420px] max-h-[calc(100vh-220px)] overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center m-auto">
            <Coffee className="w-12 h-12 mb-3 opacity-30 text-brand" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No menu items found</p>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              {search ? 'Try clearing your search query.' : 'Click "Add New Item" to create your first menu item or "Reset Default Menu" to load sample coffees and roasts.'}
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto overflow-x-auto flex-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-2xs">
                <tr className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Product ID</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Portion / Unit</th>
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-4 text-right">Price (₹)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredProducts.map((prod, idx) => (
                  <tr
                    key={prod.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-brand">
                      {prod.id}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            prod.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          title={prod.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                        />
                        <span className="truncate max-w-[220px]">{prod.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                        {prod.category}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-500 font-medium">
                      {prod.unit}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {prod.barcode}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-sm text-brand text-right">
                      {formatInr(prod.price)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(prod)}
                          title="Edit Item"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand hover:bg-brand-light transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(prod.id, prod.name)}
                          title="Delete Item"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary Bar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredProducts.length} of {products.length} menu items</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Standard Format: <code className="text-brand font-mono">KWI-PRD-XXXX</code>
          </span>
        </div>
      </div>

      {/* Add / Edit Cafe Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Coffee className="w-5 h-5 text-brand" />
                <span>{editingProduct ? 'Edit Menu Item' : 'Add New Menu Item'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Cardamom Spiced Cappuccino"
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand font-medium"
                  >
                    <option value="Coffee & Espresso">Coffee & Espresso</option>
                    <option value="Tea & Refreshers">Tea & Refreshers</option>
                    <option value="Bakery & Pastry">Bakery & Pastry</option>
                    <option value="Cafe Bites">Cafe Bites</option>
                    <option value="Desserts & Shakes">Desserts & Shakes</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="190.00"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Portion / Unit
                  </label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="Cup, Plate, Piece"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    SKU / Code
                  </label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="SPC-001"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isVegCheckbox"
                  checked={formIsVeg}
                  onChange={(e) => setFormIsVeg(e.target.checked)}
                  className="w-4 h-4 rounded text-brand focus:ring-brand accent-emerald-600 cursor-pointer"
                />
                <label htmlFor="isVegCheckbox" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Vegetarian Item (green indicator dot)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingProduct ? 'Update Product' : 'Save & Sync Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
