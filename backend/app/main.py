import math

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.symbols import STOCKS, FOREX, ALL_SYMBOLS
from app.services.data import fetch_history
from app.services.indicators import add_indicators
from app.services.predictor import predict_trend

app = FastAPI(title="Analisa Saham & Forex API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _clean_for_json(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


@app.get("/api/symbols")
def get_symbols():
    return {"stocks": STOCKS, "forex": FOREX}


@app.get("/api/quote/{symbol}")
def get_quote(symbol: str, period: str = "6mo", interval: str = "1d"):
    if symbol not in ALL_SYMBOLS:
        raise HTTPException(status_code=404, detail="Simbol tidak dikenal")

    try:
        df = fetch_history(symbol, period=period, interval=interval)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gagal mengambil data: {exc}") from exc

    df = add_indicators(df)

    rows = []
    for ts, row in df.iterrows():
        rows.append(
            {
                "date": str(ts.date()),
                "open": _clean_for_json(row["open"]),
                "high": _clean_for_json(row["high"]),
                "low": _clean_for_json(row["low"]),
                "close": _clean_for_json(row["close"]),
                "volume": _clean_for_json(row["volume"]),
                "sma20": _clean_for_json(row["sma20"]),
                "sma50": _clean_for_json(row["sma50"]),
                "rsi14": _clean_for_json(row["rsi14"]),
                "macd": _clean_for_json(row["macd"]),
                "macd_signal": _clean_for_json(row["macd_signal"]),
            }
        )

    return {"symbol": symbol, "rows": rows}


@app.get("/api/predict/{symbol}")
def get_prediction(symbol: str, period: str = "1y", interval: str = "1d"):
    if symbol not in ALL_SYMBOLS:
        raise HTTPException(status_code=404, detail="Simbol tidak dikenal")

    try:
        df = fetch_history(symbol, period=period, interval=interval)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gagal mengambil data: {exc}") from exc

    df = add_indicators(df)
    result = predict_trend(df)
    return {"symbol": symbol, **result}


@app.get("/api/health")
def health():
    return {"status": "ok"}
