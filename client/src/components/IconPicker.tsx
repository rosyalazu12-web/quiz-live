import { useState } from "react";

interface Props {
  value?: string;
  onChange: (icon: string | undefined) => void;
}

export function iconUrl(icon: string, color = "white"): string {
  const [prefix, name] = icon.split(":");
  return `https://api.iconify.design/${prefix}/${name}.svg?color=${encodeURIComponent(color)}`;
}

export function IconPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function search(q: string) {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=24`
      );
      const data = await res.json();
      setResults(Array.isArray(data.icons) ? data.icons : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="icon-picker">
      <button type="button" className="icon-picker-toggle" onClick={() => setOpen((o) => !o)}>
        {value ? (
          <>
            <img src={iconUrl(value)} alt="" width={20} height={20} />
            Cambiar ícono
          </>
        ) : (
          "+ Ícono (opcional)"
        )}
      </button>
      {value && (
        <button type="button" className="link-btn" onClick={() => onChange(undefined)}>
          Quitar
        </button>
      )}

      {open && (
        <div className="icon-picker-panel">
          <input
            type="text"
            placeholder="Buscar (ej. fútbol, dinero, reloj)"
            value={query}
            onChange={(e) => search(e.target.value)}
          />
          {loading && <p className="icon-picker-hint">Buscando...</p>}
          {!loading && query && results.length === 0 && (
            <p className="icon-picker-hint">Sin resultados.</p>
          )}
          <div className="icon-picker-grid">
            {results.map((icon) => (
              <button
                key={icon}
                type="button"
                className="icon-picker-item"
                title={icon}
                onClick={() => {
                  onChange(icon);
                  setOpen(false);
                }}
              >
                <img src={iconUrl(icon)} alt={icon} width={28} height={28} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
