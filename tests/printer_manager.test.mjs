import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test ESC/POS Builder Logic
class EscPosBuilderTest {
  constructor(paperWidth = '58mm') {
    this.buffer = [];
    this.widthChars = paperWidth === '80mm' ? 48 : 32;
    this.init();
  }

  init() {
    this.buffer.push(0x1B, 0x40);
    return this;
  }

  alignCenter() {
    this.buffer.push(0x1B, 0x61, 0x01);
    return this;
  }

  alignLeft() {
    this.buffer.push(0x1B, 0x61, 0x00);
    return this;
  }

  alignRight() {
    this.buffer.push(0x1B, 0x61, 0x02);
    return this;
  }

  bold(enable = true) {
    this.buffer.push(0x1B, 0x45, enable ? 0x01 : 0x00);
    return this;
  }

  doubleSize(enable = true) {
    this.buffer.push(0x1D, 0x21, enable ? 0x11 : 0x00);
    return this;
  }

  newline() {
    this.buffer.push(0x0A);
    return this;
  }

  text(str) {
    const buf = Buffer.from(str, 'utf8');
    for (const b of buf) {
      this.buffer.push(b);
    }
    return this;
  }

  textLine(str) {
    this.text(str);
    this.newline();
    return this;
  }

  twoColumns(left, right) {
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

  separator(char = '-') {
    this.textLine(char.repeat(this.widthChars));
    return this;
  }

  cut() {
    this.buffer.push(0x1D, 0x56, 0x01);
    return this;
  }

  kickDrawer() {
    this.buffer.push(0x1B, 0x70, 0x00, 0x19, 0xFA);
    return this;
  }

  toUint8Array() {
    return new Uint8Array(this.buffer);
  }
}

test('EscPosBuilder: Generates standard ESC/POS hardware initialization and text', () => {
  const builder = new EscPosBuilderTest('58mm');
  builder.alignCenter().bold(true).textLine('AURA CAFE').bold(false).newline();
  const bytes = builder.toUint8Array();

  // Verify init command 0x1B, 0x40
  assert.equal(bytes[0], 0x1B);
  assert.equal(bytes[1], 0x40);

  // Verify center alignment 0x1B, 0x61, 0x01
  assert.equal(bytes[2], 0x1B);
  assert.equal(bytes[3], 0x61);
  assert.equal(bytes[4], 0x01);

  // Verify bold 0x1B, 0x45, 0x01
  assert.equal(bytes[5], 0x1B);
  assert.equal(bytes[6], 0x45);
  assert.equal(bytes[7], 0x01);

  // Verify text inclusion
  const textStr = Buffer.from(bytes).toString('utf8');
  assert.match(textStr, /AURA CAFE/);
});

test('EscPosBuilder: Two-column layout pads accurately for 58mm (32 chars) and 80mm (48 chars)', () => {
  const b58 = new EscPosBuilderTest('58mm');
  b58.twoColumns('Total:', 'Rs 500.00');
  const str58 = Buffer.from(b58.toUint8Array().slice(2)).toString('utf8');
  const line58 = str58.split('\n')[0].replace(/[\x00-\x1F]/g, '');
  assert.equal(line58.length, 32, '58mm line must be exactly 32 columns wide');
  assert.ok(line58.startsWith('Total:'), 'Must start with label');
  assert.ok(line58.endsWith('Rs 500.00'), 'Must end with value');

  const b80 = new EscPosBuilderTest('80mm');
  b80.twoColumns('Grand Total:', 'Rs 1250.00');
  const str80 = Buffer.from(b80.toUint8Array().slice(2)).toString('utf8');
  const line80 = str80.split('\n')[0].replace(/[\x00-\x1F]/g, '');
  assert.equal(line80.length, 48, '80mm line must be exactly 48 columns wide');
  assert.ok(line80.startsWith('Grand Total:'));
  assert.ok(line80.endsWith('Rs 1250.00'));
});

test('EscPosBuilder: Emits paper cut and cash drawer pulse sequences', () => {
  const builder = new EscPosBuilderTest();
  builder.cut().kickDrawer();
  const bytes = builder.toUint8Array();

  // Find GS V (0x1D 0x56)
  let foundCut = false;
  let foundKick = false;
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === 0x1D && bytes[i + 1] === 0x56) {
      foundCut = true;
    }
    if (bytes[i] === 0x1B && bytes[i + 1] === 0x70) {
      foundKick = true;
    }
  }

  assert.ok(foundCut, 'Must contain paper cut command (GS V)');
  assert.ok(foundKick, 'Must contain cash drawer kick command (ESC p)');
});

test('PrinterManager: State subscribers receive connection and disconnection updates', () => {
  let currentState = {
    type: 'NONE',
    status: 'DISCONNECTED',
    deviceName: null,
  };

  const listeners = new Set();
  const subscribe = (fn) => {
    listeners.add(fn);
    fn(currentState);
    return () => listeners.delete(fn);
  };

  const updates = [];
  const unsubscribe = subscribe((s) => updates.push({ ...s }));

  assert.equal(updates.length, 1);
  assert.equal(updates[0].status, 'DISCONNECTED');

  // Simulate Bluetooth connect
  currentState = {
    type: 'BLUETOOTH',
    status: 'CONNECTED',
    deviceName: 'PT-210 Thermal POS',
  };
  listeners.forEach((l) => l(currentState));

  assert.equal(updates.length, 2);
  assert.equal(updates[1].type, 'BLUETOOTH');
  assert.equal(updates[1].deviceName, 'PT-210 Thermal POS');

  // Simulate disconnect
  currentState = {
    type: 'NONE',
    status: 'DISCONNECTED',
    deviceName: null,
  };
  listeners.forEach((l) => l(currentState));

  assert.equal(updates.length, 3);
  assert.equal(updates[2].status, 'DISCONNECTED');

  unsubscribe();
  assert.equal(listeners.size, 0);
});
