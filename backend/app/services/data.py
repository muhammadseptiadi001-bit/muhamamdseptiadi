import yfinance as yf
import pandas as pd


def fetch_history(symbol: str, period: str = "6mo", interval: str = "1d") -> pd.DataFrame:
    df = yf.Ticker(symbol).history(period=period, interval=interval)
    if df.empty:
        raise ValueError(f"No data returned for symbol {symbol}")
    df = df.rename(columns=str.lower)
    df.index.name = "date"
    return df[["open", "high", "low", "close", "volume"]].dropna()


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
