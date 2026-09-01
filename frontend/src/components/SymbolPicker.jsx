export default function SymbolPicker({ stocks, forex, selected, onSelect }) {
  return (
    <div className="symbol-picker">
      <div className="symbol-group">
        <h3>Saham (IDX)</h3>
        <div className="symbol-list">
          {stocks.map((item) => (
            <button
              key={item.symbol}
              className={item.symbol === selected ? "symbol-btn active" : "symbol-btn"}
              onClick={() => onSelect(item.symbol)}
            >
              {item.symbol.replace(".JK", "")}
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="symbol-group">
        <h3>Forex</h3>
        <div className="symbol-list">
          {forex.map((item) => (
            <button
              key={item.symbol}
              className={item.symbol === selected ? "symbol-btn active" : "symbol-btn"}
              onClick={() => onSelect(item.symbol)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
