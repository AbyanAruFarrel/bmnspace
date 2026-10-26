import { useEffect, useRef, useState } from "react";

// Pilihan (dropdown) kustom: selalu terbuka ke BAWAH dan punya tinggi maksimal dengan gulir sendiri.
// groups: [{ label?: string, options: [{ value, label }] }]
export default function AssetSelect({ value, onChange, groups, className = "" }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const current = groups.flatMap((g) => g.options).find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const pick = (v) => { onChange(v); setOpen(false); };

  return (
    <div className={`asel ${className}`} ref={box}>
      <button type="button" className="asel-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{current?.label || "Pilih…"}</span>
        <span className="asel-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="asel-panel" role="listbox">
          {groups.map((g, gi) => (
            <div key={g.label || gi}>
              {g.label && <div className="asel-group">{g.label}</div>}
              {g.options.map((o) => (
                <button type="button" key={o.value} role="option" aria-selected={String(o.value) === String(value)}
                  className={`asel-opt ${g.label ? "indent" : ""} ${String(o.value) === String(value) ? "on" : ""}`}
                  onClick={() => pick(String(o.value))}>
                  {o.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
