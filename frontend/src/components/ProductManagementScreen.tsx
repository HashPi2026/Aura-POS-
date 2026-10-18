import React, { useState, useMemo } from 'react';
import {
  Coffee,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { Product } from '../db/indexedDb';
import { formatInr } from '../utils/format';

export const ProductManagementScreen: React.FC = () => {
  const { products, saveProduct, removeProduct, resetDemoCatalog } = usePosStore();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Coffee & Espresso');
  const [formPrice, setFormPrice] = useState('');
  const [formUnit, setFormUnit] = useState('Cup (250 ml)');
  const [formBarcode, setFormBarcode] = useState('');
  const [formStock, setFormStock] = useState('99');
  const [formIsVeg, setFormIsVeg] = useState(true);

  const categories = [
    'All',
    'Coffee & Espresso',
    'Tea & Refreshers',
    'Bakery & Pastry',
    'Cafe Bites',
    'Desserts & Shakes',
  ];

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('Coffee & Espresso');
    setFormPrice('');
    setFormUnit('Cup (250 ml)');
    setFormBarcode(`CF${Math.floor(100 + Math.random() * 900)}`);
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

    const prodToSave: Product = {
      id: editingProduct ? editingProduct.id : `cafe_${Date.now()}`,
      name: formName.trim(),
      category: formCategory.trim() || 'Coffee & Espresso',
      price: parseFloat(formPrice) || 0,
      unit: formUnit.trim() || 'Cup',
      barcode: formBarcode.trim() || `CF${Date.now()}`,
      stock: parseInt(formStock, 10) || 99,
      isVeg: formIsVeg,
    };

    await saveProduct(prodToSave);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this menu item?')) {
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
        p.barcode.includes(q);

      return matchCat && matchSearch;
    });
  }, [products, selectedCat, search]);

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-100 dark:bg-slate-950 flex flex-col gap-4 max-w-7xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coffee className="w-5 h-5 text-brand" />
            <span>Cafe Menu & Price Management</span>
          </h2>
          <p className="text-xs text-slate-500">
            Manage specialty coffees, roasts, pastries, toasts, and seasonal drinks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetDemoCatalog}
            title="Restore all default cafe beverages & bakery items"
            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset 30 Cafe Items</span>
          </button>

          <button
            onClick={openAddModal}
            className="h-10 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cafe items, coffee roasts, or bakery..."
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

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <Coffee className="w-10 h-10 mb-2 opacity-30 text-brand" />
            <p className="font-bold text-sm">No menu items found</p>
            <p className="text-xs">Tap "Add Menu Item" or "Reset 30 Cafe Items" to load your roastery menu.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Serving Portion</th>
                  <th className="py-3 px-3">SKU / Code</th>
                  <th className="py-3 px-3 text-right">Price (₹)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredProducts.map((prod) => (
                  <tr
                    key={prod.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            prod.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span>{prod.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">
                      {prod.category}
                    </td>

                    <td className="py-3 px-3 text-slate-500">
                      {prod.unit}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {prod.barcode}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-sm text-brand text-right">
                      {formatInr(prod.price)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(prod)}
                          title="Edit Item"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand hover:bg-brand-light transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(prod.id)}
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
      </div>

      {/* Add / Edit Cafe Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Coffee className="w-4 h-4 text-brand" />
                <span>{editingProduct ? 'Edit Cafe Item' : 'New Cafe / Roastery Item'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Vanilla Bean Latte, Almond Croissant"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-brand focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Price in INR (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="180.00"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-brand focus:outline-hidden font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Serving Portion / Cup
                  </label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="e.g. Cup (250 ml), 1 Piece"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-brand focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full h-10 px-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-brand focus:outline-hidden"
                >
                  <option value="Coffee & Espresso">Coffee & Espresso</option>
                  <option value="Tea & Refreshers">Tea & Refreshers</option>
                  <option value="Bakery & Pastry">Bakery & Pastry</option>
                  <option value="Cafe Bites">Cafe Bites</option>
                  <option value="Desserts & Shakes">Desserts & Shakes</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Quick Barcode / Code
                  </label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="CF025"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-brand focus:outline-hidden font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="isVegCheck"
                    checked={formIsVeg}
                    onChange={(e) => setFormIsVeg(e.target.checked)}
                    className="w-4 h-4 rounded text-brand focus:ring-brand"
                  />
                  <label
                    htmlFor="isVegCheck"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Vegetarian (Green Dot)
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
