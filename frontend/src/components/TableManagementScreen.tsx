import React, { useState } from 'react';
import {
  Users,
  Clock,
  PlusCircle,
  Receipt,
  Coffee,
  CheckCircle2,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { formatInr } from '../utils/format';
import { RestaurantTable } from '../db/indexedDb';

export const TableManagementScreen: React.FC = () => {
  const { tables, selectTable, occupyTable, vacateTable, resetFloorPlan, setActiveTab } = usePosStore();
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [guestModalTable, setGuestModalTable] = useState<RestaurantTable | null>(null);
  const [guestCount, setGuestCount] = useState<number>(2);

  const areas = ['All', 'Indoor Lounge', 'Coffee Bar', 'Outdoor Garden Patio'];

  const filteredTables = tables.filter(
    (t) => selectedArea === 'All' || t.area === selectedArea
  );

  const formatElapsed = (timestamp?: number) => {
    if (!timestamp) return '';
    const mins = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  };

  const handleTableClick = (table: RestaurantTable) => {
    if (table.status === 'VACANT') {
      setGuestModalTable(table);
      setGuestCount(table.capacity);
    } else {
      selectTable(table);
      setActiveTab('CHECKOUT');
    }
  };

  const handleConfirmSeat = async () => {
    if (guestModalTable) {
      await occupyTable(guestModalTable.id, guestCount);
      const updated = tables.find((t) => t.id === guestModalTable.id);
      await selectTable(updated || guestModalTable);
      setGuestModalTable(null);
      setActiveTab('CHECKOUT');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-100 dark:bg-slate-950 flex flex-col gap-4 max-w-7xl mx-auto w-full">
      {/* Header & Area Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coffee className="w-5 h-5 text-brand" />
            <span>Cafe Floor Plan & Seating</span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time lounge tables, coffee bar stools, and garden patio occupancy
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Area Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {areas.map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedArea === area
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {area}
              </button>
            ))}
          </div>

          {/* Reset Tables Button */}
          <button
            onClick={() => {
              if (confirm('Clear all active orders and reset all tables to vacant?')) {
                resetFloorPlan();
              }
            }}
            title="Reset all tables to vacant"
            className="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Floor</span>
          </button>
        </div>
      </div>

      {/* Tables Status Summary Bar */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Available Seats</span>
            <div className="text-lg sm:text-2xl font-black text-emerald-600">
              {tables.filter((t) => t.status === 'VACANT').length}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Occupied Tables</span>
            <div className="text-lg sm:text-2xl font-black text-amber-600">
              {tables.filter((t) => t.status === 'OCCUPIED').length}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-sky-200 dark:border-sky-900/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Billed / Settling</span>
            <div className="text-lg sm:text-2xl font-black text-sky-600">
              {tables.filter((t) => t.status === 'BILLED').length}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950 flex items-center justify-center text-sky-600 font-bold">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Table Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {filteredTables.map((table) => {
          const isOccupied = table.status === 'OCCUPIED';
          const isBilled = table.status === 'BILLED';
          const tableTotal = table.cartItems
            ? table.cartItems.reduce((acc, it) => acc + it.price * it.quantity, 0)
            : 0;

          return (
            <div
              key={table.id}
              className={`p-3.5 rounded-2xl bg-white dark:bg-slate-900 border text-left flex flex-col justify-between transition-all select-none relative shadow-2xs hover:shadow-sm ${
                isOccupied
                  ? 'border-amber-400 dark:border-amber-700 ring-2 ring-amber-400/20'
                  : isBilled
                  ? 'border-sky-400 dark:border-sky-700 ring-2 ring-sky-400/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-brand'
              }`}
            >
              <div>
                {/* Table Header: Name + Status */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                    {table.name}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                      isOccupied
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : isBilled
                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {table.status}
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {isOccupied && table.guestCount
                      ? `${table.guestCount} Guests`
                      : `${table.capacity} Seater`}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 truncate">{table.area}</div>

                {/* Occupancy details */}
                {isOccupied && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between text-slate-500 text-[10px]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-500" />
                        {formatElapsed(table.seatedAt)}
                      </span>
                    </div>

                    {tableTotal > 0 && (
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          {table.cartItems?.length} items
                        </span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          {formatInr(tableTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                <button
                  onClick={() => handleTableClick(table)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1 ${
                    isOccupied || isBilled
                      ? 'bg-brand text-white hover:bg-brand-hover shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-brand hover:text-white'
                  }`}
                >
                  {isOccupied ? (
                    <span>Open Bill</span>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Seat</span>
                    </>
                  )}
                </button>

                {(isOccupied || isBilled) && (
                  <button
                    onClick={() => vacateTable(table.id)}
                    title="Vacate and clear table"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Guest Seating Modal */}
      {guestModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Seat Guests at {guestModalTable.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {guestModalTable.area} • Max Capacity: {guestModalTable.capacity} guests
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 block">
                Number of Guests
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => setGuestCount(num)}
                    className={`h-10 rounded-xl font-bold text-sm transition-all border ${
                      guestCount === num
                        ? 'bg-brand text-white border-brand shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setGuestModalTable(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSeat}
                className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-sm"
              >
                Confirm & Take Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
