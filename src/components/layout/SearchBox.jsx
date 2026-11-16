import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Top-bar search input.
 * - Controlled when `onChange` is given, otherwise keeps its own text.
 * - With `results` (array of { key, title, subtitle, meta, to }) it shows a
 *   keyboard-navigable dropdown under the input; Enter opens the highlighted result.
 * - Without `results`, Enter calls `onSubmit(term)`.
 */
export default function SearchBox({
  value,
  onChange,
  results,
  onSubmit,
  placeholder = 'Search cases, students or commands...',
  shortcut = '⌘K',
  inputClassName = '',
}) {
  const navigate = useNavigate();
  const controlled = Boolean(onChange);
  const [localValue, setLocalValue] = useState('');
  const text = controlled ? value || '' : localValue;
  const hasDropdown = Array.isArray(results);
  const [open, setOpen] = useState(() => Boolean(text));
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  // Ctrl/Cmd + K focuses the search box.
  useEffect(() => {
    if (!shortcut) return undefined;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcut]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const showDropdown = hasDropdown && open && text.trim().length > 0;

  const openResult = (result) => {
    setOpen(false);
    navigate(result.to);
  };

  const handleKeyDown = (e) => {
    if (hasDropdown) {
      if (e.key === 'Escape') setOpen(false);
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
        setHighlight((h) => Math.min(h + 1, Math.max(results.length - 1, 0)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      } else if (e.key === 'Enter' && results[highlight]) {
        openResult(results[highlight]);
      }
      return;
    }
    if (e.key === 'Enter' && onSubmit) onSubmit(text.trim());
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
        search
      </span>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => {
          if (controlled) onChange(e.target.value);
          else setLocalValue(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        role={hasDropdown ? 'combobox' : undefined}
        aria-expanded={hasDropdown ? showDropdown : undefined}
        aria-controls={hasDropdown ? 'topbar-search-results' : undefined}
        aria-label="Search"
        placeholder={placeholder}
        className={`w-full pl-10 pr-14 focus:outline-none transition-all ${inputClassName}`}
      />
      {shortcut && (
        <kbd className="hidden sm:inline-flex items-center absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-500">
          {shortcut}
        </kbd>
      )}

      {showDropdown && (
        <div
          id="topbar-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-[0_12px_32px_rgba(15,23,42,0.08)] overflow-hidden"
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-500">No matching cases</p>
          ) : (
            <ul className="py-1 max-h-[360px] overflow-y-auto">
              {results.map((result, idx) => (
                <li key={result.key} role="option" aria-selected={idx === highlight}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => openResult(result)}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 ${idx === highlight ? 'bg-slate-50' : ''}`}
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-900 truncate">{result.title}</span>
                      <span className="block text-[11px] text-slate-500 truncate">{result.subtitle}</span>
                    </span>
                    {result.meta && <span className="shrink-0 text-[11px] text-slate-500">{result.meta}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
