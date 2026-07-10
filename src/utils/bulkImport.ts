import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/* ─── Column definitions ─── */
export const CATEGORY_COLUMNS = ['name', 'description'] as const;
export const SERVICE_COLUMNS  = ['label', 'icon_name'] as const;

export const PRODUCT_COLUMNS = [
  'name', 'description', 'price', 'stock', 'category_name',
  'colors', 'sizes', 'fabric', 'wear_type', 'trouser_type',
  'styling', 'product_category', 'dupatta_fabric', 'trouser_fabric',
] as const;

export type CategoryRow = { name: string; description: string };
export type ProductRow = {
  name: string; description: string; price: string; stock: string;
  category_name: string; colors: string; sizes: string; fabric: string;
  wear_type: string; trouser_type: string; styling: string;
  product_category: string; dupatta_fabric: string; trouser_fabric: string;
};

export type ParsedRow = Record<string, string>;

/* ─── Parse CSV or Excel file → array of row objects ─── */
export function parseFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse<ParsedRow>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
        transform: (v) => v.trim(),
        complete: (res) => resolve(res.data),
        error: (err) => reject(new Error(err.message)),
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (raw.length < 2) { resolve([]); return; }
          const headers: string[] = (raw[0] as string[]).map((h) =>
            String(h).trim().toLowerCase().replace(/\s+/g, '_')
          );
          const rows: ParsedRow[] = raw.slice(1).map((row: any[]) => {
            const obj: ParsedRow = {};
            headers.forEach((h, i) => { obj[h] = String(row[i] ?? '').trim(); });
            return obj;
          }).filter((r) => Object.values(r).some((v) => v !== ''));
          resolve(rows);
        } catch (err: any) {
          reject(new Error(err.message || 'Failed to parse Excel file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('Unsupported file type. Please upload .csv, .xlsx, or .xls'));
    }
  });
}

/* ─── Validate rows ─── */
export interface RowError { row: number; field: string; message: string }

export function validateCategoryRows(rows: ParsedRow[]): RowError[] {
  const errors: RowError[] = [];
  rows.forEach((row, i) => {
    const n = (row.name || '').trim();
    if (!n) errors.push({ row: i + 2, field: 'name', message: 'Name is required' });
    else if (n.length < 2) errors.push({ row: i + 2, field: 'name', message: 'Name too short (min 2)' });
    else if (n.length > 50) errors.push({ row: i + 2, field: 'name', message: 'Name too long (max 50)' });
    if ((row.description || '').length > 300)
      errors.push({ row: i + 2, field: 'description', message: 'Description too long (max 300)' });
  });
  return errors;
}

export function validateProductRows(rows: ParsedRow[]): RowError[] {
  const errors: RowError[] = [];
  rows.forEach((row, i) => {
    const n = (row.name || '').trim();
    if (!n) errors.push({ row: i + 2, field: 'name', message: 'Name is required' });
    else if (n.length < 3) errors.push({ row: i + 2, field: 'name', message: 'Name too short (min 3)' });
    else if (n.length > 100) errors.push({ row: i + 2, field: 'name', message: 'Name too long (max 100)' });

    const price = parseFloat(row.price || '');
    if (isNaN(price) || price <= 0)
      errors.push({ row: i + 2, field: 'price', message: 'Price must be a positive number' });
    else if (price > 9999999)
      errors.push({ row: i + 2, field: 'price', message: 'Price too large (max 9,999,999)' });

    const stock = parseInt(row.stock || '');
    if (isNaN(stock) || stock < 0)
      errors.push({ row: i + 2, field: 'stock', message: 'Stock must be 0 or greater' });
    else if (stock > 99999)
      errors.push({ row: i + 2, field: 'stock', message: 'Stock too large (max 99,999)' });

    if (!row.category_name?.trim())
      errors.push({ row: i + 2, field: 'category_name', message: 'Category name is required' });
  });
  return errors;
}

export function validateServiceRows(rows: ParsedRow[]): RowError[] {
  const validIcons = [
    'FiTruck','FiRefreshCw','FiShield','FiPackage','FiStar','FiHeart',
    'FiGift','FiZap','FiAward','FiCheckCircle','FiClock','FiGlobe',
  ];
  const errors: RowError[] = [];
  rows.forEach((row, i) => {
    const label = (row.label || '').trim();
    if (!label) errors.push({ row: i + 2, field: 'label', message: 'Label is required' });
    else if (label.length < 2) errors.push({ row: i + 2, field: 'label', message: 'Label too short (min 2)' });
    else if (label.length > 60) errors.push({ row: i + 2, field: 'label', message: 'Label too long (max 60)' });
    const icon = (row.icon_name || '').trim();
    if (!icon) errors.push({ row: i + 2, field: 'icon_name', message: 'icon_name is required' });
    else if (!validIcons.includes(icon))
      errors.push({ row: i + 2, field: 'icon_name', message: `Invalid icon. Valid values: ${validIcons.join(', ')}` });
  });
  return errors;
}

/* ─── Generate template Excel workbook ─── */
export function downloadTemplate(type: 'categories' | 'products' | 'services') {
  const wb = XLSX.utils.book_new();

  if (type === 'categories') {
    const ws = XLSX.utils.aoa_to_sheet([
      ['name', 'description'],
      ['Summer Collection', 'Light and breezy summer outfits'],
      ['Formal Wear', 'Elegant formal attire for every occasion'],
      ['Bridal', 'Exquisite bridal collections'],
    ]);
    ws['!cols'] = [{ wch: 30 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Categories');
    const instr = XLSX.utils.aoa_to_sheet([
      ['CATEGORIES BULK UPLOAD — INSTRUCTIONS'],
      [''],
      ['Column', 'Required', 'Max Length', 'Notes'],
      ['name', 'YES', '50 chars', 'Category display name'],
      ['description', 'NO', '300 chars', 'Short description shown on homepage'],
      [''],
      ['Notes:'],
      ['• Images cannot be uploaded via CSV. Add them manually after import.'],
      ['• Duplicate names will be skipped.'],
    ]);
    instr['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, instr, 'Instructions');

  } else if (type === 'services') {
    const ws = XLSX.utils.aoa_to_sheet([
      ['label', 'icon_name'],
      ['Free Delivery', 'FiTruck'],
      ['30-Day Returns', 'FiRefreshCw'],
      ['Secure Payment', 'FiShield'],
      ['Premium Quality', 'FiAward'],
    ]);
    ws['!cols'] = [{ wch: 35 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Services');
    const instr = XLSX.utils.aoa_to_sheet([
      ['SERVICES BULK UPLOAD — INSTRUCTIONS'],
      [''],
      ['Column', 'Required', 'Notes'],
      ['label', 'YES', 'Display text shown under the icon (2–60 chars)'],
      ['icon_name', 'YES', 'Exact icon name from the list below'],
      [''],
      ['Available icon names (copy exactly):'],
      ['FiTruck', '— Delivery / Shipping'],
      ['FiRefreshCw', '— Returns / Exchange'],
      ['FiShield', '— Security / Protection'],
      ['FiPackage', '— Packaging'],
      ['FiStar', '— Quality / Rating'],
      ['FiHeart', '— Customer Care'],
      ['FiGift', '— Gifts / Promotions'],
      ['FiZap', '— Fast / Express'],
      ['FiAward', '— Award / Premium'],
      ['FiCheckCircle', '— Verified / Guaranteed'],
      ['FiClock', '— Timing / Schedule'],
      ['FiGlobe', '— Worldwide / Global'],
      [''],
      ['Notes:'],
      ['• All imported services will be active by default.'],
    ]);
    instr['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, instr, 'Instructions');

  } else {
    // products
    const productHeaders = [
      'name', 'description', 'price', 'stock', 'category_name',
      'colors', 'sizes', 'fabric', 'wear_type', 'trouser_type',
      'styling', 'product_category', 'dupatta_fabric', 'trouser_fabric',
    ];
    const ws = XLSX.utils.aoa_to_sheet([
      productHeaders,
      ['Embroidered Lawn Suit', 'A beautifully crafted 3-piece embroidered lawn suit', '4500', '50', 'Summer Collection',
        'White,Pink', 'S,M,L,XL', 'Pure Lawn', 'Casual Wear', 'Trouser', 'Embroidered', '3 Piece Stitched', 'Chiffon', 'Pure Lawn'],
      ['Formal Chiffon Set', 'Elegant formal chiffon outfit for special occasions', '8500', '25', 'Formal Wear',
        'Black,Navy', 'M,L', 'Chiffon', 'Formal Wear', 'Shalwar', 'Printed & Patches', '2 Piece', 'Net', 'Chiffon'],
    ]);
    ws['!cols'] = productHeaders.map((h) => ({ wch: h === 'description' ? 50 : 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    const instr = XLSX.utils.aoa_to_sheet([
      ['PRODUCTS BULK UPLOAD — INSTRUCTIONS'],
      [''],
      ['Column', 'Required', 'Notes'],
      ['name', 'YES', 'Product title (3–100 chars)'],
      ['description', 'NO', 'Product description (max 1000 chars)'],
      ['price', 'YES', 'Price in PKR — numbers only, e.g. 4500'],
      ['stock', 'YES', 'Available quantity, e.g. 50'],
      ['category_name', 'YES', 'Must exactly match an existing category name'],
      ['colors', 'NO', 'Comma-separated: White,Pink,Black'],
      ['sizes', 'NO', 'Comma-separated: S,M,L,XL'],
      ['fabric', 'NO', 'e.g. Pure Lawn, Cotton, Chiffon'],
      ['wear_type', 'NO', 'e.g. Formal Wear, Casual Wear'],
      ['trouser_type', 'NO', 'e.g. Trouser, Shalwar, Palazzo'],
      ['styling', 'NO', 'e.g. Printed, Embroidered'],
      ['product_category', 'NO', 'e.g. 3 Piece Stitched, Unstitched'],
      ['dupatta_fabric', 'NO', 'e.g. Chiffon, Net'],
      ['trouser_fabric', 'NO', 'e.g. Pure Lawn, Cotton'],
      [''],
      ['Notes:'],
      ['• Product images cannot be uploaded via CSV. Add them manually after import.'],
      ['• category_name must match an existing category exactly (case-insensitive).'],
      ['• For colors and sizes, separate values with commas — no spaces needed.'],
    ]);
    instr['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, instr, 'Instructions');
  }

  XLSX.writeFile(wb, `${type}_template.xlsx`);
}
