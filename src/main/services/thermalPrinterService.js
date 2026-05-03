const { BrowserWindow } = require('electron');
const usb = require('usb');

let thermalPrinterModule = null;
try {
  thermalPrinterModule = require('node-thermal-printer');
} catch (_) {
  thermalPrinterModule = null;
}

const ThermalPrinter = thermalPrinterModule?.ThermalPrinter || thermalPrinterModule?.printer || null;
const PrinterTypes = thermalPrinterModule?.PrinterTypes || thermalPrinterModule?.types || null;
const CharacterSet = thermalPrinterModule?.CharacterSet || thermalPrinterModule?.characterSet || null;
const BreakLine = thermalPrinterModule?.BreakLine || thermalPrinterModule?.breakLine || null;

const DEFAULT_PRINTER_CONFIG = {
  vendorId: '0x0525',
  productId: '0xA700',
  printerType: 'EPSON',
  paperWidth: 48,
  characterSet: 'PC437_USA',
  lineCharacter: '-',
  breakLine: 'WORD',
};

const DEFAULT_BILL_TEMPLATE = {
  title: '',
  subtitle: '',
  contactLine: '',
  footer: 'Thank you! Visit us again.',
  tokenPrefix: 'TOKEN',
  showTable: false,
  tablePrefix: 'Table',
  showCashier: false,
  cashierPrefix: 'Cashier',
  itemHeader: 'ITEM',
  qtyHeader: 'QTY',
  priceHeader: 'AMOUNT',
  totalText: 'TOTAL: Rs.',
  itemNameWidth: 24,
  itemQtyWidth: 8,
  itemPriceWidth: 12,
  showItemNumbers: false,
  itemNumberPrefix: '#',
  itemAlign: 'left',
  qtyAlign: 'right',
  priceAlign: 'right',
  headerBold: true,
  headerAlign: 'left',
  totalBold: true,
  totalAlign: 'right',
  lineChar: '-',
  bodyTemplate: [
    '[center][bold]{{title}}',
    '[center]{{subtitle}}',
    '[center]{{contactLine}}',
    '[blank:1]',
    '[center][bold]{{tokenPrefix}}: {{token}}',
    '[left]Date: {{dateTime}}',
    '[left]Bill #: {{billNo}}',
    '[line]',
    '{{itemHeaderRow}}',
    '{{items}}',
    '[line]',
    '{{totalLine}}',
    '[blank:1]',
    '[center]Please retain bill for returns.',
    '[center]{{footer}}',
    '[cut]',
  ].join('\n'),
  itemLineTemplate: '{{namePad}}{{qtyPad}}{{amountPad}}',
  itemHeaderLineTemplate: '{{itemHeaderPad}}{{qtyHeaderPad}}{{priceHeaderPad}}',
  totalLineTemplate: '{{totalText}} {{total}}',
};

const DEFAULT_KOT_TEMPLATE = {
  kotTitle: 'KITCHEN ORDER',
  kotFooter: 'Thank you!',
  kotItemHeader: 'ITEM',
  kotQtyHeader: 'QTY',
  kotItemWidth: 30,
  kotQtyWidth: 8,
  kotBodyTemplate: [
    '[center][bold]TOKEN: {{token}}',
    '[left]Time: {{time}}',
    '[line]',
    '[bold]{{kotItemHeaderRow}}',
    '{{kotItems}}',
    '[line]',
    '[right][bold]{{kotTotalLine}}',
    '[center]{{kotFooter}}',
    '[cut]',
  ].join('\n'),
  kotItemLineTemplate: '{{namePad}}{{qtyPad}}',
  kotItemHeaderLineTemplate: '[bold]{{kotItemHeaderPad}}{{kotQtyHeaderPad}}',
  kotTotalLineTemplate: 'Total: Rs. {{total}}',
};

function safeString(value, fallback = '') {
  if (value == null) {
    return fallback;
  }
  return String(value);
}

function cleanText(value, fallback = '') {
  return safeString(value, fallback).replace(/[\r\t]+/g, ' ');
}

function cleanSingleChar(value, fallback = '-') {
  const text = safeString(value, fallback).trim();
  return text ? text[0] : fallback;
}

function normalizeHexId(value) {
  const text = safeString(value, '').trim();
  if (!text) {
    return '';
  }
  if (/^0x[0-9a-fA-F]{1,4}$/.test(text)) {
    const normalized = Number.parseInt(text, 16);
    return `0x${normalized.toString(16).padStart(4, '0').toUpperCase()}`;
  }
  if (/^[0-9]{1,5}$/.test(text)) {
    const normalized = Number.parseInt(text, 10);
    return `0x${normalized.toString(16).padStart(4, '0').toUpperCase()}`;
  }
  return '';
}

function normalizePaperWidth(value) {
  const numeric = Number(value);
  if (numeric === 32 || numeric === 48) {
    return numeric;
  }
  if (numeric === 58) {
    return 32;
  }
  if (numeric === 80) {
    return 48;
  }
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric <= 40 ? 32 : 48;
  }
  return 48;
}

function normalizePrinterType(value) {
  const text = safeString(value, 'EPSON').trim().toUpperCase();
  if (text === 'STAR' || text === 'EPSON') {
    return text;
  }
  return 'EPSON';
}

function normalizeBreakLine(value) {
  const text = safeString(value, 'WORD').trim().toUpperCase();
  if (text === 'NONE' || text === 'CHARACTER') {
    return text;
  }
  return 'WORD';
}

function normalizeCharacterSet(value) {
  return safeString(value, 'PC437_USA').trim() || 'PC437_USA';
}

function replacePlaceholders(text, context) {
  return safeString(text, '').replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => {
    const replacement = context[key];
    return replacement == null ? '' : String(replacement);
  });
}

function splitLines(value) {
  return safeString(value, '').split(/\r?\n/);
}

function padCell(text, width, align) {
  const value = safeString(text, '');
  const truncated = value.length >= width ? value.slice(0, width) : value;
  if (align === 'center') {
    const left = Math.floor((width - truncated.length) / 2);
    return ' '.repeat(Math.max(0, left)) + truncated + ' '.repeat(Math.max(0, width - truncated.length - left));
  }
  if (align === 'right') return truncated.padStart(width);
  return truncated.padEnd(width);
}

class ThermalPrintService {
  constructor() {
    this.store = null;
    this.fileManager = null;
    this.getAppSetupRow = null;
    this.isPrinting = false;
    this.lastError = '';
    this.lastReceipt = null;
    this.lastJobAt = null;
    this.activeConfig = null;
  }

  configure({ store, fileManager, getAppSetupRow }) {
    this.store = store;
    this.fileManager = fileManager;
    this.getAppSetupRow = getAppSetupRow;
  }

  getStoredConfig() {
    const stored = this.store?.get('printerConfig', DEFAULT_PRINTER_CONFIG) || DEFAULT_PRINTER_CONFIG;
    return this.normalizeConfig(stored);
  }

  normalizeConfig(config) {
    if (!config) {
      return null;
    }

    const vendorId = normalizeHexId(config.vendorId ?? DEFAULT_PRINTER_CONFIG.vendorId);
    const productId = normalizeHexId(config.productId ?? DEFAULT_PRINTER_CONFIG.productId);

    if (!vendorId || !productId) {
      return null;
    }

    const normalized = {
      vendorId,
      productId,
      vendorIdDec: Number.parseInt(vendorId, 16),
      productIdDec: Number.parseInt(productId, 16),
      printerType: normalizePrinterType(config.printerType ?? config.type),
      paperWidth: normalizePaperWidth(config.paperWidth ?? config.width ?? config.paperSize),
      characterSet: normalizeCharacterSet(config.characterSet),
      lineCharacter: cleanSingleChar(config.lineCharacter, DEFAULT_PRINTER_CONFIG.lineCharacter),
      breakLine: normalizeBreakLine(config.breakLine),
    };

    return normalized;
  }

  async loadTemplate(defaults) {
    try {
      const fallback = { ...DEFAULT_BILL_TEMPLATE, ...DEFAULT_KOT_TEMPLATE, ...(defaults || {}) };
      let tenantName = fallback.title || 'ViperCore';
      let tenantLocation = fallback.subtitle || '';

      if (this.getAppSetupRow) {
        try {
          const setupRow = await this.getAppSetupRow();
          if (setupRow?.tenant_name) tenantName = setupRow.tenant_name;
          if (setupRow?.tenant_location) tenantLocation = setupRow.tenant_location;
        } catch (_) {
          // Ignore lookup errors.
        }
      }

      const dynamicDefaults = {
        ...fallback,
        title: fallback.title || tenantName,
        subtitle: fallback.subtitle || tenantLocation,
      };

      if (!this.fileManager) {
        return dynamicDefaults;
      }

      const raw = this.fileManager.readFromUserData('receiptFormat.json');
      if (!raw) {
        return dynamicDefaults;
      }

      const parsed = JSON.parse(raw);
      return { ...dynamicDefaults, ...parsed };
    } catch (_) {
      return { ...DEFAULT_BILL_TEMPLATE, ...DEFAULT_KOT_TEMPLATE, ...(defaults || {}) };
    }
  }

  sanitizeOrderPayload(order = {}) {
    const sourceItems = Array.isArray(order.items)
      ? order.items
      : (Array.isArray(order.billItems) ? order.billItems : []);

    const items = sourceItems
      .map((item) => {
        const quantity = Math.max(1, Math.floor(Number(item?.qty ?? item?.quantity ?? 1) || 1));
        const unitPrice = Number(item?.price ?? 0);
        const amount = Number.isFinite(unitPrice) ? unitPrice * quantity : 0;
        return {
          name: cleanText(item?.name || item?.foodName || item?.fname || 'Item', '').trim(),
          quantity,
          unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
          amount,
        };
      })
      .filter((item) => item.name);

    const totalFromItems = items.reduce((sum, item) => sum + item.amount, 0);

    return {
      title: cleanText(order.title || '', '').trim(),
      subtitle: cleanText(order.subtitle || '', '').trim(),
      contactLine: cleanText(order.contactLine || '', '').trim(),
      footer: cleanText(order.footer || '', '').trim(),
      token: cleanText(order.kot || order.token || '-', '').trim(),
      billNo: cleanText(order.orderId || order.billNo || '-', '').trim(),
      dateTime: cleanText(order.dateTime || new Date().toLocaleString('en-IN'), '').trim(),
      time: cleanText(order.time || new Date().toLocaleTimeString('en-IN'), '').trim(),
      tableLabel: cleanText(order.tableLabel || '', '').trim(),
      cashierName: cleanText(order.cashierName || '', '').trim(),
      items,
      total: Number.isFinite(Number(order.totalAmount)) ? Number(order.totalAmount) : totalFromItems,
    };
  }

  buildLayout(template, data) {
    const paperWidth = normalizePaperWidth(template.paperWidth || DEFAULT_PRINTER_CONFIG.paperWidth);
    const itemNameWidth = Number(template.itemNameWidth || (paperWidth === 32 ? 16 : 24));
    const itemQtyWidth = Number(template.itemQtyWidth || (paperWidth === 32 ? 4 : 8));
    const itemPriceWidth = Number(template.itemPriceWidth || 12);
    const kotItemWidth = Number(template.kotItemWidth || (paperWidth === 32 ? 20 : 30));
    const kotQtyWidth = Number(template.kotQtyWidth || 8);
    const itemAlign = template.itemAlign || 'left';
    const qtyAlign = template.qtyAlign || 'right';
    const priceAlign = template.priceAlign || 'right';
    const headerBold = template.headerBold !== false;
    const headerAlign = template.headerAlign || 'left';
    const lineChar = (template.lineChar || '-')[0] || '-';

    const itemHeader = cleanText(template.itemHeader || 'ITEM', '').trim();
    const qtyHeader = cleanText(template.qtyHeader || 'QTY', '').trim();
    const priceHeader = cleanText(template.priceHeader || 'AMOUNT', '').trim();

    const base = {
      ...data,
      title: cleanText(template.title || data.title || '', '').trim(),
      subtitle: cleanText(template.subtitle || data.subtitle || '', '').trim(),
      contactLine: cleanText(template.contactLine || data.contactLine || '', '').trim(),
      footer: cleanText(template.footer || data.footer || '', '').trim(),
      tokenPrefix: cleanText(template.tokenPrefix || 'TOKEN', '').trim(),
      tablePrefix: cleanText(template.tablePrefix || 'Table', '').trim(),
      cashierPrefix: cleanText(template.cashierPrefix || 'Cashier', '').trim(),
      tableLabel: template.showTable === true ? cleanText(data.tableLabel || '', '').trim() : '',
      cashierName: template.showCashier === true ? cleanText(data.cashierName || '', '').trim() : '',
      itemHeader,
      qtyHeader,
      priceHeader,
      totalText: cleanText(template.totalText || 'TOTAL: Rs.', '').trim(),
      kotTitle: cleanText(template.kotTitle || 'KITCHEN ORDER', '').trim(),
      kotFooter: cleanText(template.kotFooter || '', '').trim(),
      kotItemHeader: cleanText(template.kotItemHeader || 'ITEM', '').trim(),
      kotQtyHeader: cleanText(template.kotQtyHeader || 'QTY', '').trim(),
      itemHeaderRow: headerBold
        ? (padCell(itemHeader, itemNameWidth, headerAlign) + padCell(qtyHeader, itemQtyWidth, qtyAlign) + padCell(priceHeader, itemPriceWidth, priceAlign)).toUpperCase()
        : padCell(itemHeader, itemNameWidth, headerAlign) + padCell(qtyHeader, itemQtyWidth, qtyAlign) + padCell(priceHeader, itemPriceWidth, priceAlign),
      totalLine: replacePlaceholders(template.totalLineTemplate || '{{totalText}} {{total}}', {
        totalText: cleanText(template.totalText || 'TOTAL: Rs.', '').trim(),
        total: Number(data.total || 0).toFixed(2),
      }),
      kotItemHeaderRow: `${cleanText(template.kotItemHeader || 'ITEM', '').trim().padEnd(kotItemWidth)}${cleanText(template.kotQtyHeader || 'QTY', '').trim().padStart(kotQtyWidth)}`,
      kotTotalLine: `Total: Rs. ${Number(data.total || 0).toFixed(2)}`,
      itemHeaderPad: padCell(itemHeader, itemNameWidth, headerAlign),
      qtyHeaderPad: padCell(qtyHeader, itemQtyWidth, qtyAlign),
      priceHeaderPad: padCell(priceHeader, itemPriceWidth, priceAlign),
      kotItemHeaderPad: cleanText(template.kotItemHeader || 'ITEM', '').trim().padEnd(kotItemWidth),
      kotQtyHeaderPad: cleanText(template.kotQtyHeader || 'QTY', '').trim().padStart(kotQtyWidth),
      lineChar,
      showItemNumbers: template.showItemNumbers === true,
      itemNumberPrefix: template.itemNumberPrefix || '#',
      paperWidth,
      itemNameWidth,
      itemQtyWidth,
      itemPriceWidth,
      itemAlign,
      qtyAlign,
      priceAlign,
      kotItemWidth,
      kotQtyWidth,
    };

    const itemLineTemplate = template.itemLineTemplate || DEFAULT_BILL_TEMPLATE.itemLineTemplate;
    const kotItemLineTemplate = template.kotItemLineTemplate || DEFAULT_KOT_TEMPLATE.kotItemLineTemplate;
    const rawHeaderLineTemplate = template.itemHeaderLineTemplate || DEFAULT_BILL_TEMPLATE.itemHeaderLineTemplate;
    const rawTotalLineTemplate = template.totalLineTemplate || DEFAULT_BILL_TEMPLATE.totalLineTemplate;

    return {
      ...base,
      itemLineTemplate,
      kotItemLineTemplate,
      itemHeaderLineTemplate: headerBold && !rawHeaderLineTemplate.startsWith('[bold]') ? `[bold]${rawHeaderLineTemplate}` : rawHeaderLineTemplate,
      kotItemHeaderLineTemplate: template.kotItemHeaderLineTemplate || DEFAULT_KOT_TEMPLATE.kotItemHeaderLineTemplate,
      totalLineTemplate: rawTotalLineTemplate,
      totalAlign: template.totalAlign || 'right',
      totalBold: template.totalBold !== false,
    };
  }

  async listPrinters() {
    try {
      const printers = usb.getDeviceList().map((device, index) => ({
        id: `${device.deviceDescriptor.idVendor}:${device.deviceDescriptor.idProduct}:${index}`,
        vendorId: `0x${Number(device.deviceDescriptor.idVendor).toString(16).padStart(4, '0').toUpperCase()}`,
        productId: `0x${Number(device.deviceDescriptor.idProduct).toString(16).padStart(4, '0').toUpperCase()}`,
        vendorIdDec: Number(device.deviceDescriptor.idVendor),
        productIdDec: Number(device.deviceDescriptor.idProduct),
      })).filter((printer) => printer.vendorId && printer.productId);

      return { success: true, printers };
    } catch (error) {
      this.lastError = error.message;
      return { success: false, error: error.message, printers: [] };
    }
  }

  findDevice(config) {
    const normalized = this.normalizeConfig(config || this.getStoredConfig());
    if (!normalized) {
      return { normalized: null, device: null };
    }

    const vendorId = Number.parseInt(normalized.vendorId, 16);
    const productId = Number.parseInt(normalized.productId, 16);
    const device = usb.findByIds(vendorId, productId);
    return { normalized, device };
  }

  async init(config) {
    const { normalized, device } = this.findDevice(config);
    this.activeConfig = normalized;

    if (!normalized) {
      return { success: false, error: 'Printer configuration is missing or invalid.' };
    }

    if (!device) {
      return { success: false, error: `Printer not found: ${normalized.vendorId} / ${normalized.productId}`, config: normalized };
    }

    return { success: true, config: normalized };
  }

  async getStatus() {
    const config = this.getStoredConfig() || DEFAULT_PRINTER_CONFIG;
    const { device } = this.findDevice(config);

    return {
      connected: Boolean(device),
      busy: this.isPrinting,
      hasLastReceipt: Boolean(this.lastReceipt),
      lastJobAt: this.lastJobAt,
      lastError: this.lastError,
      printerName: `${config.vendorId} / ${config.productId}`,
      paperWidth: config.paperWidth,
      printerType: config.printerType,
    };
  }

  makeThermalPrinter(config) {
    if (!ThermalPrinter) {
      throw new Error('node-thermal-printer is not installed. Run npm install first.');
    }

    const normalized = this.getPrinterDefaults(config);
    const resolvedType = (PrinterTypes && (PrinterTypes[normalized.printerType] || PrinterTypes.EPSON)) || normalized.printerType || 'EPSON';
    const resolvedCharset = (CharacterSet && (CharacterSet[normalized.characterSet] || CharacterSet.PC437_USA)) || normalized.characterSet || 'PC437_USA';
    const resolvedBreakLine = (BreakLine && (BreakLine[normalized.breakLine] || BreakLine.WORD)) || normalized.breakLine || 'WORD';

    return new ThermalPrinter({
      type: resolvedType,
      width: normalized.paperWidth,
      interface: {},
      characterSet: resolvedCharset,
      removeSpecialCharacters: false,
      lineCharacter: normalized.lineCharacter,
      breakLine: resolvedBreakLine,
      options: { timeout: 5000 },
    });
  }

  getPrinterDefaults(config = null) {
    const normalized = this.normalizeConfig(config || this.getStoredConfig());
    return normalized || { ...DEFAULT_PRINTER_CONFIG };
  }

  resetLineStyle(printer) {
    if (typeof printer.alignLeft === 'function') {
      printer.alignLeft();
    }
    if (typeof printer.bold === 'function') {
      printer.bold(false);
    }
    if (typeof printer.underline === 'function') {
      printer.underline(false);
    }
    if (typeof printer.underlineThick === 'function') {
      printer.underlineThick(false);
    }
    if (typeof printer.invert === 'function') {
      printer.invert(false);
    }
    if (typeof printer.upsideDown === 'function') {
      printer.upsideDown(false);
    }
    if (typeof printer.setTypeFontA === 'function') {
      printer.setTypeFontA();
    }
    if (typeof printer.setTextNormal === 'function') {
      printer.setTextNormal();
    }
  }

  setAlign(printer, align) {
    if (align === 'center' && typeof printer.alignCenter === 'function') {
      printer.alignCenter();
    } else if (align === 'right' && typeof printer.alignRight === 'function') {
      printer.alignRight();
    } else if (typeof printer.alignLeft === 'function') {
      printer.alignLeft();
    }
  }

  setSize(printer, size) {
    if (size === 'double' && typeof printer.setTextQuadArea === 'function') {
      printer.setTextQuadArea();
    } else if (size === 'wide' && typeof printer.setTextDoubleWidth === 'function') {
      printer.setTextDoubleWidth();
    } else if (size === 'tall' && typeof printer.setTextDoubleHeight === 'function') {
      printer.setTextDoubleHeight();
    } else if (typeof size === 'string' && /^\dx\d$/.test(size) && typeof printer.setTextSize === 'function') {
      const [h, w] = size.split('x').map(Number);
      printer.setTextSize(h, w);
    } else if (typeof printer.setTextNormal === 'function') {
      printer.setTextNormal();
    }
  }

  printBlankLines(printer, count) {
    const lines = Math.max(1, Number(count) || 1);
    for (let index = 0; index < lines; index += 1) {
      if (typeof printer.newLine === 'function') {
        printer.newLine();
      } else if (typeof printer.println === 'function') {
        printer.println('');
      }
    }
  }

  parseLeadingTags(rawLine) {
    const state = { align: 'left', bold: false, underline: false, underlineThick: false, invert: false, upsideDown: false, size: 'normal', font: 'a' };
    let working = rawLine;
    while (working.trimStart().startsWith('[')) {
      const tagMatch = working.trimStart().match(/^\[([^\]]+)\]\s*/);
      if (!tagMatch) break;
      const tag = tagMatch[1].trim().toLowerCase();
      if (tag === 'center' || tag === 'left' || tag === 'right') {
        state.align = tag;
        working = working.trimStart().slice(tagMatch[0].length);
        continue;
      }
      if (tag === 'bold') { state.bold = true; working = working.trimStart().slice(tagMatch[0].length); continue; }
      if (tag === '/bold') { state.bold = false; working = working.trimStart().slice(tagMatch[0].length); continue; }
      if (tag === 'underline' || tag === 'u') { state.underline = true; working = working.trimStart().slice(tagMatch[0].length); continue; }
      if (tag === '/underline' || tag === '/u') { state.underline = false; working = working.trimStart().slice(tagMatch[0].length); continue; }
      if (tag === 'underline:thick' || tag === 'u:thick') { state.underlineThick = true; working = working.trimStart().slice(tagMatch[0].length); continue; }
      if (tag === 'invert') { state.invert = true; working = working.trimStart().slice(tagMatch[0].length); continue; }
      if (tag === '/invert') { state.invert = false; working = working.trimStart().slice(tagMatch[0].length); continue; }
      if (tag === 'upsidedown') { state.upsideDown = true; working = working.trimStart().slice(tagMatch[0].length); continue; }
      if (tag === '/upsidedown') { state.upsideDown = false; working = working.trimStart().slice(tagMatch[0].length); continue; }
      if (tag === 'double' || tag === 'size:double') { state.size = 'double'; working = working.trimStart().slice(tagMatch[0].length); continue; }
      if (tag === 'wide' || tag === 'size:wide') { state.size = 'wide'; working = working.trimStart().slice(tagMatch[0].length); continue; }
      if (tag === 'tall' || tag === 'size:tall') { state.size = 'tall'; working = working.trimStart().slice(tagMatch[0].length); continue; }
      if (tag === 'normal' || tag === 'size:normal') { state.size = 'normal'; working = working.trimStart().slice(tagMatch[0].length); continue; }
      const sizeMatch = tag.match(/^size:(\d)x(\d)$/);
      if (sizeMatch) { state.size = `${sizeMatch[1]}x${sizeMatch[2]}`; working = working.trimStart().slice(tagMatch[0].length); continue; }
      if (tag === 'font:a' || tag === 'fonta') { state.font = 'a'; working = working.trimStart().slice(tagMatch[0].length); continue; }
      if (tag === 'font:b' || tag === 'fontb') { state.font = 'b'; working = working.trimStart().slice(tagMatch[0].length); continue; }
      break;
    }
    return { state, text: working };
  }

  renderTextLine(printer, rawLine, context) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      this.printBlankLines(printer, 1);
      return;
    }

    if (/^\[blank(?::\d+)?\]$/i.test(trimmed)) {
      const match = trimmed.match(/^\[blank(?::(\d+))?\]$/i);
      this.printBlankLines(printer, Number(match?.[1] || 1));
      return;
    }

    const parsed = this.parseLeadingTags(rawLine);
    const afterTags = parsed.text.trim();

    if (/^\[line(?::([^\]]+))?\]$/i.test(afterTags)) {
      if (typeof printer.drawLine === 'function') {
        printer.drawLine();
      } else if (typeof printer.println === 'function') {
        const match = afterTags.match(/^\[line(?::([^\]]+))?\]$/i);
        const char = match?.[1]?.[0] || context.lineChar || '-';
        printer.println(char.repeat(context.paperWidth || 48));
      }
      return;
    }

    if (/^\[cut\]$/i.test(afterTags)) {
      if (typeof printer.cut === 'function') {
        printer.cut();
      }
      return;
    }

    const { state } = parsed;
    const rendered = replacePlaceholders(afterTags, context);
    if (!rendered.trim()) return;
    this.setAlign(printer, state.align);
    if (typeof printer.bold === 'function') {
      printer.bold(Boolean(state.bold));
    }
    if (typeof printer.underline === 'function' && state.underline) {
      printer.underline(true);
    }
    if (typeof printer.underlineThick === 'function' && state.underlineThick) {
      printer.underlineThick(true);
    }
    if (typeof printer.invert === 'function') {
      printer.invert(Boolean(state.invert));
    }
    if (typeof printer.upsideDown === 'function') {
      printer.upsideDown(Boolean(state.upsideDown));
    }
    if (state.font === 'b' && typeof printer.setTypeFontB === 'function') {
      printer.setTypeFontB();
    } else if (typeof printer.setTypeFontA === 'function') {
      printer.setTypeFontA();
    }
    this.setSize(printer, state.size);

    if (typeof printer.println === 'function') {
      printer.println(rendered);
    } else if (typeof printer.text === 'function') {
      printer.text(rendered);
    }

    this.resetLineStyle(printer);
  }

  renderItems(printer, template, context) {
    const itemTemplate = template.itemLineTemplate || DEFAULT_BILL_TEMPLATE.itemLineTemplate;
    const itemAlign = context.itemAlign || 'left';
    const qtyAlign = context.qtyAlign || 'right';
    const priceAlign = context.priceAlign || 'right';
    const showItemNumbers = template.showItemNumbers === true;
    const itemNumberPrefix = template.itemNumberPrefix || '#';

    context.items.forEach((item, index) => {
      const nameDisplay = showItemNumbers ? `${itemNumberPrefix}${index + 1} ${item.name}` : item.name;
      const rendered = replacePlaceholders(itemTemplate, {
        ...context,
        index: index + 1,
        name: item.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice || 0).toFixed(2),
        amount: Number(item.amount || 0).toFixed(2),
        namePad: padCell(nameDisplay.slice(0, context.itemNameWidth), context.itemNameWidth, itemAlign),
        qtyPad: padCell(String(item.quantity), context.itemQtyWidth, qtyAlign),
        amountPad: padCell(Number(item.amount || 0).toFixed(2), context.itemPriceWidth, priceAlign),
        pricePad: padCell(Number(item.amount || 0).toFixed(2), context.itemPriceWidth, priceAlign),
      });
      this.renderTextLine(printer, rendered, context);
    });
  }

  renderKotItems(printer, template, context) {
    const itemTemplate = template.kotItemLineTemplate || DEFAULT_KOT_TEMPLATE.kotItemLineTemplate;
    context.items.forEach((item, index) => {
      const rendered = replacePlaceholders(itemTemplate, {
        ...context,
        index: index + 1,
        name: item.name,
        quantity: item.quantity,
        namePad: item.name.slice(0, context.kotItemWidth).padEnd(context.kotItemWidth),
        qtyPad: String(item.quantity).padStart(context.kotQtyWidth),
      });
      this.renderTextLine(printer, rendered, context);
    });
  }

  async writeBufferToUsb(config, buffer) {
    const { normalized, device } = this.findDevice(config);
    if (!normalized || !device) {
      throw new Error(`Printer not found: ${normalized ? `${normalized.vendorId} / ${normalized.productId}` : 'unknown printer'}`);
    }

    const openIfNeeded = () => {
      if (!device.interfaces || device.interfaces.length === 0) {
        throw new Error('Printer interface not available on the USB device.');
      }
      device.open();
    };

    const findOutEndpoint = () => {
      for (const iface of device.interfaces) {
        if (typeof iface.isKernelDriverActive === 'function') {
          try {
            if (iface.isKernelDriverActive()) {
              iface.detachKernelDriver();
            }
          } catch (_) {
            // Ignore detach errors on platforms that do not support it.
          }
        }
        try {
          iface.claim();
        } catch (_) {
          continue;
        }
        const endpoint = iface.endpoints.find((ep) => ep.direction === 'out');
        if (endpoint) {
          return { iface, endpoint };
        }
        try {
          iface.release(true, () => {});
        } catch (_) {
          // Ignore release errors while searching.
        }
      }
      return null;
    };

    openIfNeeded();
    let iface = null;
    try {
      const found = findOutEndpoint();
      if (!found) {
        throw new Error('Printer output endpoint not found.');
      }
      iface = found.iface;
      await new Promise((resolve, reject) => {
        found.endpoint.transfer(buffer, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    } finally {
      if (iface) {
        try {
          await new Promise((resolve) => {
            iface.release(true, () => resolve());
          });
        } catch (_) {
          // Ignore release errors.
        }
      }
      try {
        device.close();
      } catch (_) {
        // Ignore close errors.
      }
    }
  }

  async executeJob(config, render) {
    if (this.isPrinting) {
      return { success: false, error: 'Printer busy' };
    }

    this.isPrinting = true;
    try {
      const printer = this.makeThermalPrinter(config);
      await render(printer);
      const buffer = printer.getBuffer();
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new Error('Print buffer is empty.');
      }
      await this.writeBufferToUsb(config, buffer);
      this.lastJobAt = new Date().toISOString();
      this.lastError = '';
      return { success: true };
    } catch (error) {
      this.lastError = error.message;
      return { success: false, error: error.message };
    } finally {
      this.isPrinting = false;
    }
  }

  async printBill(order, configOverride = null) {
    const config = this.getPrinterDefaults(configOverride || this.getStoredConfig());
    const template = await this.loadTemplate(DEFAULT_BILL_TEMPLATE);
    const data = this.sanitizeOrderPayload(order);
    const context = this.buildLayout(template, data);

    const result = await this.executeJob(config, async (printer) => {
      const bodyTemplate = template.bodyTemplate || DEFAULT_BILL_TEMPLATE.bodyTemplate;
      const totalAlign = template.totalAlign || 'right';
      const totalBold = template.totalBold !== false;
      const lines = splitLines(bodyTemplate);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (/^\[blank(?::\d+)?\]$/i.test(trimmed)) {
          this.renderTextLine(printer, line, context);
          continue;
        }

        const parsed = this.parseLeadingTags(line);
        const afterTags = parsed.text.trim();

        if (afterTags === '{{items}}') {
          this.renderItems(printer, context, context);
          continue;
        }
        if (afterTags === '{{totalLine}}') {
          const rendered = replacePlaceholders('{{totalLine}}', context);
          if (rendered.trim()) {
            this.setAlign(printer, totalAlign);
            if ((totalBold || parsed.state.bold) && typeof printer.bold === 'function') printer.bold(true);
            const display = (totalBold || parsed.state.bold) ? rendered.toUpperCase() : rendered;
            if (typeof printer.println === 'function') {
              printer.println(display);
            } else if (typeof printer.text === 'function') {
              printer.text(display);
            }
            this.resetLineStyle(printer);
          }
          continue;
        }
        this.renderTextLine(printer, line, context);
      }
      if (typeof printer.cut === 'function' && !bodyTemplate.includes('[cut]')) {
        printer.cut();
      }
    });

    if (result.success) {
      this.lastReceipt = { kind: 'bill', payload: order, config };
    }

    return result;
  }

  async printKot(order, configOverride = null) {
    const config = this.getPrinterDefaults(configOverride || this.getStoredConfig());
    const template = await this.loadTemplate(DEFAULT_KOT_TEMPLATE);
    const data = this.sanitizeOrderPayload(order);
    const context = this.buildLayout(template, data);

    const result = await this.executeJob(config, async (printer) => {
      const bodyTemplate = template.kotBodyTemplate || DEFAULT_KOT_TEMPLATE.kotBodyTemplate;
      const lines = splitLines(bodyTemplate);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (/^\[blank(?::\d+)?\]$/i.test(trimmed)) {
          this.renderTextLine(printer, line, context);
          continue;
        }

        const parsed = this.parseLeadingTags(line);
        const afterTags = parsed.text.trim();

        if (afterTags === '{{kotItems}}') {
          this.renderKotItems(printer, context, context);
          continue;
        }
        this.renderTextLine(printer, line, context);
      }
      if (typeof printer.cut === 'function' && !bodyTemplate.includes('[cut]')) {
        printer.cut();
      }
    });

    if (result.success) {
      this.lastReceipt = { kind: 'kot', payload: order, config };
    }

    return result;
  }

  async testPrint(configOverride = null) {
    const config = this.getPrinterDefaults(configOverride || this.getStoredConfig());
    return this.executeJob(config, async (printer) => {
      this.resetLineStyle(printer);
      this.setAlign(printer, 'center');
      if (typeof printer.bold === 'function') {
        printer.bold(true);
      }
      if (typeof printer.println === 'function') {
        printer.println('TEST PRINT');
        printer.println('Printer is working');
        printer.println(new Date().toLocaleString('en-IN'));
      }
      if (typeof printer.bold === 'function') {
        printer.bold(false);
      }
      if (typeof printer.cut === 'function') {
        printer.cut();
      }
    });
  }

  async safePrint(kind, payload, retries = 2, configOverride = null) {
    const maxRetries = Math.max(0, Number(retries) || 0);
    let attempt = 0;
    let lastResult = { success: false, error: 'Print not attempted' };

    while (attempt <= maxRetries) {
      if (kind === 'kot') {
        lastResult = await this.printKot(payload, configOverride);
      } else {
        lastResult = await this.printBill(payload, configOverride);
      }

      if (lastResult.success || lastResult.error === 'Printer busy') {
        return { ...lastResult, attempt: attempt + 1 };
      }

      attempt += 1;
    }

    return {
      success: false,
      error: `Failed after ${maxRetries + 1} attempts: ${lastResult.error || 'unknown error'}`,
      attempt: maxRetries + 1,
    };
  }

  async reprintLast(retries = 1) {
    if (!this.lastReceipt) {
      return { success: false, error: 'No receipt available to reprint.' };
    }

    return this.safePrint(this.lastReceipt.kind, this.lastReceipt.payload, retries, this.lastReceipt.config || null);
  }
}

module.exports = new ThermalPrintService();
