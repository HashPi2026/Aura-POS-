import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Undo2,
  ShoppingBag,
  ArrowRight,
  X,
  ChevronUp,
  UtensilsCrossed,
  ChefHat,
  Sparkles,
  ShoppingBag as BagIcon,
  Bike,
  Coffee,
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { formatInr } from '../utils/format';
import { ItemCustomizationModal } from './ItemCustomizationModal';
import { CartItem } from '../db/indexedDb';

export const CheckoutScreen: React.FC = () => {
  const {
    products,
    cart,
    addToCart,
    decrementQuantity,
    removeFromCart,
    undoRemove,
    lastRemovedItem,
    clearCart,
    selectedCategory,
    setCategory,
    searchQuery,
    setSearchQuery,
    getTotals,
    openPaymentModal,
    orderType,
    setOrderType,
    selectedTable,
    sendKOT,
    setActiveTab,
  } = usePosStore();

  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<CartItem | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pure Cafe Categories
  const categories = useMemo(
    () => [
      'All',
      'Coffee & Espresso',
      'Tea & Refreshers',
      'Bakery & Pastry',
      'Cafe Bites',
      'Desserts & Shakes',
    ],
    []
  );

  // Keyboard shortcut for quick search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || e.key === 'F2') && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (isMobileCartOpen) setIsMobileCartOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileCartOpen]);

  // Filter cafe products by category and search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === 'All' || p.category.toLowerCase() === selectedCategory.toLowerCase();

      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.barcode.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query);

      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const cartQuantityMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart) {
      map.set(item.productId, (map.get(item.productId) || 0) + item.quantity);
    }
    return map;
  }, [cart]);

  const totals = getTotals();

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100 dark:bg-slate-950 relative">
      {/* Product Catalog & Search (Left side) */}
      <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4 border-r border-slate-200 dark:border-slate-800">
        {/* Top Control Bar: Order Type Switcher & Table Tag */}
        <div className="flex flex-col gap-2.5 mb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Order Type Tabs (Dine-In, Takeaway, Delivery) */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <button
                onClick={() => setOrderType('DINE_IN')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  orderType === 'DINE_IN'
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Dine-In</span>
              </button>

              <button
                onClick={() => setOrderType('TAKEAWAY')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  orderType === 'TAKEAWAY'
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <BagIcon className="w-3.5 h-3.5" />
                <span>Takeaway / Grab & Go</span>
              </button>

              <button
                onClick={() => setOrderType('DELIVERY')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  orderType === 'DELIVERY'
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Delivery</span>
              </button>
            </div>

            {/* Table Badge for Dine-In */}
            {orderType === 'DINE_IN' && (
              <button
                onClick={() => setActiveTab('TABLES')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedTable
                    ? 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Table / Bar:</span>
                <span className="underline decoration-dashed font-black">
                  {selectedTable ? selectedTable.name : 'Select Table'}
                </span>
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coffee, espresso, toast, pastry, or drinks (Press / to focus)..."
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-brand text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-0.5 pb-20 lg:pb-2">
          {filteredProducts.length === 0 ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <Coffee className="w-10 h-10 mb-2 opacity-40 text-brand" />
              <p className="font-semibold text-sm">No items found</p>
              <p className="text-xs">Try another keyword or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3">
              {filteredProducts.map((prod) => {
                const qtyInCart = cartQuantityMap.get(prod.id) || 0;
                return (
                  <button
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    className={`p-3 rounded-2xl bg-white dark:bg-slate-900 border text-left flex flex-col justify-between transition-all hover:border-brand hover:shadow-xs active:scale-[0.98] select-none min-h-[125px] ${
                      qtyInCart > 0
                        ? 'border-brand ring-2 ring-brand'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 truncate max-w-[100px]">
                          {prod.category}
                        </span>
                        {qtyInCart > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand text-white">
                            {qtyInCart} in order
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 leading-tight">
                        {prod.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{prod.unit}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="font-mono font-bold text-sm sm:text-base text-brand">
                        {formatInr(prod.price)}
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-brand-light text-brand flex items-center justify-center font-bold">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Desktop/Tablet Landscape Cart Panel */}
      <div className="hidden lg:flex w-[390px] xl:w-[430px] flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 shrink-0 shadow-sm h-full">
        <CartContent
          cart={cart}
          products={products}
          totals={totals}
          lastRemovedItem={lastRemovedItem}
          onAddToCart={addToCart}
          onDecrement={decrementQuantity}
          onRemove={removeFromCart}
          onUndoRemove={undoRemove}
          onClearCart={clearCart}
          onCharge={openPaymentModal}
          onSendKot={sendKOT}
          onCustomize={setCustomizingItem}
          selectedTable={selectedTable}
          orderType={orderType}
        />
      </div>

      {/* Mobile Sticky Floating Cart Bar */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-20 animate-slideUp">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full h-14 rounded-2xl bg-brand text-white p-3.5 flex items-center justify-between shadow-2xl active:scale-[0.99] transition-all border border-white/20"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center font-bold text-xs">
                {totals.totalItems}
              </div>
              <div className="text-left leading-tight">
                <div className="font-bold text-sm">View Cafe Order</div>
                <div className="text-[10px] text-white/80">
                  {selectedTable ? `Table ${selectedTable.name}` : orderType} • Tap to review
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-lg">{formatInr(totals.totalAmount)}</span>
              <ChevronUp className="w-5 h-5 text-white/80" />
            </div>
          </button>
        </div>
      )}

      {/* Mobile Cart Drawer Modal */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[88vh] flex flex-col p-4 shadow-2xl border-t border-slate-200 dark:border-slate-800 animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Current Cafe Order</h3>
                <span className="px-2 py-0.5 rounded-full bg-brand-light text-brand font-bold text-xs">
                  {totals.totalItems} items
                </span>
              </div>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              <CartContent
                cart={cart}
                products={products}
                totals={totals}
                lastRemovedItem={lastRemovedItem}
                onAddToCart={addToCart}
                onDecrement={decrementQuantity}
                onRemove={removeFromCart}
                onUndoRemove={undoRemove}
                onClearCart={clearCart}
                onCharge={() => {
                  setIsMobileCartOpen(false);
                  openPaymentModal();
                }}
                onSendKot={sendKOT}
                onCustomize={setCustomizingItem}
                selectedTable={selectedTable}
                orderType={orderType}
              />
            </div>
          </div>
        </div>
      )}

      {/* Item Customization Modal (Milk / Sugar / Temperature) */}
      <ItemCustomizationModal
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
      />
    </div>
  );
};

interface CartContentProps {
  cart: any[];
  products: any[];
  totals: any;
  lastRemovedItem: any;
  onAddToCart: (p: any, notes?: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
  onUndoRemove: () => void;
  onClearCart: () => void;
  onCharge: () => void;
  onSendKot: (notes?: string) => void;
  onCustomize: (item: any) => void;
  selectedTable: any;
  orderType: string;
}

const CartContent: React.FC<CartContentProps> = ({
  cart,
  products,
  totals,
  lastRemovedItem,
  onAddToCart,
  onDecrement,
  onRemove,
  onUndoRemove,
  onClearCart,
  onCharge,
  onSendKot,
  onCustomize,
  selectedTable,
  orderType,
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-brand" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Active Order</h3>
            <span className="px-2 py-0.5 rounded-full bg-brand-light text-brand font-bold text-xs">
              {totals.totalItems}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
            {orderType === 'DINE_IN'
              ? selectedTable
                ? `${selectedTable.name} • ${selectedTable.area}`
                : 'Dine-In (Select Table)'
              : orderType === 'TAKEAWAY'
              ? 'Takeaway / Grab & Go'
              : 'Delivery Order'}
          </div>
        </div>

        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700"
          >
            Clear order
          </button>
        )}
      </div>

      {/* Undo banner */}
      {lastRemovedItem && (
        <div className="mt-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs animate-fadeIn">
          <span className="truncate text-slate-600 dark:text-slate-300">
            Removed {lastRemovedItem.name.slice(0, 18)}...
          </span>
          <button
            onClick={onUndoRemove}
            className="flex items-center gap-1 font-bold text-brand hover:underline"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </button>
        </div>
      )}

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-2 min-h-[160px] max-h-[380px] lg:max-h-none">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 min-h-[160px]">
            <Coffee className="w-10 h-10 mb-2 opacity-30 text-brand" />
            <p className="font-bold text-sm text-slate-600 dark:text-slate-400">Order is empty</p>
            <p className="text-xs text-slate-400">Tap coffee, pastry or snacks to ring up</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={`${item.productId}-${item.customNotes || ''}`}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col gap-1.5 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                    {item.name}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {formatInr(item.price)} × {item.quantity}
                  </div>
                </div>

                {/* Steppers */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onDecrement(item.productId)}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                    title="Decrease quantity"
                  >
                    {item.quantity === 1 ? (
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <span className="w-7 text-center font-bold font-mono text-xs text-slate-900 dark:text-white">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => {
                      const prod = products.find((p) => p.id === item.productId);
                      if (prod) onAddToCart(prod);
                    }}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                    title="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Item Total */}
                <div className="font-mono font-bold text-xs text-slate-900 dark:text-white text-right min-w-[65px]">
                  {formatInr(item.price * item.quantity)}
                </div>
              </div>

              {/* Barista Note Badge & Edit */}
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                {item.customNotes ? (
                  <span className="text-amber-700 dark:text-amber-300 font-semibold italic truncate">
                    ☕ {item.customNotes}
                  </span>
                ) : (
                  <span className="text-slate-400">Regular dairy & temp</span>
                )}

                <button
                  onClick={() => onCustomize(item)}
                  className="text-brand font-bold flex items-center gap-1 hover:underline text-[11px] ml-auto"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{item.customNotes ? 'Edit Milk / Note' : '+ Milk / Sugar'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bill Breakdown (Standard Cafe GST: 2.5% CGST + 2.5% SGST = 5%) */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1 text-xs">
        <div className="flex justify-between text-slate-500">
          <span>Subtotal</span>
          <span className="font-mono">{formatInr(totals.subtotal)}</span>
        </div>

        <div className="flex justify-between text-slate-500">
          <span>CGST @ 2.5%</span>
          <span className="font-mono">{formatInr(totals.cgst)}</span>
        </div>

        <div className="flex justify-between text-slate-500">
          <span>SGST @ 2.5%</span>
          <span className="font-mono">{formatInr(totals.sgst)}</span>
        </div>

        <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
          <span>Cafe 5% GST</span>
          <span className="font-mono">{formatInr(totals.totalGst)}</span>
        </div>

        {totals.roundOff !== 0 && (
          <div className="flex justify-between text-slate-500">
            <span>Round off</span>
            <span className="font-mono">
              {totals.roundOff > 0 ? '+' : ''}
              {formatInr(totals.roundOff)}
            </span>
          </div>
        )}

        {/* Large Total */}
        <div className="flex justify-between items-baseline pt-2 mt-1 border-t border-slate-200 dark:border-slate-800">
          <span className="font-bold text-base text-slate-900 dark:text-white">Total Payable</span>
          <span className="font-mono font-black text-2xl text-brand">
            {formatInr(totals.totalAmount)}
          </span>
        </div>
      </div>

      {/* Action Buttons: "Send to Barista (KOT)" + "Charge / Settle" */}
      <div className="mt-3 flex flex-col gap-2">
        <button
          onClick={() => onSendKot()}
          disabled={cart.length === 0}
          className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChefHat className="w-4 h-4 text-slate-950" />
          <span>Send to Barista (KOT / BOT)</span>
        </button>

        <button
          onClick={onCharge}
          disabled={cart.length === 0}
          className="w-full h-14 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-base flex items-center justify-between px-5 shadow-md transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>Settle & Print Bill</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-lg">{formatInr(totals.totalAmount)}</span>
            <ArrowRight className="w-5 h-5" />
          </div>
        </button>
      </div>
    </div>
  );
};
