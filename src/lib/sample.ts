// Eight real Tesco receipts with personal details and order IDs redacted (see scripts/extract-fixtures.ts).
import { parseReceiptText } from './parser';
import type { Receipt } from './types';

const texts = import.meta.glob('./__fixtures__/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const loadSample = (): Receipt[] => Object.values(texts).map(parseReceiptText);
