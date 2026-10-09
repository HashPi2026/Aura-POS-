import React from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { THEME_PRESETS, ColorTheme } from '../utils/themePresets';

export const ThemeSelector: React.FC = () => {
  const { colorTheme, setColorTheme } = usePosStore();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-brand-light text-brand flex items-center justify-center shrink-0">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>Counter Color Theme</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-light text-brand border border-brand-light">
                Live Switch
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Customize the terminal's primary palette to match your store branding & vertical
            </p>
          </div>
        </div>
      </div>

      {/* Grid of 5 Retail Theme Presets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {THEME_PRESETS.map((preset) => {
          const isSelected = colorTheme === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => setColorTheme(preset.id)}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all select-none relative group ${
                isSelected
                  ? 'border-brand bg-brand-light/40 ring-2 ring-brand'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  {/* Color Swatch Dots */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-full shadow-2xs border border-white/60"
                      style={{ backgroundColor: preset.primaryHex }}
                    />
                    <span
                      className="w-3 h-3 rounded-full shadow-2xs border border-white/60"
                      style={{ backgroundColor: preset.primaryLightHex }}
                    />
                    <span
                      className="w-3 h-3 rounded-full shadow-2xs border border-white/60"
                      style={{ backgroundColor: preset.accentHex }}
                    />
                  </div>

                  {isSelected ? (
                    <span className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Apply
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {preset.name}
                </h4>
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  {preset.category}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed line-clamp-2">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
