import pandas as pd


def add_indicators(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["sma20"] = out["close"].rolling(window=20).mean()
    out["sma50"] = out["close"].rolling(window=50).mean()
    out["ema12"] = out["close"].ewm(span=12, adjust=False).mean()
    out["ema26"] = out["close"].ewm(span=26, adjust=False).mean()
    out["ema50"] = out["close"].ewm(span=50, adjust=False).mean()
    out["ema200"] = out["close"].ewm(span=200, adjust=False).mean()

    delta = out["close"].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(window=14).mean()
    avg_loss = loss.rolling(window=14).mean()
    rs = avg_gain / avg_loss.replace(0, pd.NA)
    out["rsi14"] = 100 - (100 / (1 + rs))

    out["macd"] = out["ema12"] - out["ema26"]
    out["macd_signal"] = out["macd"].ewm(span=9, adjust=False).mean()
    out["macd_hist"] = out["macd"] - out["macd_signal"]

    bb_mid = out["close"].rolling(window=20).mean()
    bb_std = out["close"].rolling(window=20).std()
    out["bb_upper"] = bb_mid + 2 * bb_std
    out["bb_lower"] = bb_mid - 2 * bb_std

    low14 = out["low"].rolling(window=14).min()
    high14 = out["high"].rolling(window=14).max()
    out["stoch_k"] = 100 * (out["close"] - low14) / (high14 - low14)
    out["stoch_d"] = out["stoch_k"].rolling(window=3).mean()

    return out
