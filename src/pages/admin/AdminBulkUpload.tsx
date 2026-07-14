import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUploadCloud, FiDownload, FiCheckCircle, FiAlertCircle,
  FiX, FiFileText, FiPackage, FiRefreshCw, FiInfo,
} from 'react-icons/fi';
import { supabase } from '../../utils/supabase';
import { useToast } from '../../components/common/Toast';
import {
  parseFile, validateCategoryRows, validateProductRows, validateServiceRows,
  downloadTemplate, type ParsedRow, type RowError,
} from '../../utils/bulkImport';

type UploadMode = 'categories' | 'products' | 'services';
type ImportStatus = 'idle' | 'parsing' | 'validating' | 'previewing' | 'importing' | 'done' | 'error';

interface ImportResult {
  inserted: number;
  skipped: number;
  failed: number;
  errors: string[];
}

const AdminBulkUpload = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<UploadMode>('categories');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<RowError[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);

  /* ── Reset everything ── */
  const reset = () => {
    setStatus('idle');
    setFileName('');
    setParsedRows([]);
    setValidationErrors([]);
    setResult(null);
    setImportProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleModeChange = (m: UploadMode) => {
    setMode(m);
    reset();
  };

  /* ── File picked / dropped ── */
  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setStatus('parsing');
    setValidationErrors([]);
    setParsedRows([]);
    setResult(null);
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        toast('The file appears to be empty or has no data rows.', 'warning', 'Empty File');
        setStatus('idle'); return;
      }
      setStatus('validating');
      const errors = mode === 'categories'
        ? validateCategoryRows(rows)
        : mode === 'services'
        ? validateServiceRows(rows)
        : validateProductRows(rows);
      setParsedRows(rows);
      setValidationErrors(errors);
      setStatus('previewing');
    } catch (err: any) {
      toast(err.message || 'Failed to parse file', 'error', 'Parse Error');
      setStatus('error');
    }
  }, [mode, toast]);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  /* ── Import categories ── */
  const importCategories = async () => {
    setStatus('importing');
    setImportProgress(0);
    const res: ImportResult = { inserted: 0, skipped: 0, failed: 0, errors: [] };

    // Fetch existing category names to deduplicate
    const { data: existing } = await supabase.from('categories').select('name').not('name', 'ilike', '__SYSTEM_%');
    const existingNames = new Set((existing || []).map((c) => c.name.toLowerCase()));

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const name = (row.name || '').trim();
      if (existingNames.has(name.toLowerCase())) {
        res.skipped++;
      } else {
        const { error } = await supabase.from('categories').insert({
          name,
          description: (row.description || '').trim() || null,
          image_url: null,
        });
        if (error) {
          res.failed++;
          res.errors.push(`Row ${i + 2}: ${error.message}`);
        } else {
          res.inserted++;
          existingNames.add(name.toLowerCase());
        }
      }
      setImportProgress(Math.round(((i + 1) / parsedRows.length) * 100));
    }
    setResult(res);
    setStatus('done');
    if (res.inserted > 0) toast(`${res.inserted} categories imported successfully.`, 'success', 'Import Complete');
    else toast('No new categories were inserted.', 'info', 'Import Done');
  };

  /* ── Import products ── */
  const importProducts = async () => {
    setStatus('importing');
    setImportProgress(0);
    const res: ImportResult = { inserted: 0, skipped: 0, failed: 0, errors: [] };

    // Build category name → id map
    const { data: cats } = await supabase.from('categories').select('id,name').not('name', 'ilike', '__SYSTEM_%');
    const catMap = new Map((cats || []).map((c) => [c.name.toLowerCase(), c.id]));

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const categoryId = catMap.get((row.category_name || '').trim().toLowerCase()) || null;
      if (!categoryId && row.category_name?.trim()) {
        res.failed++;
        res.errors.push(`Row ${i + 2}: Category "${row.category_name}" not found`);
        setImportProgress(Math.round(((i + 1) / parsedRows.length) * 100));
        continue;
      }
      const details = {
        colors: row.colors ? row.colors.split(',').map((s) => s.trim()).filter(Boolean) : [],
        sizes: row.sizes ? row.sizes.split(',').map((s) => s.trim()).filter(Boolean) : [],
        fabric: row.fabric?.trim() || '',
        wear_type: row.wear_type?.trim() || '',
        trouser_type: row.trouser_type?.trim() || '',
        styling: row.styling?.trim() || '',
        product_category: row.product_category?.trim() || '',
        dupatta_fabric: row.dupatta_fabric?.trim() || '',
        trouser_fabric: row.trouser_fabric?.trim() || '',
      };
      const { error } = await supabase.from('products').insert({
        name: row.name.trim(),
        description: row.description?.trim() || null,
        price: parseFloat(row.price),
        stock: parseInt(row.stock),
        category_id: categoryId,
        image_url: null,
        details: JSON.stringify(details),
      });
      if (error) {
        res.failed++;
        res.errors.push(`Row ${i + 2}: ${error.message}`);
      } else {
        res.inserted++;
      }
      setImportProgress(Math.round(((i + 1) / parsedRows.length) * 100));
    }
    setResult(res);
    setStatus('done');
    if (res.inserted > 0) toast(`${res.inserted} products imported successfully.`, 'success', 'Import Complete');
    else toast('No new products were inserted.', 'info', 'Import Done');
  };

  /* ── Import services ── */
  const importServices = async () => {
    setStatus('importing');
    setImportProgress(0);
    const res: ImportResult = { inserted: 0, skipped: 0, failed: 0, errors: [] };
    const { data: existing } = await supabase.from('services').select('label');
    const existingLabels = new Set((existing || []).map((s) => s.label.toLowerCase()));

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const label = (row.label || '').trim();
      if (existingLabels.has(label.toLowerCase())) {
        res.skipped++;
      } else {
        const maxOrder = res.inserted + (existing?.length || 0);
        const { error } = await supabase.from('services').insert({
          label,
          icon_name: (row.icon_name || 'FiShield').trim(),
          is_active: true,
          sort_order: maxOrder,
        });
        if (error) { res.failed++; res.errors.push(`Row ${i + 2}: ${error.message}`); }
        else { res.inserted++; existingLabels.add(label.toLowerCase()); }
      }
      setImportProgress(Math.round(((i + 1) / parsedRows.length) * 100));
    }
    setResult(res);
    setStatus('done');
    if (res.inserted > 0) toast(`${res.inserted} services imported.`, 'success', 'Import Complete');
    else toast('No new services inserted.', 'info', 'Import Done');
  };

  const handleImport = () => {
    if (validationErrors.length > 0) {
      toast('Please fix all validation errors before importing.', 'warning', 'Validation Failed');
      return;
    }
    if (mode === 'categories') importCategories();
    else if (mode === 'services') importServices();
    else importProducts();
  };

  /* ── Column headers for preview table ── */
  const previewColumns = mode === 'categories'
    ? ['name', 'description']
    : mode === 'services'
    ? ['label', 'icon_name']
    : ['name', 'price', 'stock', 'category_name', 'colors', 'sizes', 'fabric', 'wear_type'];

  const errorRows = new Set(validationErrors.map((e) => e.row - 2));

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-logo-black">Bulk Upload</h1>
          <p className="text-sm text-logo-black/50 mt-1 font-sans">Import categories or products in bulk via CSV or Excel</p>
        </div>
        {status !== 'idle' && (
          <button onClick={reset} className="flex items-center gap-2 px-4 py-2 border border-logo-rose/20 rounded-xl text-sm font-medium text-logo-black hover:bg-logo-rose/5 transition-all cursor-pointer">
            <FiRefreshCw size={15} /> Start Over
          </button>
        )}
      </div>

      {/* ── Mode Tabs ── */}
      <div className="flex bg-bg-silk-glow/60 rounded-2xl p-1.5 w-fit border border-logo-rose/10">
        {(['categories', 'products', 'services'] as UploadMode[]).map((m) => (
          <button key={m} onClick={() => handleModeChange(m)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer capitalize ${mode === m ? 'bg-action-bordeaux text-white shadow-md' : 'text-logo-black/60 hover:text-logo-black'}`}>
            {m === 'categories' ? <FiPackage size={15} /> : m === 'services' ? <FiFileText size={15} /> : <FiFileText size={15} />}
            {m}
          </button>
        ))}
      </div>

      {/* ── Template Download ── */}
      <div className="bg-white rounded-2xl border border-logo-rose/10 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
            <FiDownload size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-sans font-semibold text-sm text-logo-black">Download Template</p>
            <p className="font-sans text-xs text-logo-black/50 mt-0.5">
              Get the {mode === 'categories' ? 'categories' : 'products'} Excel template with sample data and instructions
            </p>
          </div>
        </div>
        <button
          onClick={() => downloadTemplate(mode)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
        >
          <FiDownload size={14} /> {mode}_template.xlsx
        </button>
      </div>

      {/* ── Drop Zone ── */}
      {(status === 'idle' || status === 'error') && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-action-bordeaux bg-action-bordeaux/5 scale-[1.01]'
              : 'border-logo-rose/25 bg-white hover:border-logo-rose/50 hover:bg-logo-rose/3'
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileInputChange} />
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragOver ? 'bg-action-bordeaux/10' : 'bg-bg-silk-glow'}`}>
            <FiUploadCloud size={32} className={dragOver ? 'text-action-bordeaux' : 'text-logo-rose/60'} />
          </div>
          <div className="text-center">
            <p className="font-sans font-bold text-logo-black text-sm">Drop your file here or click to browse</p>
            <p className="font-sans text-xs text-logo-black/45 mt-1">Supports .csv, .xlsx, .xls files</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-bg-silk-glow rounded-full border border-logo-rose/10">
            <FiInfo size={13} className="text-logo-rose/60 shrink-0" />
            <p className="text-[11px] text-logo-black/50 font-sans">
              Use the template above for the correct column format
            </p>
          </div>
        </div>
      )}

      {/* ── Parsing spinner ── */}
      {(status === 'parsing' || status === 'validating') && (
        <div className="bg-white rounded-2xl border border-logo-rose/10 p-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-logo-rose/20 border-t-action-bordeaux animate-spin" />
          <p className="font-sans text-sm text-logo-black/60">
            {status === 'parsing' ? 'Parsing file…' : 'Validating rows…'}
          </p>
        </div>
      )}

      {/* ── Preview + Validation ── */}
      {status === 'previewing' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* File info bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-logo-rose/10 px-5 py-3.5">
            <div className="flex items-center gap-3">
              <FiFileText size={18} className="text-logo-rose" />
              <div>
                <p className="font-sans text-sm font-semibold text-logo-black">{fileName}</p>
                <p className="font-sans text-xs text-logo-black/50">
                  {parsedRows.length} row{parsedRows.length !== 1 ? 's' : ''} detected
                  {validationErrors.length > 0 && (
                    <span className="text-red-500 ml-2 font-bold">· {validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''} found</span>
                  )}
                  {validationErrors.length === 0 && (
                    <span className="text-emerald-600 ml-2 font-bold">· All rows valid ✓</span>
                  )}
                </p>
              </div>
            </div>
            <button onClick={reset} className="p-1.5 hover:bg-logo-rose/10 rounded-full cursor-pointer transition-colors">
              <FiX size={16} className="text-logo-black/40" />
            </button>
          </div>

          {/* Validation errors */}
          <AnimatePresence>
            {validationErrors.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-red-200 bg-red-100/50">
                  <FiAlertCircle size={16} className="text-red-500 shrink-0" />
                  <p className="font-sans text-sm font-bold text-red-700">{validationErrors.length} Validation Error{validationErrors.length > 1 ? 's' : ''} — Fix before importing</p>
                </div>
                <div className="p-4 space-y-1.5 max-h-40 overflow-y-auto">
                  {validationErrors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs font-sans text-red-700">
                      <span className="font-bold shrink-0">Row {e.row}</span>
                      <span className="text-red-400">·</span>
                      <span className="font-semibold text-red-600 shrink-0">{e.field}</span>
                      <span className="text-red-400">·</span>
                      <span>{e.message}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview table */}
          <div className="bg-white rounded-2xl border border-logo-rose/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-logo-rose/10 bg-bg-silk-glow/30 flex items-center justify-between">
              <p className="font-sans text-xs font-bold uppercase tracking-wider text-logo-black/50">Data Preview</p>
              <p className="font-sans text-xs text-logo-black/40">Showing first {Math.min(parsedRows.length, 10)} of {parsedRows.length} rows</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-sans">
                <thead className="bg-bg-silk-glow/50">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-bold text-logo-black/60 w-12">#</th>
                    {previewColumns.map((col) => (
                      <th key={col} className="px-3 py-2.5 text-left font-bold text-logo-black/60 capitalize whitespace-nowrap">
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-left font-bold text-logo-black/60">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 10).map((row, i) => {
                    const hasError = errorRows.has(i);
                    return (
                      <tr key={i} className={`border-t border-logo-rose/5 ${hasError ? 'bg-red-50' : 'hover:bg-logo-rose/3'}`}>
                        <td className="px-3 py-2.5 text-logo-black/40">{i + 2}</td>
                        {previewColumns.map((col) => (
                          <td key={col} className="px-3 py-2.5 text-logo-black max-w-40 truncate">
                            {row[col] || <span className="text-logo-black/25 italic">—</span>}
                          </td>
                        ))}
                        <td className="px-3 py-2.5">
                          {hasError
                            ? <span className="flex items-center gap-1 text-red-500 font-bold"><FiAlertCircle size={11} /> Error</span>
                            : <span className="flex items-center gap-1 text-emerald-600 font-bold"><FiCheckCircle size={11} /> OK</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import button */}
          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 py-3 border border-logo-rose/20 rounded-xl text-sm font-semibold text-logo-black hover:bg-logo-rose/5 transition-all cursor-pointer font-sans">
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={validationErrors.length > 0}
              className="flex-1 py-3 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              Import {parsedRows.length} {mode === 'categories' ? 'Categories' : 'Products'}
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Importing progress ── */}
      {status === 'importing' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-logo-rose/10 p-8 flex flex-col items-center gap-5">
          <div className="w-14 h-14 rounded-full border-4 border-logo-rose/20 border-t-action-bordeaux animate-spin" />
          <div className="w-full max-w-xs space-y-2 text-center">
            <p className="font-sans text-sm font-semibold text-logo-black">
              Importing {mode}… {importProgress}%
            </p>
            <div className="w-full h-2.5 bg-logo-rose/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-action-bordeaux rounded-full"
                animate={{ width: `${importProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="font-sans text-xs text-logo-black/40">Please don't close this page</p>
          </div>
        </motion.div>
      )}

      {/* ── Done summary ── */}
      {status === 'done' && result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Inserted', value: result.inserted, color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: FiCheckCircle },
              { label: 'Skipped', value: result.skipped, color: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: FiInfo },
              { label: 'Failed', value: result.failed, color: 'bg-red-50 border-red-200', text: 'text-red-700', icon: FiAlertCircle },
            ].map(({ label, value, color, text, icon: Icon }) => (
              <div key={label} className={`rounded-2xl border p-5 flex flex-col items-center gap-2 ${color}`}>
                <Icon size={22} className={text} />
                <span className={`font-serif text-3xl font-bold ${text}`}>{value}</span>
                <span className={`font-sans text-xs font-semibold uppercase tracking-wider ${text} opacity-70`}>{label}</span>
              </div>
            ))}
          </div>

          {/* Failed row errors */}
          {result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-red-100 bg-red-100/60">
                <FiAlertCircle size={15} className="text-red-500" />
                <p className="font-sans text-sm font-bold text-red-700">Row Failures ({result.errors.length})</p>
              </div>
              <div className="p-4 space-y-1 max-h-48 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="font-sans text-xs text-red-600">{e}</p>
                ))}
              </div>
            </div>
          )}

          {/* Skipped note */}
          {result.skipped > 0 && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
              <FiInfo size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="font-sans text-xs text-amber-700">
                <strong>{result.skipped}</strong> row{result.skipped > 1 ? 's were' : ' was'} skipped because {mode === 'categories' ? 'a category with the same name already exists' : 'of duplicate entries or missing data'}.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset}
              className="flex-1 py-3 border border-logo-rose/20 rounded-xl text-sm font-semibold text-logo-black hover:bg-logo-rose/5 transition-all cursor-pointer font-sans">
              Upload Another File
            </button>
            <button onClick={() => { reset(); window.location.href = `/admin/${mode === 'services' ? 'services' : mode}`; }}
              className="flex-1 py-3 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl text-sm font-bold uppercase tracking-wider cursor-pointer transition-all shadow-md">
              View {mode === 'categories' ? 'Categories' : mode === 'services' ? 'Services' : 'Products'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminBulkUpload;
