import React, { useState } from 'react';
import { Delete, ShoppingBag } from 'lucide-react';
import { usePosStore } from '../store/usePosStore';

export const LoginPinModal: React.FC = () => {
  const { isLocked, unlockWithPin, cashierName, counterName, storeName } = usePosStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isLocked) return null;

  const handleKeyClick = (val: string) => {
    setError(false);
    if (pin.length < 4) {
      const nextPin = pin + val;
      setPin(nextPin);
      if (nextPin.length === 4) {
        const success = unlockWithPin(nextPin);
        if (!success) {
          setError(true);
          setPin('');
        }
      }
    }
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', 'DEL'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full p-7 flex flex-col items-center border border-slate-200 dark:border-slate-800">
        <div className="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center mb-4 shadow-md">
          <ShoppingBag className="w-8 h-8" />
        </div>

        <h2 className="font-bold text-xl text-slate-900 dark:text-white">{storeName}</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {counterName} • {cashierName}
        </p>

        <div className="my-5 flex flex-col items-center">
          <span className="text-xs font-semibold text-slate-400 mb-3">ENTER CASHIER PIN</span>
          <div className="flex items-center gap-3">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all border ${
                  idx < pin.length
                    ? 'bg-brand border-brand'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                }`}
              />
            ))}
          </div>

          {error && (
            <span className="text-xs font-bold text-rose-500 mt-3 animate-shake">
              Incorrect PIN. Try 1234
            </span>
          )}
        </div>

        {/* 4-digit numeric keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          {keypadRows.flat().map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                if (k === 'C') handleClear();
                else if (k === 'DEL') handleDelete();
                else handleKeyClick(k);
              }}
              className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-teal-100 dark:active:bg-teal-900 font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center justify-center transition-colors border border-slate-200 dark:border-slate-700/60 shadow-2xs"
            >
              {k === 'DEL' ? <Delete className="w-5 h-5 text-slate-600 dark:text-slate-300" /> : k}
            </button>
          ))}
        </div>

        <div className="mt-4 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
          Demo PIN: <strong className="text-slate-900 dark:text-white">1234</strong>
        </div>
      </div>
    </div>
  );
};
