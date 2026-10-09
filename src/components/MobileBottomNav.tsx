import React from 'react';
import { ShoppingBag, History, Settings, UtensilsCrossed, ChefHat, Coffee } from 'lucide-react';
import { usePosStore, ScreenTab } from '../store/usePosStore';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = usePosStore();

  const navItems: { tab: ScreenTab; label: string; icon: React.ReactNode }[] = [
    {
      tab: 'CHECKOUT',
      label: 'Order',
      icon: <ShoppingBag className="w-5 h-5" />,
    },
    {
      tab: 'TABLES',
      label: 'Tables',
      icon: <UtensilsCrossed className="w-5 h-5" />,
    },
    {
      tab: 'KOT',
      label: 'Barista',
      icon: <ChefHat className="w-5 h-5" />,
    },
    {
      tab: 'PRODUCTS',
      label: 'Menu',
      icon: <Coffee className="w-5 h-5" />,
    },
    {
      tab: 'SETTINGS',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <nav className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-1 py-1.5 flex items-center justify-around z-30 select-none pb-safe shrink-0 shadow-lg">
      {navItems.map((item) => {
        const isSelected = activeTab === item.tab;
        return (
          <button
            key={item.tab}
            onClick={() => setActiveTab(item.tab)}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all relative min-h-[48px] ${
              isSelected
                ? 'text-brand font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 font-medium'
            }`}
          >
            {item.icon}
            <span className="text-[10px] sm:text-[11px] mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
