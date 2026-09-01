import math
import re

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.symbols import STOCKS, FOREX
from app.services.data import fetch_history, fetch_brg_timeframe, BRG_TIMEFRAMES
from app.services.indicators import add_indicators
from app.services.predictor import predict_trend
from app.services.signals import technical_summary
from app.services import brg as brg_service

app = FastAPI(title="Analisa Saham & Forex API")

SYMBOL_PATTERN = re.compile(r"^[A-Za-z0-9.=^-]{1,15}$")


def _validate_symbol(symbol: str) -> str:
    symbol = symbol.strip().upper()
    if not SYMBOL_PATTERN.match(symbol):
        raise HTTPException(status_code=400, detail="Format simbol tidak valid")
    return symbol

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
    symbol = _validate_symbol(symbol)

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
    symbol = _validate_symbol(symbol)

    try:
        df = fetch_history(symbol, period=period, interval=interval)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gagal mengambil data: {exc}") from exc

    df = add_indicators(df)
    result = predict_trend(df)
    return {"symbol": symbol, **result}


@app.get("/api/analysis/{symbol}")
def get_analysis(symbol: str, period: str = "1y", interval: str = "1d"):
    symbol = _validate_symbol(symbol)

    try:
        df = fetch_history(symbol, period=period, interval=interval)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gagal mengambil data: {exc}") from exc

    df = add_indicators(df)
    if len(df.dropna(subset=["sma50"])) == 0:
        raise HTTPException(status_code=422, detail="Data historis belum cukup untuk analisis")

    result = technical_summary(df)
    return {"symbol": symbol, **result}


BRG_DISCLAIMER = (
    "Channel dan zona di sini dihitung otomatis dengan aturan statistik sederhana "
    "(regresi linear + deteksi konsolidasi-lalu-breakout), sebagai pendekatan atas "
    "metode 'parallel channel + supply/demand' yang biasa digambar manual. Hasilnya "
    "TIDAK dijamin sama persis dengan analisa manual dan BUKAN sinyal trading pasti."
)


def _analyze_brg_timeframe(symbol: str, timeframe: str):
    if timeframe not in BRG_TIMEFRAMES:
        raise HTTPException(status_code=400, detail="Timeframe tidak dikenal")

    try:
        df = fetch_brg_timeframe(symbol, timeframe)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gagal mengambil data: {exc}") from exc

    if len(df) < 30:
        raise HTTPException(status_code=422, detail="Data historis belum cukup untuk analisis BRG")

    channel = brg_service.fit_channel(df)
    zones = brg_service.detect_snd_zones(df)
    active = brg_service.active_zone(zones)
    bias = brg_service.channel_breakout_bias(df, channel)

    return df, channel, zones, active, bias


@app.get("/api/brg/{symbol}/{timeframe}")
def get_brg_timeframe(symbol: str, timeframe: str):
    symbol = _validate_symbol(symbol)
    df, channel, zones, active, bias = _analyze_brg_timeframe(symbol, timeframe)

    rows = []
    for ts, row in df.iterrows():
        rows.append(
            {
                "date": ts.isoformat(),
                "open": _clean_for_json(row["open"]),
                "high": _clean_for_json(row["high"]),
                "low": _clean_for_json(row["low"]),
                "close": _clean_for_json(row["close"]),
                "channel_upper": _clean_for_json(channel["channel_upper"].loc[ts]),
                "channel_lower": _clean_for_json(channel["channel_lower"].loc[ts]),
            }
        )

    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "rows": rows,
        "zones": zones,
        "active_zone": active,
        "bias": bias,
        "disclaimer": BRG_DISCLAIMER,
    }


@app.get("/api/brg-summary/{symbol}")
def get_brg_summary(symbol: str):
    symbol = _validate_symbol(symbol)

    _, _, h4_zones, h4_active, h4_bias = _analyze_brg_timeframe(symbol, "h4")
    _, _, m5_zones, m5_active, m5_bias = _analyze_brg_timeframe(symbol, "m5")
    _, _, m1_zones, m1_active, m1_bias = _analyze_brg_timeframe(symbol, "m1")

    nested = brg_service.zones_nested(m1_active, m5_active)

    return {
        "symbol": symbol,
        "h4": {"bias": h4_bias, "active_zone": h4_active, "zone_count": len(h4_zones)},
        "m5": {"active_zone": m5_active, "zone_count": len(m5_zones)},
        "m1": {"active_zone": m1_active, "zone_count": len(m1_zones)},
        "m1_inside_m5": nested,
        "entry_confluence": nested and h4_bias["bias"] != "NEUTRAL",
        "disclaimer": BRG_DISCLAIMER,
    }


@app.get("/api/brg-scan/{category}")
def get_brg_scan(category: str):
    if category not in ("stocks", "forex"):
        raise HTTPException(status_code=400, detail="Kategori harus 'stocks' atau 'forex'")

    universe = STOCKS if category == "stocks" else FOREX
    results = []

    for item in universe:
        symbol = item["symbol"]
        try:
            df = fetch_brg_timeframe(symbol, "h4")
            if len(df) < 30:
                raise ValueError("data historis kurang")
            channel = brg_service.fit_channel(df)
            bias = brg_service.channel_breakout_bias(df, channel)
            results.append(
                {
                    "symbol": symbol,
                    "name": item["name"],
                    "bias": bias["bias"],
                    "last_close": bias["last_close"],
                    "error": None,
                }
            )
        except Exception as exc:
            results.append(
                {
                    "symbol": symbol,
                    "name": item["name"],
                    "bias": None,
                    "last_close": None,
                    "error": str(exc),
                }
            )

    return {"category": category, "results": results, "disclaimer": BRG_DISCLAIMER}


@app.get("/api/health")
def health():
    return {"status": "ok"}
