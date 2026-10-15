import React, { useState, useEffect } from 'react';
import {
  Printer,
  Bluetooth,
  Usb,
  Wifi,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Settings2,
  FileText,
  X,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Power,
  Monitor,
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { printerManager, PrinterPaperWidth, PrinterState } from '../utils/printerManager';

interface ThermalPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type PrinterTabType = 'BLUETOOTH' | 'USB' | 'WIFI' | 'SYSTEM';

export const ThermalPrinterModal: React.FC<ThermalPrinterModalProps> = ({ isOpen, onClose }) => {
  const { showBanner } = usePosStore();

  const [printerState, setPrinterState] = useState<PrinterState>(printerManager.getState());
  const [activeTab, setActiveTab] = useState<PrinterTabType>('BLUETOOTH');
  const [isPairing, setIsPairing] = useState(false);
  const [printerIp, setPrinterIp] = useState('192.168.1.100');
  const [autoPrintOnSettle, setAutoPrintOnSettle] = useState(true);

  useEffect(() => {
    const unsubscribe = printerManager.subscribe((state) => {
      setPrinterState(state);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const isBluetoothSupported = printerManager.isBluetoothSupported();
  const isUsbSupported = printerManager.isUsbSupported();

  const handleConnectBluetooth = async () => {
    setIsPairing(true);
    showBanner('Scanning for nearby Bluetooth thermal printers...');
    const res = await printerManager.connectBluetooth();
    setIsPairing(false);

    if (res.success) {
      showBanner(`Connected to ${res.deviceName || 'Bluetooth Printer'}!`);
      usePosStore.setState({ printerConnected: true });
    } else {
      showBanner(res.error || 'Bluetooth pairing was cancelled');
    }
  };

  const handleConnectUsb = async () => {
    setIsPairing(true);
    showBanner('Scanning for connected USB thermal printers...');
    const res = await printerManager.connectUsb();
    setIsPairing(false);

    if (res.success) {
      showBanner(`Connected to ${res.deviceName || 'USB Printer'}!`);
      usePosStore.setState({ printerConnected: true });
    } else {
      showBanner(res.error || 'USB pairing was cancelled');
    }
  };

  const handleConnectSystem = () => {
    printerManager.connectSystem();
    usePosStore.setState({ printerConnected: true });
    showBanner('Printer mode set to System Print Driver');
  };

  const handleDisconnect = async () => {
    await printerManager.disconnect();
    usePosStore.setState({ printerConnected: false });
    showBanner('Thermal printer disconnected');
  };

  const handleTestPrint = async () => {
    showBanner(`Sending ESC/POS hardware test slip (${printerState.paperWidth})...`);
    const ok = await printerManager.printTestSlip();
    if (ok) {
      showBanner('Test slip sent successfully!');
    }
  };

  const handlePaperWidthChange = (width: PrinterPaperWidth) => {
    printerManager.setPaperWidth(width);
    showBanner(`Paper format set to ${width}`);
  };

  const isConnected = printerState.status === 'CONNECTED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 sm:p-4 select-none animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Thermal POS Printer Setup
              </h3>
              <p className="text-xs text-slate-500">
                Web Bluetooth, Web USB & ESC/POS command stream
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Connection Type Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 pt-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('BLUETOOTH')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'BLUETOOTH'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Bluetooth className="w-4 h-4" />
            <span>Bluetooth</span>
          </button>

          <button
            onClick={() => setActiveTab('USB')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'USB'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Usb className="w-4 h-4" />
            <span>USB Cable / OTG</span>
          </button>

          <button
            onClick={() => setActiveTab('WIFI')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'WIFI'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>WiFi / Network</span>
          </button>

          <button
            onClick={() => setActiveTab('SYSTEM')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'SYSTEM'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>System Driver</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-4 text-xs">
          {/* Status Alert Banner */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              isConnected
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : printerState.status === 'ERROR'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isConnected ? (
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              ) : printerState.status === 'ERROR' ? (
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                  <Printer className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
              )}
              <div className="truncate">
                <span className="font-bold block truncate">
                  {isConnected
                    ? `Connected: ${printerState.deviceName || 'Thermal Printer'}`
                    : printerState.status === 'ERROR'
                    ? 'Printer Error'
                    : 'Printer Disconnected'}
                </span>
                <span className="text-[11px] opacity-80 block truncate">
                  {isConnected
                    ? `${printerState.type} Stream • ${printerState.paperWidth} Paper • ESC/POS Active`
                    : printerState.error || 'Select a connection method below to start printing'}
                </span>
              </div>
            </div>

            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-100 hover:text-rose-700 transition-all shrink-0"
              >
                Disconnect
              </button>
            ) : null}
          </div>

          {/* TAB 1: BLUETOOTH */}
          {activeTab === 'BLUETOOTH' && (
            <div className="flex flex-col gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Bluetooth className="w-4 h-4 text-sky-600" />
                    <span>Web Bluetooth Scanning & Pairing</span>
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isBluetoothSupported
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {isBluetoothSupported ? 'Web Bluetooth Supported' : 'Requires Chrome'}
                  </span>
                </div>

                <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                  <li>
                    <strong>Turn on your printer:</strong> Load 58mm or 80mm roll. Ensure the blue LED is blinking.
                  </li>
                  <li>
                    <strong>Pair with Device:</strong> If prompted by Android or PC, the default PIN is <code>0000</code> or <code>1234</code>.
                  </li>
                  <li>
                    <strong>Tap Scan:</strong> Click the button below to select your printer in the Chrome Bluetooth picker.
                  </li>
                </ol>

                <div className="mt-3.5">
                  <button
                    onClick={handleConnectBluetooth}
                    disabled={isPairing}
                    className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    {isPairing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Searching for Bluetooth Printers...</span>
                      </>
                    ) : (
                      <>
                        <Bluetooth className="w-4 h-4" />
                        <span>Scan & Pair Web Bluetooth Printer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USB */}
          {activeTab === 'USB' && (
            <div className="flex flex-col gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Usb className="w-4 h-4 text-teal-600" />
                    <span>Web USB Direct Cable Connection</span>
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isUsbSupported
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {isUsbSupported ? 'Web USB Supported' : 'Requires Chrome'}
                  </span>
                </div>

                <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                  <li>
                    <strong>Connect Cable:</strong> Plug USB cable from printer into your POS PC, tablet, or phone (use USB-C OTG adapter for phones).
                  </li>
                  <li>
                    <strong>Power On:</strong> Turn on printer.
                  </li>
                  <li>
                    <strong>Grant Permission:</strong> Tap the button below to grant Chrome direct bulk USB transfer permissions.
                  </li>
                </ol>

                <div className="mt-3.5">
                  <button
                    onClick={handleConnectUsb}
                    disabled={isPairing}
                    className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    {isPairing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Connecting USB Device...</span>
                      </>
                    ) : (
                      <>
                        <Usb className="w-4 h-4" />
                        <span>Scan & Connect Web USB Printer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WIFI */}
          {activeTab === 'WIFI' && (
            <div className="flex flex-col gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                  <Wifi className="w-4 h-4 text-teal-600" />
                  <span>WiFi / Network LAN KOT Setup:</span>
                </h4>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                  <li>
                    <strong>Connect to Router:</strong> Plug Ethernet cable into café router or connect printer to café WiFi SSID.
                  </li>
                  <li>
                    <strong>Find Printer IP:</strong> Hold Feed button while powering on the printer to print the IP configuration slip (e.g., <code>192.168.1.100</code>).
                  </li>
                  <li>
                    <strong>Set Target IP:</strong> Enter IP below.
                  </li>
                </ol>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={printerIp}
                    onChange={(e) => setPrinterIp(e.target.value)}
                    placeholder="e.g. 192.168.1.100"
                    className="flex-1 h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                  />
                  <button
                    onClick={() => showBanner(`Saved Network Printer IP: ${printerIp}`)}
                    className="h-10 px-4 rounded-xl bg-teal-600 text-white font-bold text-xs shrink-0"
                  >
                    Save IP
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM DRIVER */}
          {activeTab === 'SYSTEM' && (
            <div className="flex flex-col gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                  <Monitor className="w-4 h-4 text-teal-600" />
                  <span>Operating System Native Driver</span>
                </h4>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] mb-3">
                  Routes all receipts and barista tickets through the native Android / Windows / macOS print dialog. Pre-formatted with continuous 58mm/80mm roll CSS media styles.
                </p>

                <button
                  onClick={handleConnectSystem}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Monitor className="w-4 h-4" />
                  <span>Use System Print Driver</span>
                </button>
              </div>
            </div>
          )}

          {/* Hardware Configuration Options */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex flex-col gap-3">
            <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-teal-600" />
              <span>Paper Roll Width & Preferences:</span>
            </h5>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePaperWidthChange('58mm')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                  printerState.paperWidth === '58mm'
                    ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 ring-1 ring-teal-600'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600'
                }`}
              >
                <span className="font-bold text-xs">58mm Paper (2 Inch)</span>
                <span className="text-[10px] text-slate-500">32 Columns • Standard portable POS</span>
              </button>

              <button
                type="button"
                onClick={() => handlePaperWidthChange('80mm')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                  printerState.paperWidth === '80mm'
                    ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 ring-1 ring-teal-600'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600'
                }`}
              >
                <span className="font-bold text-xs">80mm Paper (3 Inch)</span>
                <span className="text-[10px] text-slate-500">48 Columns • Wide KOT & counter roll</span>
              </button>
            </div>

            <label className="flex items-center gap-2.5 mt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPrintOnSettle}
                onChange={(e) => setAutoPrintOnSettle(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Auto-print customer bill immediately upon payment settlement
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <button
            onClick={handleTestPrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-teal-600 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/60 font-bold text-xs transition-all active:scale-[0.98]"
          >
            <FileText className="w-4 h-4" />
            <span>Send ESC/POS Test Slip</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
