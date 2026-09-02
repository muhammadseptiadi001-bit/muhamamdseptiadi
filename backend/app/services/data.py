import threading
import time

import yfinance as yf
import pandas as pd

# Short-lived cache so repeated clicks/tab-switches within a few seconds
# don't each trigger a fresh network round-trip to Yahoo Finance - that
# round-trip (not our own code) is what makes the UI feel slow.
_CACHE: dict = {}
_CACHE_LOCK = threading.Lock()
_CACHE_TTL_SECONDS = 30


def _cache_get(key):
    with _CACHE_LOCK:
        entry = _CACHE.get(key)
    if entry and time.time() - entry[0] < _CACHE_TTL_SECONDS:
        return entry[1]
    return None


def _cache_set(key, value):
    with _CACHE_LOCK:
        _CACHE[key] = (time.time(), value)


def fetch_history(symbol: str, period: str = "6mo", interval: str = "1d") -> pd.DataFrame:
    cache_key = (symbol, period, interval)
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached.copy()

    df = yf.Ticker(symbol).history(period=period, interval=interval)
    if df.empty:
        raise ValueError(f"No data returned for symbol {symbol}")
    df = df.rename(columns=str.lower)
    df.index.name = "date"
    result = df[["open", "high", "low", "close", "volume"]].dropna()

    _cache_set(cache_key, result)
    return result.copy()


# Yahoo Finance intraday lookback limits: 1m -> 7d, 5m/15m/30m -> 60d,
# 1h -> 730d. H4 has no native interval, so it's resampled from 1h.
BRG_TIMEFRAMES = {
    "h4": {"interval": "1h", "period": "180d", "resample": "4h"},
    "m30": {"interval": "30m", "period": "30d", "resample": None},
    "m5": {"interval": "5m", "period": "30d", "resample": None},
    "m1": {"interval": "1m", "period": "5d", "resample": None},
}


def fetch_brg_timeframe(symbol: str, timeframe: str) -> pd.DataFrame:
    if timeframe not in BRG_TIMEFRAMES:
        raise ValueError(f"Unknown timeframe: {timeframe}")

    cfg = BRG_TIMEFRAMES[timeframe]
    df = fetch_history(symbol, period=cfg["period"], interval=cfg["interval"])

    if cfg["resample"]:
        df = df.resample(cfg["resample"]).agg(
            {"open": "first", "high": "max", "low": "min", "close": "last", "volume": "sum"}
        ).dropna()

    return df


# EMA 8/21/125 needs several hundred bars to stabilize, so periods here
# are pushed to Yahoo's max for each interval (5m/15m/30m -> 60d,
# 60m -> 730d, 1d -> a few years). H4 is resampled from 1h.
EMA_TIMEFRAMES = {
    "m5": {"interval": "5m", "period": "60d", "resample": None},
    "m15": {"interval": "15m", "period": "60d", "resample": None},
    "m30": {"interval": "30m", "period": "60d", "resample": None},
    "h1": {"interval": "60m", "period": "730d", "resample": None},
    "h4": {"interval": "1h", "period": "730d", "resample": "4h"},
    "d1": {"interval": "1d", "period": "3y", "resample": None},
}


def fetch_ema_timeframe(symbol: str, timeframe: str) -> pd.DataFrame:
    if timeframe not in EMA_TIMEFRAMES:
        raise ValueError(f"Unknown timeframe: {timeframe}")

    cfg = EMA_TIMEFRAMES[timeframe]
    df = fetch_history(symbol, period=cfg["period"], interval=cfg["interval"])

    if cfg["resample"]:
        df = df.resample(cfg["resample"]).agg(
            {"open": "first", "high": "max", "low": "min", "close": "last", "volume": "sum"}
        ).dropna()

    return df
