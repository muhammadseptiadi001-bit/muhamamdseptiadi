import pandas as pd


def add_indicators(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["sma20"] = out["close"].rolling(window=20).mean()
    out["sma50"] = out["close"].rolling(window=50).mean()
    out["ema12"] = out["close"].ewm(span=12, adjust=False).mean()
    out["ema26"] = out["close"].ewm(span=26, adjust=False).mean()

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

    return out
