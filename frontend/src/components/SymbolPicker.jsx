import { useState } from "react";

export default function SymbolPicker({ stocks, forex, selected, onSelect, isWatched, onToggleWatch }) {
  const [category, setCategory] = useState("stocks");
  const list = category === "stocks" ? stocks : forex;

  return (
    <div className="symbol-picker">
      <label className="category-label" htmlFor="category-select">
        Kategori
      </label>
      <select
        id="category-select"
        className="category-select"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="stocks">Saham (IDX)</option>
        <option value="forex">Forex</option>
      </select>

      <div className="symbol-list">
        {list.map((item) => (
          <div key={item.symbol} className="symbol-row">
            <button
              className={item.symbol === selected ? "symbol-btn active" : "symbol-btn"}
              onClick={() => onSelect(item.symbol)}
            >
              {category === "stocks" ? item.symbol.replace(".JK", "") : item.name}
              {category === "stocks" && <span>{item.name}</span>}
            </button>
            <button
              className={isWatched(item.symbol) ? "star-btn active" : "star-btn"}
              onClick={() => onToggleWatch(item.symbol, item.name)}
              title={isWatched(item.symbol) ? "Hapus dari pantauan" : "Tandai untuk dipantau"}
            >
              {isWatched(item.symbol) ? "★" : "☆"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
