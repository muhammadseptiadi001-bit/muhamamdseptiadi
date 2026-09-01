import { useState } from "react";

export default function SymbolSearch({ onSearch }) {
  const [value, setValue] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const symbol = value.trim().toUpperCase();
    if (symbol) onSearch(symbol);
  };

  return (
    <form className="symbol-search" onSubmit={submit}>
      <input
        type="text"
        placeholder="Ketik simbol (mis. AAPL, BBCA.JK, EURUSD=X)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit">Cari</button>
      <p className="search-hint">
        Format: saham AS tanpa akhiran (AAPL), saham IDX pakai <code>.JK</code> (BBCA.JK), forex pakai{" "}
        <code>=X</code> (EURUSD=X).
      </p>
    </form>
  );
}
