import {
  createElement,
  Type, Braces, Image, UserRound, Camera, Square, Circle, Triangle, Minus, Barcode, QrCode,
  Undo2, Redo2, Printer, Download, Upload, FolderOpen, Save, LayoutTemplate, ZoomIn, ZoomOut,
  Trash2, Copy, Lock, LockOpen, Eye, EyeOff, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Layers, Database, SlidersHorizontal, Bold, Italic, Underline, TextAlignStart, TextAlignCenter,
  TextAlignEnd, Globe, Plus, X, Check, Repeat, Crosshair, Info, Table, FileSpreadsheet, Images,
  ClipboardPaste, WandSparkles, IdCard, AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, BringToFront, SendToBack,
  RectangleHorizontal, RectangleVertical, FileDown, ShieldCheck, Ruler,
  ArrowRight, ArrowLeft, Shapes, Users, Sparkles, Search, CircleCheck, Zap, Palette, AArrowUp, AArrowDown,
  Pencil, RotateCcw, Tag, CloudOff,
} from 'lucide';

const ICONS = {
  'type': Type, 'braces': Braces, 'image': Image, 'user-round': UserRound, 'camera': Camera,
  'square': Square, 'circle': Circle, 'triangle': Triangle, 'minus': Minus, 'barcode': Barcode,
  'qr-code': QrCode, 'undo-2': Undo2, 'redo-2': Redo2, 'printer': Printer, 'download': Download,
  'upload': Upload, 'folder-open': FolderOpen, 'save': Save, 'layout-template': LayoutTemplate,
  'zoom-in': ZoomIn, 'zoom-out': ZoomOut, 'trash': Trash2, 'copy': Copy, 'lock': Lock,
  'lock-open': LockOpen, 'eye': Eye, 'eye-off': EyeOff, 'arrow-up': ArrowUp, 'arrow-down': ArrowDown,
  'chevron-left': ChevronLeft, 'chevron-right': ChevronRight, 'layers': Layers, 'database': Database,
  'sliders-horizontal': SlidersHorizontal, 'bold': Bold, 'italic': Italic, 'underline': Underline,
  'align-left': TextAlignStart, 'align-center': TextAlignCenter, 'align-right': TextAlignEnd,
  'globe': Globe, 'plus': Plus, 'x': X, 'check': Check, 'repeat': Repeat, 'crosshair': Crosshair,
  'info': Info, 'table': Table, 'file-spreadsheet': FileSpreadsheet, 'images': Images,
  'clipboard-paste': ClipboardPaste, 'wand': WandSparkles, 'id-card': IdCard,
  'al-left': AlignStartVertical, 'al-hcenter': AlignCenterVertical, 'al-right': AlignEndVertical,
  'al-top': AlignStartHorizontal, 'al-vcenter': AlignCenterHorizontal, 'al-bottom': AlignEndHorizontal,
  'bring-front': BringToFront, 'send-back': SendToBack, 'landscape': RectangleHorizontal,
  'portrait': RectangleVertical, 'file-down': FileDown, 'shield': ShieldCheck, 'ruler': Ruler,
  'arrow-right': ArrowRight, 'arrow-left': ArrowLeft, 'shapes': Shapes, 'users': Users, 'sparkles': Sparkles,
  'search': Search, 'check-circle': CircleCheck, 'zap': Zap, 'palette': Palette, 'font-up': AArrowUp,
  'font-down': AArrowDown, 'pencil': Pencil, 'rotate-ccw': RotateCcw, 'tag': Tag, 'offline': CloudOff,
};

export function icon(name, size = 18) {
  const node = ICONS[name];
  const el = createElement(node || Square, { width: size, height: size, 'aria-hidden': 'true' });
  el.classList.add('ic');
  return el;
}

export function paintIcons(root = document) {
  root.querySelectorAll('i[data-lucide]').forEach((i) => i.replaceWith(icon(i.dataset.lucide, Number(i.dataset.size) || 18)));
}
