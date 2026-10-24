import React, { useState, useEffect } from 'react';
import {
  Store,
  Building2,
  MapPin,
  Phone,
  FileText,
  Save,
  CheckCircle2,
  RotateCcw,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { useAuthStore } from '../store/useAuthStore';
import { KwikioLogoMark } from './KwikioLogo';

export const StoreProfileSettings: React.FC = () => {
  const { storeName, storeAddress, storePhone, storeGstin, updateStoreProfile, showBanner } =
    usePosStore();
  const { currentBusiness } = useAuthStore();

  const [name, setName] = useState(storeName);
  const [address, setAddress] = useState(storeAddress);
  const [phone, setPhone] = useState(storePhone);
  const [gstin, setGstin] = useState(storeGstin);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Synchronize when store values change
  useEffect(() => {
    setName(storeName);
    setAddress(storeAddress);
    setPhone(storePhone);
    setGstin(storeGstin);
  }, [storeName, storeAddress, storePhone, storeGstin]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showBanner('Please provide a business name');
      return;
    }
    if (!address.trim()) {
      showBanner('Please provide a store address');
      return;
    }
    if (!phone.trim()) {
      showBanner('Please provide a store phone number');
      return;
    }

    setIsSaving(true);
    try {
      await updateStoreProfile({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        gstin: gstin.trim(),
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      showBanner(err.message || 'Failed to update store profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToCurrent = () => {
    setName(currentBusiness?.name || 'Spice Cafe');
    setAddress(currentBusiness?.address || '100ft Road, Indiranagar, Bengaluru, Karnataka');
    setPhone(currentBusiness?.phone || '+91 80 2520 8900');
    setGstin(currentBusiness?.tax_identifier || '29AABCS1234F1Z8');
    showBanner('Reset to active database business details');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Store Profile & Receipt Details</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                Live Receipt Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Update business name, address, phone number, and GSTIN. Saved to local IndexedDB and dynamically injected into customer receipts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetToCurrent}
          className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to DB Defaults</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Form Inputs (Left side 7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 flex flex-col gap-4">
          {/* Business Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Business / Cafe Name (Printed on Receipt Header)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spice Cafe"
              required
              className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
          </div>

          {/* Store Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Store Address (Full Street & City Address)</span>
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 100ft Road, Indiranagar, Bengaluru, Karnataka"
              rows={2}
              required
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none"
            />
          </div>

          {/* Phone & GSTIN row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Store Phone Number</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 80 2520 8900"
                required
                className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>GSTIN / Tax ID</span>
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="e.g. 29AABCS1234F1Z8"
                className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 transition-all uppercase"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="h-10 px-5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Saved to Local Database!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-white" />
                  <span>Save Store Profile</span>
                </>
              )}
            </button>
            {isSaved && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" />
                <span>Updated in ReceiptModal instantly!</span>
              </span>
            )}
          </div>
        </form>

        {/* Live Thermal Receipt Header Preview (Right side 5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Live Receipt Header Preview</span>
            </span>
            <span className="text-[10px] text-teal-700 dark:text-teal-300 font-semibold bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
              58mm Thermal Monospace
            </span>
          </div>

          <div className="bg-[#FAF8F5] text-slate-900 font-mono text-xs p-4 rounded-xl border border-amber-200/80 shadow-xs flex flex-col gap-1 select-none leading-relaxed">
            <div className="flex justify-center mb-1">
              <KwikioLogoMark size={24} ringColor="#14161A" />
            </div>
            <div className="text-center font-bold text-sm tracking-wider uppercase text-slate-950">
              {name.trim() || 'STORE NAME'}
            </div>
            <div className="text-center text-[10px] text-slate-700 leading-tight">
              {address.trim() || 'Store Address line 1, City, State'}
            </div>
            {gstin.trim() && (
              <div className="text-center text-[10px] text-slate-700 font-semibold">
                GSTIN: {gstin.trim()}
              </div>
            )}
            <div className="text-center text-[10px] text-slate-700 font-semibold">
              Ph: {phone.trim() || '+91 80 0000 0000'}
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            <div className="flex justify-between text-[11px] text-slate-600">
              <span>Bill No:</span>
              <span className="font-semibold text-slate-900">AUR-CF-2026-1018</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600">
              <span>Date:</span>
              <span>19-Oct-2026 08:48:59</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600">
              <span>Cashier:</span>
              <span className="font-semibold text-slate-900">Rahul Patel</span>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            <div className="text-center text-[9px] text-slate-500 italic">
              *** Live injection active for all receipts ***
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
