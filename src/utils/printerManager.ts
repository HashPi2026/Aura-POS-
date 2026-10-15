/**
 * PrinterManager Utility
 * 
 * Production-ready Web Bluetooth and Web USB API integration for 58mm / 80mm
 * ESC/POS thermal printers (Epson, PT-210, MPT-II, TVS, Xprinter, Sunmi, etc.).
 * Generates raw ESC/POS binary buffers, manages chunked packet transmission,
 * tracks connection status, and provides graceful fallback to window.print().
 */

export type PrinterConnectionType = 'NONE' | 'BLUETOOTH' | 'USB' | 'SYSTEM';
export type PrinterConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'PRINTING' | 'ERROR';
export type PrinterPaperWidth = '58mm' | '80mm';

export interface PrinterState {
  type: PrinterConnectionType;
  status: PrinterConnectionStatus;
  deviceName: string | null;
  paperWidth: PrinterPaperWidth;
  error: string | null;
  lastPrintedAt: number | null;
}

type PrinterStateListener = (state: PrinterState) => void;

// Common BLE Service UUIDs used by mobile thermal receipt printers (POS-58, PT-210, MPT-II, Xprinter, etc.)
const KNOWN_PRINTER_BLE_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Receipt Service
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / CC2540 BLE Serial
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent Serial
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Custom POS Thermal Service
  '0000ff00-0000-1000-8000-00805f9b34fb', // Gprinter / Xprinter Serial
  '0000af30-0000-1000-8000-00805f9b34fb', // Zjiang / GOOJPRT Service
];

/**
 * ESC/POS Binary Command Builder
 */
export class EscPosBuilder {
  private buffer: number[] = [];
  private encoder = new TextEncoder();
  private widthChars: number;

  constructor(paperWidth: PrinterPaperWidth = '58mm') {
    this.widthChars = paperWidth === '80mm' ? 48 : 32;
    this.init();
  }

  public init(): this {
    this.buffer.push(0x1B, 0x40); // ESC @ (Initialize printer)
    return this;
  }

  public alignLeft(): this {
    this.buffer.push(0x1B, 0x61, 0x00); // ESC a 0
    return this;
  }

  public alignCenter(): this {
    this.buffer.push(0x1B, 0x61, 0x01); // ESC a 1
    return this;
  }

  public alignRight(): this {
    this.buffer.push(0x1B, 0x61, 0x02); // ESC a 2
    return this;
  }

  public bold(enable: boolean = true): this {
    this.buffer.push(0x1B, 0x45, enable ? 0x01 : 0x00); // ESC E n
    return this;
  }

  public doubleHeight(enable: boolean = true): this {
    this.buffer.push(0x1D, 0x21, enable ? 0x01 : 0x00); // GS ! n
    return this;
  }

  public doubleWidth(enable: boolean = true): this {
    this.buffer.push(0x1D, 0x21, enable ? 0x10 : 0x00);
    return this;
  }

  public doubleSize(enable: boolean = true): this {
    this.buffer.push(0x1D, 0x21, enable ? 0x11 : 0x00);
    return this;
  }

  public normalSize(): this {
    this.buffer.push(0x1D, 0x21, 0x00);
    return this;
  }

  public underline(enable: boolean = true): this {
    this.buffer.push(0x1B, 0x2D, enable ? 0x01 : 0x00);
    return this;
  }

  public feed(lines: number = 1): this {
    this.buffer.push(0x1B, 0x64, Math.max(1, lines)); // ESC d n
    return this;
  }

  public newline(): this {
    this.buffer.push(0x0A); // LF
    return this;
  }

  public text(str: string): this {
    if (!str) return this;
    const encoded = this.encoder.encode(str);
    for (let i = 0; i < encoded.length; i++) {
      this.buffer.push(encoded[i]);
    }
    return this;
  }

  public textLine(str: string): this {
    this.text(str);
    this.newline();
    return this;
  }

  public separator(char: string = '-'): this {
    const fillChar = char.charAt(0) || '-';
    this.textLine(fillChar.repeat(this.widthChars));
    return this;
  }

  public twoColumns(left: string, right: string): this {
    const total = this.widthChars;
    const l = (left || '').trim();
    const r = (right || '').trim();
    const spaceNeeded = total - (l.length + r.length);
    if (spaceNeeded <= 0) {
      this.textLine(`${l} ${r}`);
    } else {
      this.textLine(`${l}${' '.repeat(spaceNeeded)}${r}`);
    }
    return this;
  }

  public cut(full: boolean = false): this {
    this.feed(3);
    this.buffer.push(0x1D, 0x56, full ? 0x00 : 0x01); // GS V n
    return this;
  }

  public kickDrawer(): this {
    this.buffer.push(0x1B, 0x70, 0x00, 0x19, 0xFA); // ESC p 0 25 250
    return this;
  }

  public toUint8Array(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Main PrinterManager Class
 */
class PrinterManager {
  private state: PrinterState = {
    type: 'NONE',
    status: 'DISCONNECTED',
    deviceName: null,
    paperWidth: '58mm',
    error: null,
    lastPrintedAt: null,
  };

  private listeners: Set<PrinterStateListener> = new Set();

  // Web Bluetooth handles
  private bluetoothDevice: any = null;
  private bluetoothCharacteristic: any = null;

  // Web USB handles
  private usbDevice: any = null;
  private usbEndpointNumber: number | null = null;

  constructor() {
    // Restore saved printer preferences from localStorage if available
    if (typeof localStorage !== 'undefined') {
      const savedWidth = localStorage.getItem('aura_printer_paper_width') as PrinterPaperWidth;
      if (savedWidth === '58mm' || savedWidth === '80mm') {
        this.state.paperWidth = savedWidth;
      }
      const savedName = localStorage.getItem('aura_printer_saved_device');
      const savedType = localStorage.getItem('aura_printer_saved_type') as PrinterConnectionType;
      if (savedName && savedType && savedType !== 'NONE') {
        this.state.deviceName = savedName;
      }
    }
  }

  /**
   * Subscribe to real-time printer state changes
   */
  public subscribe(listener: PrinterStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): PrinterState {
    return { ...this.state };
  }

  private notify(patch?: Partial<PrinterState>): void {
    if (patch) {
      this.state = { ...this.state, ...patch };
    }
    const current = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.warn('PrinterManager listener error:', err);
      }
    });
  }

  public isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public isUsbSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
  }

  public setPaperWidth(width: PrinterPaperWidth): void {
    this.state.paperWidth = width;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('aura_printer_paper_width', width);
    }
    this.notify();
  }

  /**
   * Scans and connects to a Web Bluetooth Thermal Printer
   */
  public async connectBluetooth(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!this.isBluetoothSupported()) {
      const msg = 'Web Bluetooth is not supported in this browser. Use Chrome on Android, Windows, or Mac.';
      this.notify({ error: msg, status: 'ERROR' });
      return { success: false, error: msg };
    }

    this.notify({ status: 'CONNECTING', error: null });

    try {
      const navBluetooth = (navigator as any).bluetooth;

      // Request device with common printer services or accept all Bluetooth devices
      const device = await navBluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_PRINTER_BLE_SERVICES,
      });

      if (!device) {
        throw new Error('No Bluetooth printer selected');
      }

      device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnected('Bluetooth printer connection lost');
      });

      const server = await device.gatt.connect();

      // Find primary service and writable characteristic
      let writableChar: any = null;

      // Try known services first
      for (const serviceUuid of KNOWN_PRINTER_BLE_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writableChar = char;
              break;
            }
          }
          if (writableChar) break;
        } catch (_) {
          // Continue searching other services
        }
      }

      // If not found in known services, search all primary services
      if (!writableChar) {
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            try {
              const characteristics = await service.getCharacteristics();
              for (const char of characteristics) {
                if (char.properties.write || char.properties.writeWithoutResponse) {
                  writableChar = char;
                  break;
                }
              }
              if (writableChar) break;
            } catch (_) {}
          }
        } catch (_) {}
      }

      if (!writableChar) {
        throw new Error('Connected to Bluetooth device, but could not find an ESC/POS write characteristic.');
      }

      this.bluetoothDevice = device;
      this.bluetoothCharacteristic = writableChar;

      const deviceName = device.name || 'Bluetooth Thermal Printer';
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aura_printer_saved_device', deviceName);
        localStorage.setItem('aura_printer_saved_type', 'BLUETOOTH');
      }

      this.notify({
        type: 'BLUETOOTH',
        status: 'CONNECTED',
        deviceName,
        error: null,
      });

      return { success: true, deviceName };
    } catch (err: any) {
      const isCancelled = err.name === 'NotFoundError';
      const errorMsg = isCancelled ? 'Bluetooth pairing cancelled' : err.message || 'Bluetooth connection failed';
      this.notify({
        status: isCancelled ? 'DISCONNECTED' : 'ERROR',
        error: errorMsg,
      });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Scans and connects to a Web USB Thermal Printer
   */
  public async connectUsb(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!this.isUsbSupported()) {
      const msg = 'Web USB is not supported in this browser. Use Chrome on desktop or Android.';
      this.notify({ error: msg, status: 'ERROR' });
      return { success: false, error: msg };
    }

    this.notify({ status: 'CONNECTING', error: null });

    try {
      const navUsb = (navigator as any).usb;

      // Standard USB Printer Class is classCode 7
      let device = null;
      try {
        device = await navUsb.requestDevice({
          filters: [{ classCode: 7 }],
        });
      } catch (_) {
        // Fallback: request any USB device if filtering by class is rejected
        device = await navUsb.requestDevice({ filters: [] });
      }

      if (!device) {
        throw new Error('No USB printer selected');
      }

      await device.open();

      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Find printer interface and OUT endpoint
      let targetInterfaceNumber: number | null = null;
      let targetEndpointNumber: number | null = null;

      for (const iface of device.configuration.interfaces) {
        for (const alt of iface.alternates) {
          for (const ep of alt.endpoints) {
            if (ep.direction === 'out') {
              targetInterfaceNumber = iface.interfaceNumber;
              targetEndpointNumber = ep.endpointNumber;
              break;
            }
          }
          if (targetEndpointNumber !== null) break;
        }
        if (targetEndpointNumber !== null) break;
      }

      if (targetInterfaceNumber === null || targetEndpointNumber === null) {
        throw new Error('Could not find USB printer OUT endpoint for ESC/POS data transfer.');
      }

      await device.claimInterface(targetInterfaceNumber);

      this.usbDevice = device;
      this.usbEndpointNumber = targetEndpointNumber;

      const deviceName = device.productName || 'USB Thermal POS Printer';
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aura_printer_saved_device', deviceName);
        localStorage.setItem('aura_printer_saved_type', 'USB');
      }

      this.notify({
        type: 'USB',
        status: 'CONNECTED',
        deviceName,
        error: null,
      });

      return { success: true, deviceName };
    } catch (err: any) {
      const isCancelled = err.name === 'NotFoundError';
      const errorMsg = isCancelled ? 'USB pairing cancelled' : err.message || 'USB connection failed';
      this.notify({
        status: isCancelled ? 'DISCONNECTED' : 'ERROR',
        error: errorMsg,
      });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Sets the printer to System / Virtual mode (routes to browser window.print())
   */
  public connectSystem(): void {
    this.notify({
      type: 'SYSTEM',
      status: 'CONNECTED',
      deviceName: 'System / Browser Thermal Driver',
      error: null,
    });
  }

  /**
   * Disconnects active hardware connection
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.bluetoothDevice && this.bluetoothDevice.gatt?.connected) {
        this.bluetoothDevice.gatt.disconnect();
      }
    } catch (_) {}

    try {
      if (this.usbDevice && this.usbDevice.opened) {
        await this.usbDevice.close();
      }
    } catch (_) {}

    this.bluetoothDevice = null;
    this.bluetoothCharacteristic = null;
    this.usbDevice = null;
    this.usbEndpointNumber = null;

    this.notify({
      type: 'NONE',
      status: 'DISCONNECTED',
      deviceName: null,
      error: null,
    });
  }

  private handleDisconnected(reason: string): void {
    this.bluetoothDevice = null;
    this.bluetoothCharacteristic = null;
    this.usbDevice = null;
    this.usbEndpointNumber = null;

    this.notify({
      type: 'NONE',
      status: 'DISCONNECTED',
      deviceName: null,
      error: reason,
    });
  }

  /**
   * Transmits raw ESC/POS binary buffer via Web Bluetooth, Web USB, or window.print() fallback
   */
  public async sendRaw(data: Uint8Array): Promise<boolean> {
    const { type } = this.state;

    // 1. Web Bluetooth Direct Binary Stream
    if (type === 'BLUETOOTH' && this.bluetoothCharacteristic) {
      this.notify({ status: 'PRINTING' });
      try {
        // BLE MTU safe chunking (chunk into 64-byte slices to prevent buffer overflow)
        const CHUNK_SIZE = 64;
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
          const chunk = data.slice(i, i + CHUNK_SIZE);
          if (this.bluetoothCharacteristic.writeValueWithoutResponse) {
            await this.bluetoothCharacteristic.writeValueWithoutResponse(chunk);
          } else {
            await this.bluetoothCharacteristic.writeValue(chunk);
          }
          // Brief 15ms throttle for microcontrollers
          await new Promise((res) => setTimeout(res, 15));
        }

        this.notify({ status: 'CONNECTED', lastPrintedAt: Date.now() });
        return true;
      } catch (err: any) {
        console.error('Web Bluetooth send failed:', err);
        this.notify({ status: 'ERROR', error: err.message || 'Bluetooth transmission error' });
        // Fallback to window.print()
        this.fallbackSystemPrint();
        return false;
      }
    }

    // 2. Web USB Direct Bulk Stream
    if (type === 'USB' && this.usbDevice && this.usbEndpointNumber !== null) {
      this.notify({ status: 'PRINTING' });
      try {
        await this.usbDevice.transferOut(this.usbEndpointNumber, data);
        this.notify({ status: 'CONNECTED', lastPrintedAt: Date.now() });
        return true;
      } catch (err: any) {
        console.error('Web USB send failed:', err);
        this.notify({ status: 'ERROR', error: err.message || 'USB transmission error' });
        // Fallback to window.print()
        this.fallbackSystemPrint();
        return false;
      }
    }

    // 3. Fallback: Native Browser Print Dialog (pre-formatted with CSS 58mm/80mm media styles)
    this.fallbackSystemPrint();
    return true;
  }

  private fallbackSystemPrint(): void {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      try {
        window.print();
        this.notify({ lastPrintedAt: Date.now() });
      } catch (_) {}
    }
  }

  /**
   * Generates and prints an ESC/POS test receipt
   */
  public async printTestSlip(): Promise<boolean> {
    const builder = new EscPosBuilder(this.state.paperWidth);

    builder
      .alignCenter()
      .doubleSize(true)
      .bold(true)
      .textLine('AURA POS')
      .normalSize()
      .bold(false)
      .textLine('Thermal ESC/POS Hardware Test')
      .textLine(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))
      .separator('=')
      .alignLeft()
      .twoColumns('Connection:', this.state.type)
      .twoColumns('Device:', this.state.deviceName || 'Direct Driver')
      .twoColumns('Paper Size:', this.state.paperWidth)
      .twoColumns('Baud Rate / MTU:', 'Direct USB / BLE 64B')
      .separator('-')
      .alignCenter()
      .bold(true)
      .textLine('STATUS: OPERATIONAL')
      .bold(false)
      .textLine('Specialty Coffee & Cafe POS')
      .textLine('Ready for billing & Barista KOT')
      .separator('=')
      .feed(2)
      .cut();

    return this.sendRaw(builder.toUint8Array());
  }

  /**
   * Generates and prints a complete café customer receipt slip
   */
  public async printReceiptSlip(
    sale: {
      receiptNumber: string;
      timestamp: number;
      cashierName?: string;
      counterName?: string;
      orderType?: string;
      tableName?: string;
      items: Array<{
        name: string;
        price: number;
        quantity: number;
        selectedModifiers?: Array<{ name: string; price: number }>;
      }>;
      subtotal: number;
      cgst?: number;
      sgst?: number;
      totalGst?: number;
      roundOff?: number;
      totalAmount: number;
      paymentMethod?: string;
      amountTendered?: number;
      changeDue?: number;
      upiRef?: string;
    },
    storeInfo: {
      name?: string;
      address?: string;
      gstin?: string;
    } = {}
  ): Promise<boolean> {
    const builder = new EscPosBuilder(this.state.paperWidth);

    const storeName = storeInfo.name || 'AURA CAFE & ROASTERY';
    const storeAddress = storeInfo.address || 'Indiranagar 12th Main, Bengaluru';
    const storeGstin = storeInfo.gstin || '29AAAAA0000A1Z5';

    builder
      .alignCenter()
      .doubleSize(true)
      .bold(true)
      .textLine(storeName)
      .normalSize()
      .bold(false)
      .textLine(storeAddress)
      .textLine(`GSTIN: ${storeGstin}`)
      .separator('=')
      .alignLeft()
      .twoColumns('Invoice No:', sale.receiptNumber)
      .twoColumns('Date:', new Date(sale.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))
      .twoColumns('Type:', sale.orderType || 'DINE_IN')
      .twoColumns('Table / Seating:', sale.tableName || 'Counter')
      .twoColumns('Cashier:', sale.cashierName || 'Counter Cashier')
      .separator('-')
      .twoColumns('ITEM', 'QTY x PRICE  TOTAL');

    // Print item lines
    for (const it of sale.items) {
      const lineTotal = it.price * it.quantity;
      builder.textLine(it.name);

      if (it.selectedModifiers && it.selectedModifiers.length > 0) {
        for (const mod of it.selectedModifiers) {
          const modPrice = mod.price > 0 ? ` (+Rs ${mod.price})` : '';
          builder.textLine(`  + ${mod.name}${modPrice}`);
        }
      }

      builder.twoColumns(`  ${it.quantity} x Rs ${it.price.toFixed(2)}`, `Rs ${lineTotal.toFixed(2)}`);
    }

    builder
      .separator('-')
      .twoColumns('Subtotal:', `Rs ${sale.subtotal.toFixed(2)}`);

    if (sale.cgst !== undefined && sale.sgst !== undefined) {
      builder
        .twoColumns('CGST @ 2.5%:', `Rs ${sale.cgst.toFixed(2)}`)
        .twoColumns('SGST @ 2.5%:', `Rs ${sale.sgst.toFixed(2)}`);
    } else if (sale.totalGst !== undefined) {
      builder.twoColumns('GST @ 5%:', `Rs ${sale.totalGst.toFixed(2)}`);
    }

    if (sale.roundOff) {
      builder.twoColumns('Round Off:', `Rs ${sale.roundOff.toFixed(2)}`);
    }

    builder
      .separator('=')
      .doubleHeight(true)
      .bold(true)
      .twoColumns('TOTAL AMOUNT:', `Rs ${Math.round(sale.totalAmount).toFixed(2)}`)
      .doubleHeight(false)
      .bold(false)
      .separator('-')
      .twoColumns('Payment Mode:', sale.paymentMethod || 'CASH');

    if (sale.upiRef) {
      builder.twoColumns('UPI Ref:', sale.upiRef);
    }
    if (sale.amountTendered && sale.amountTendered > sale.totalAmount) {
      builder
        .twoColumns('Tendered:', `Rs ${sale.amountTendered.toFixed(2)}`)
        .twoColumns('Change Due:', `Rs ${(sale.changeDue || 0).toFixed(2)}`);
    }

    builder
      .separator('=')
      .alignCenter()
      .textLine('Thank You! Visit Us Again.')
      .textLine('Handcrafted Brews & Fresh Bakes')
      .feed(2)
      .cut()
      .kickDrawer();

    return this.sendRaw(builder.toUint8Array());
  }

  /**
   * Generates and prints a Kitchen/Barista Order Ticket (KOT)
   */
  public async printKotSlip(kot: {
    kotNumber: string;
    tableName?: string;
    orderType?: string;
    serverName?: string;
    timestamp: number;
    items: Array<{ name: string; quantity: number; selectedModifiers?: Array<{ name: string }>; customNotes?: string }>;
    specialInstructions?: string;
  }): Promise<boolean> {
    const builder = new EscPosBuilder(this.state.paperWidth);

    builder
      .alignCenter()
      .doubleSize(true)
      .bold(true)
      .textLine('*** BARISTA KOT ***')
      .normalSize()
      .bold(false)
      .textLine(kot.kotNumber)
      .separator('=')
      .alignLeft()
      .twoColumns('Table / Type:', `${kot.tableName || 'Counter'} (${kot.orderType || 'DINE_IN'})`)
      .twoColumns('Time:', new Date(kot.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }))
      .twoColumns('Server:', kot.serverName || 'Barista')
      .separator('-')
      .bold(true)
      .twoColumns('ITEM DESCRIPTION', 'QTY')
      .bold(false)
      .separator('-');

    for (const item of kot.items) {
      builder.bold(true).twoColumns(item.name, `${item.quantity}x`).bold(false);

      if (item.selectedModifiers && item.selectedModifiers.length > 0) {
        for (const mod of item.selectedModifiers) {
          builder.textLine(`  >> ${mod.name}`);
        }
      }

      if (item.customNotes) {
        builder.textLine(`  * NOTE: ${item.customNotes}`);
      }
    }

    if (kot.specialInstructions) {
      builder
        .separator('-')
        .bold(true)
        .textLine('KITCHEN INSTRUCTIONS:')
        .bold(false)
        .textLine(kot.specialInstructions);
    }

    builder
      .separator('=')
      .feed(2)
      .cut();

    return this.sendRaw(builder.toUint8Array());
  }
}

export const printerManager = new PrinterManager();
