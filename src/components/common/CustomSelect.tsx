import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiChevronDown, FiPlus, FiX } from 'react-icons/fi';

interface CustomSelectProps {
  label?: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  error?: string;
  className?: string;
}

/** Single-value fully-custom animated dropdown with optional custom entry */
export const CustomSelect = ({
  label,
  options,
  value,
  onChange,
  placeholder = '— Select —',
  allowCustom = true,
  error,
  className = '',
}: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allOptions = options.includes(value) || !value ? options : [...options, value];

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed) { onChange(trimmed); setCustomInput(''); setIsOpen(false); }
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      {label && <label className="block text-sm font-semibold text-logo-black mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-bg-silk-glow/20 border rounded-xl text-sm text-left transition-all cursor-pointer focus:outline-none ${
          error ? 'border-red-400' : isOpen ? 'border-logo-rose ring-2 ring-logo-rose/10' : 'border-logo-rose/20 hover:border-logo-rose/40'
        }`}
      >
        <span className={value ? 'text-logo-black' : 'text-logo-black/40'}>{value || placeholder}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <FiChevronDown size={15} className="text-logo-black/50 shrink-0" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-logo-rose/15 shadow-2xl z-50 overflow-hidden max-h-56 flex flex-col"
          >
            <div className="overflow-y-auto flex-1 py-1">
              {/* Clear option */}
              <button type="button" onClick={() => { onChange(''); setIsOpen(false); }}
                className="w-full flex items-center px-3.5 py-2.5 text-xs text-logo-black/40 hover:bg-logo-rose/5 transition-colors cursor-pointer font-sans">
                {placeholder}
              </button>
              {allOptions.map((opt) => (
                <button key={opt} type="button"
                  onClick={() => { onChange(opt); setIsOpen(false); }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm hover:bg-logo-rose/5 transition-colors cursor-pointer font-sans">
                  <span className={opt === value ? 'text-action-bordeaux font-semibold' : 'text-logo-black'}>{opt}</span>
                  {opt === value && <FiCheck size={14} className="text-action-bordeaux shrink-0" />}
                </button>
              ))}
            </div>
            {/* Custom value input */}
            {allowCustom && (
              <div className="border-t border-logo-rose/10 p-2.5 flex gap-2 bg-bg-silk-glow/30">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={customInput}
                    maxLength={30}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                    placeholder="Add custom value..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-logo-rose/20 rounded-lg focus:outline-none focus:border-logo-rose font-sans text-logo-black placeholder:text-logo-black/35"
                  />
                  {customInput.length > 0 && (
                    <span className="absolute right-2 bottom-0.5 text-[9px] text-logo-black/25 font-sans pointer-events-none">
                      {customInput.length}/30
                    </span>
                  )}
                </div>
                <button type="button" onClick={addCustom}
                  className="w-7 h-7 bg-action-bordeaux text-white rounded-lg flex items-center justify-center hover:bg-[#460416] transition-colors cursor-pointer shrink-0">
                  <FiPlus size={13} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-xs text-red-500 mt-0.5 font-sans">{error}</p>}
    </div>
  );
};

/* ─────────────────────────── Multi-Tag Input ─────────────────────────── */
interface MultiTagInputProps {
  label?: string;
  presets: string[];
  values: string[];
  onChange: (vals: string[]) => void;
  error?: string;
  placeholder?: string;
}

/** Multi-select tags with preset pills + free-type custom additions */
export const MultiTagInput = ({
  label,
  presets,
  values,
  onChange,
  error,
  placeholder = 'Type & press Enter to add…',
}: MultiTagInputProps) => {
  const [inputVal, setInputVal] = useState('');

  const toggle = (v: string) => {
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  };

  const addCustom = (raw: string) => {
    const v = raw.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInputVal('');
  };

  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  return (
    <div>
      {label && <label className="block text-sm font-semibold text-logo-black mb-2">{label}</label>}

      {/* Preset pills */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {presets.map((p) => (
          <button key={p} type="button" onClick={() => toggle(p)}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer select-none ${
              values.includes(p)
                ? 'bg-action-bordeaux text-white border-action-bordeaux'
                : 'border-logo-rose/20 text-logo-black hover:border-logo-rose/50'
            }`}>
            {p}
          </button>
        ))}
      </div>

      {/* Custom values chips + input */}
      <div className={`flex flex-wrap gap-1.5 items-center min-h-[40px] px-3 py-1.5 border rounded-xl bg-bg-silk-glow/20 transition-all ${error ? 'border-red-400' : 'border-logo-rose/20 focus-within:border-logo-rose focus-within:ring-2 focus-within:ring-logo-rose/10'}`}>
        {values.filter((v) => !presets.includes(v)).map((v) => (
          <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-action-bordeaux/10 text-action-bordeaux rounded-full text-xs font-bold border border-action-bordeaux/20">
            {v}
            <button type="button" onClick={() => remove(v)} className="cursor-pointer hover:text-red-500 transition-colors">
              <FiX size={10} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputVal}
          maxLength={30}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); addCustom(inputVal); }
            if (e.key === ',' || e.key === 'Tab') { e.preventDefault(); addCustom(inputVal); }
          }}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-xs text-logo-black placeholder:text-logo-black/35 font-sans py-0.5"
        />
      </div>

      {inputVal.length > 0 && (
        <p className="text-[9px] text-logo-black/30 font-sans text-right mt-0.5 pr-1">{inputVal.length}/30</p>
      )}
      {error && <p className="text-xs text-red-500 mt-0.5 font-sans">{error}</p>}
    </div>
  );
};
