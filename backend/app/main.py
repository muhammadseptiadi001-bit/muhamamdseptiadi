import math
import re
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.symbols import STOCKS, FOREX
from app.services.data import (
    fetch_history,
    fetch_brg_timeframe,
    BRG_TIMEFRAMES,
    fetch_ema_timeframe,
    EMA_TIMEFRAMES,
)
from app.services.indicators import add_indicators
from app.services.predictor import predict_trend
from app.services.signals import technical_summary
from app.services import brg as brg_service
from app.services import ema_strategy

app = FastAPI(title="Analisa Saham & Forex API")

# Fetches are I/O-bound (waiting on Yahoo Finance over the network), so a
# shared thread pool lets independent fetches (different timeframes,
# different symbols) run concurrently instead of queued one after another.
_EXECUTOR = ThreadPoolExecutor(max_workers=16)

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
                "date": ts.isoformat(),
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

    future_h4 = _EXECUTOR.submit(_analyze_brg_timeframe, symbol, "h4")
    future_m5 = _EXECUTOR.submit(_analyze_brg_timeframe, symbol, "m5")
    future_m1 = _EXECUTOR.submit(_analyze_brg_timeframe, symbol, "m1")

    _, _, h4_zones, h4_active, h4_bias = future_h4.result()
    _, _, m5_zones, m5_active, m5_bias = future_m5.result()
    m1_df, _, m1_zones, m1_active, m1_bias = future_m1.result()

    nested = brg_service.zones_nested(m1_active, m5_active)
    entry_confluence = nested and h4_bias["bias"] != "NEUTRAL"

    trade_plan = None
    expected_type = {"BUY": "demand", "SELL": "supply"}.get(h4_bias["bias"])
    if m1_active and expected_type and m1_active["type"] == expected_type:
        m1_atr = brg_service.latest_atr(m1_df)
        trade_plan = brg_service.compute_trade_plan(m1_active, m1_atr)
        if trade_plan:
            trade_plan["confidence"] = "tinggi" if entry_confluence else "rendah"
            trade_plan["current_price"] = round(float(m1_bias["last_close"]), 6)
            trade_plan["status"] = brg_service.evaluate_trade_status(
                trade_plan, m1_bias["last_close"]
            )

    return {
        "symbol": symbol,
        "h4": {"bias": h4_bias, "active_zone": h4_active, "zone_count": len(h4_zones)},
        "m5": {"active_zone": m5_active, "zone_count": len(m5_zones)},
        "m1": {"active_zone": m1_active, "zone_count": len(m1_zones)},
        "m1_inside_m5": nested,
        "entry_confluence": entry_confluence,
        "trade_plan": trade_plan,
        "disclaimer": BRG_DISCLAIMER,
    }


@app.get("/api/brg-scan/{category}")
def get_brg_scan(category: str, page: int = 1, page_size: int = 15):
    if category not in ("stocks", "forex"):
        raise HTTPException(status_code=400, detail="Kategori harus 'stocks' atau 'forex'")

    full_universe = STOCKS if category == "stocks" else FOREX
    page_size = max(1, min(page_size, 50))
    total = len(full_universe)
    total_pages = max(1, math.ceil(total / page_size))
    page = max(1, min(page, total_pages))
    start = (page - 1) * page_size

    universe = full_universe[start : start + page_size]

    def scan_one(item):
        symbol = item["symbol"]
        try:
            df = fetch_brg_timeframe(symbol, "h4")
            if len(df) < 30:
                raise ValueError("data historis kurang")
            channel = brg_service.fit_channel(df)
            bias = brg_service.channel_breakout_bias(df, channel)
            return {
                "symbol": symbol,
                "name": item["name"],
                "bias": bias["bias"],
                "last_close": bias["last_close"],
                "error": None,
            }
        except Exception as exc:
            return {
                "symbol": symbol,
                "name": item["name"],
                "bias": None,
                "last_close": None,
                "error": str(exc),
            }

    results = list(_EXECUTOR.map(scan_one, universe))

    return {
        "category": category,
        "results": results,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "disclaimer": BRG_DISCLAIMER,
    }


EMA_DISCLAIMER = (
    "Strategi EMA 8/21/125 + RSI14 ini adalah metode trend-following klasik yang "
    "diprogram persis sesuai aturan yang ditentukan (bukan hasil tebakan AI). "
    "Setup yang valid tetap bisa rugi - selalu gunakan Stop Loss dan jangan "
    "mempertaruhkan modal besar di satu posisi."
)


@app.get("/api/ema/{symbol}/{timeframe}")
def get_ema_analysis(symbol: str, timeframe: str):
    symbol = _validate_symbol(symbol)
    if timeframe not in EMA_TIMEFRAMES:
        raise HTTPException(status_code=400, detail="Timeframe tidak dikenal")

    try:
        df = fetch_ema_timeframe(symbol, timeframe)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gagal mengambil data: {exc}") from exc

    if len(df) < 130:
        raise HTTPException(
            status_code=422,
            detail="Data historis belum cukup untuk EMA125 (butuh minimal ~130 candle).",
        )

    df_ema = ema_strategy.add_ema_rsi(df)
    setup = ema_strategy.evaluate_setup(df_ema)
    trade_plan = ema_strategy.compute_ema_trade_plan(df_ema, setup["verdict"])

    rows = []
    for ts, row in df_ema.iterrows():
        rows.append(
            {
                "date": ts.isoformat(),
                "open": _clean_for_json(row["open"]),
                "high": _clean_for_json(row["high"]),
                "low": _clean_for_json(row["low"]),
                "close": _clean_for_json(row["close"]),
                "ema_fast": _clean_for_json(row["ema_fast"]),
                "ema_mid": _clean_for_json(row["ema_mid"]),
                "ema_slow": _clean_for_json(row["ema_slow"]),
                "rsi": _clean_for_json(row["rsi"]),
            }
        )

    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "rows": rows,
        "setup": setup,
        "trade_plan": trade_plan,
        "disclaimer": EMA_DISCLAIMER,
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}
