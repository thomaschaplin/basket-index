// All money values are integer pence.

export interface PackSize {
  label: string;
  count: number;
  /** Total amount in base units: grams, millilitres, or items. */
  amount: number;
  unit: 'g' | 'ml' | 'each';
}

export interface ReceiptItem {
  qty: number;
  name: string;
  unitPrice: number;
  saving: number;
  lineTotal: number;
  /** Loose produce: unitPrice is per kg and lineTotal is the weighed price. */
  weighed: boolean;
  size: PackSize | null;
  family: string;
}

export interface Receipt {
  orderId: string | null;
  date: string | null; // ISO yyyy-mm-dd
  channel: string | null;
  subtotal: number;
  reportedSavings: number;
  delivery: number;
  coupons: number;
  total: number;
  points: number;
  items: ReceiptItem[];
  itemsTotal: number;
  computedSavings: number;
  basketDiscount?: { amount: number; pct: number };
  warnings: string[];
}
