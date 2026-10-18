import React, { useState } from 'react';
import { Coffee, X, Check } from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { CartItem } from '../db/indexedDb';

interface ItemCustomizationModalProps {
  item: CartItem | null;
  onClose: () => void;
}

export const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({
  item,
  onClose,
}) => {
  const { setItemNotes } = usePosStore();
  const [note, setNote] = useState(item?.customNotes || '');

  if (!item) return null;

  const baristaPresets = [
    'Oat Milk (+₹40)',
    'Almond Milk (+₹50)',
    'Soy Milk (+₹30)',
    'No Sugar',
    'Low / Half Sugar',
    'Extra Espresso Shot (+₹40)',
    'Vanilla Syrup (+₹30)',
    'Caramel Drizzle (+₹25)',
    'Extra Hot',
    'Less Ice',
    'Warm / Toasted',
    'Decaf Coffee',
  ];

  const handleTogglePreset = (preset: string) => {
    if (note.includes(preset)) {
      setNote(
        note
          .replace(preset, '')
          .replace(', ,', ',')
          .replace(/^,\s*/, '')
          .replace(/,\s*$/, '')
          .trim()
      );
    } else {
      setNote(note ? `${note}, ${preset}` : preset);
    }
  };

  const handleSave = () => {
    setItemNotes(item.productId, note.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Coffee className="w-4 h-4 text-brand" />
              <span>Barista & Kitchen Instructions</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold">{item.name}</p>
          </div>

          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Barista Chips */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
            Milk, Syrups & Temperature Options
          </label>
          <div className="flex flex-wrap gap-1.5">
            {baristaPresets.map((preset) => {
              const active = note.includes(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleTogglePreset(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                    active
                      ? 'bg-brand text-white border-brand shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Input */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
            Special Barista Note
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Extra foam, cinnamon dust, warm croissant..."
            className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>Apply to Cup</span>
          </button>
        </div>
      </div>
    </div>
  );
};
