"""
"3 EMA Expert" trend-pullback strategy: EMA8/EMA21/EMA125 alignment +
RSI14 filter + pullback-to-EMA + confirmation candle, with SL at the
nearest confirmed swing and TP at a fixed risk:reward ratio.

This is a well-defined, widely-used trend-following method (unlike the
"garis sakti" concept, which was never fully specified) - implemented
here exactly as documented, not reverse-engineered from screenshots.
It still does not predict the future: a valid setup can lose.
"""

import pandas as pd

from .brg import detect_swings

EMA_FAST_SPAN = 8
EMA_MID_SPAN = 21
EMA_SLOW_SPAN = 125
RSI_PERIOD = 14
PULLBACK_LOOKBACK = 5


def add_ema_rsi(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["ema_fast"] = out["close"].ewm(span=EMA_FAST_SPAN, adjust=False).mean()
    out["ema_mid"] = out["close"].ewm(span=EMA_MID_SPAN, adjust=False).mean()
    out["ema_slow"] = out["close"].ewm(span=EMA_SLOW_SPAN, adjust=False).mean()

    delta = out["close"].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(RSI_PERIOD).mean()
    avg_loss = loss.rolling(RSI_PERIOD).mean()
    rs = avg_gain / avg_loss.replace(0, pd.NA)
    out["rsi"] = 100 - (100 / (1 + rs))
    return out


def _is_bullish_engulfing(prev, cur) -> bool:
    return (
        prev["close"] < prev["open"]
        and cur["close"] > cur["open"]
        and cur["open"] <= prev["close"]
        and cur["close"] >= prev["open"]
    )


def _is_bearish_engulfing(prev, cur) -> bool:
    return (
        prev["close"] > prev["open"]
        and cur["close"] < cur["open"]
        and cur["open"] >= prev["close"]
        and cur["close"] <= prev["open"]
    )


def _is_bullish_pin_bar(cur) -> bool:
    body = abs(cur["close"] - cur["open"])
    rng = cur["high"] - cur["low"]
    if rng <= 0:
        return False
    lower_wick = min(cur["close"], cur["open"]) - cur["low"]
    upper_wick = cur["high"] - max(cur["close"], cur["open"])
    return lower_wick >= 2 * body and lower_wick > upper_wick and body <= 0.4 * rng


def _is_bearish_pin_bar(cur) -> bool:
    body = abs(cur["close"] - cur["open"])
    rng = cur["high"] - cur["low"]
    if rng <= 0:
        return False
    upper_wick = cur["high"] - max(cur["close"], cur["open"])
    lower_wick = min(cur["close"], cur["open"]) - cur["low"]
    return upper_wick >= 2 * body and upper_wick > lower_wick and body <= 0.4 * rng


def detect_confirmation(df: pd.DataFrame, direction: str) -> str | None:
    """Bullish/bearish rejection, engulfing, pin bar, or a candle that
    closes back on the trend side of EMA8/EMA21 after the pullback."""
    if len(df) < 2:
        return None
    prev = df.iloc[-2]
    cur = df.iloc[-1]

    if direction == "BUY":
        if _is_bullish_engulfing(prev, cur):
            return "bullish_engulfing"
        if _is_bullish_pin_bar(cur):
            return "bullish_pin_bar"
        if cur["close"] > cur["open"] and (cur["close"] > cur["ema_fast"] or cur["close"] > cur["ema_mid"]):
            return "bullish_close_above_ema"
    else:
        if _is_bearish_engulfing(prev, cur):
            return "bearish_engulfing"
        if _is_bearish_pin_bar(cur):
            return "bearish_pin_bar"
        if cur["close"] < cur["open"] and (cur["close"] < cur["ema_fast"] or cur["close"] < cur["ema_mid"]):
            return "bearish_close_below_ema"
    return None


def detect_pullback(df: pd.DataFrame, direction: str, lookback: int = PULLBACK_LOOKBACK) -> bool:
    recent = df.tail(lookback)
    if direction == "BUY":
        touched = (recent["low"] <= recent["ema_fast"]) | (recent["low"] <= recent["ema_mid"])
    else:
        touched = (recent["high"] >= recent["ema_fast"]) | (recent["high"] >= recent["ema_mid"])
    return bool(touched.any())


def evaluate_setup(df_with_ema: pd.DataFrame) -> dict:
    row = df_with_ema.iloc[-1]
    ema_fast, ema_mid, ema_slow = row["ema_fast"], row["ema_mid"], row["ema_slow"]
    price = row["close"]
    rsi = row["rsi"]

    bullish_structure = (
        pd.notna(ema_slow)
        and ema_fast > ema_mid > ema_slow
        and price > ema_slow
        and pd.notna(rsi)
        and rsi > 50
    )
    bearish_structure = (
        pd.notna(ema_slow)
        and ema_fast < ema_mid < ema_slow
        and price < ema_slow
        and pd.notna(rsi)
        and rsi < 50
    )

    trend = "BULLISH" if bullish_structure else "BEARISH" if bearish_structure else "NEUTRAL"
    verdict = "NEUTRAL"
    confirmation = None

    if trend == "BULLISH":
        pullback = detect_pullback(df_with_ema, "BUY")
        confirmation = detect_confirmation(df_with_ema, "BUY") if pullback else None
        verdict = "BUY_SETUP" if confirmation else "WAIT_BUY" if pullback else "TREND_BULLISH"
    elif trend == "BEARISH":
        pullback = detect_pullback(df_with_ema, "SELL")
        confirmation = detect_confirmation(df_with_ema, "SELL") if pullback else None
        verdict = "SELL_SETUP" if confirmation else "WAIT_SELL" if pullback else "TREND_BEARISH"

    return {
        "trend": trend,
        "verdict": verdict,
        "confirmation": confirmation,
        "price": float(price),
        "ema_fast": float(ema_fast) if pd.notna(ema_fast) else None,
        "ema_mid": float(ema_mid) if pd.notna(ema_mid) else None,
        "ema_slow": float(ema_slow) if pd.notna(ema_slow) else None,
        "rsi": float(rsi) if pd.notna(rsi) else None,
    }


def project_ema_future(df_with_ema: pd.DataFrame, bars: int = 15, slope_lookback: int = 5) -> list[dict]:
    """
    Extend each EMA line a fixed number of bars past the last candle by
    continuing its recent slope in a straight line. A real EMA needs future
    closing prices to compute, which don't exist yet - this is only a
    visual continuation of the current trajectory, NOT a price forecast.
    """
    cols = ("ema_fast", "ema_mid", "ema_slow")
    if len(df_with_ema) < slope_lookback + 1:
        return []

    spacing = df_with_ema.index[-1] - df_with_ema.index[-2]
    slopes = {}
    last_vals = {}
    for col in cols:
        recent = df_with_ema[col].dropna().tail(slope_lookback + 1)
        last_vals[col] = float(df_with_ema[col].iloc[-1])
        if len(recent) < 2:
            slopes[col] = 0.0
        else:
            slopes[col] = float(recent.iloc[-1] - recent.iloc[0]) / (len(recent) - 1)

    points = []
    for k in range(1, bars + 1):
        point = {"date": (df_with_ema.index[-1] + spacing * k).isoformat()}
        for col in cols:
            point[col] = round(last_vals[col] + slopes[col] * k, 6)
        points.append(point)
    return points


def compute_ema_trade_plan(df_with_ema: pd.DataFrame, verdict: str, rr_ratio: float = 2.0) -> dict | None:
    if verdict not in ("BUY_SETUP", "SELL_SETUP"):
        return None

    swung = detect_swings(df_with_ema, window=2)
    entry = float(df_with_ema["close"].iloc[-1])

    if verdict == "BUY_SETUP":
        direction = "BUY"
        recent_lows = swung[swung["swing_low"]].tail(5)
        if recent_lows.empty:
            return None
        stop_loss = float(recent_lows["low"].iloc[-1])
        risk = entry - stop_loss
        if risk <= 0:
            return None
        take_profit = entry + rr_ratio * risk
    else:
        direction = "SELL"
        recent_highs = swung[swung["swing_high"]].tail(5)
        if recent_highs.empty:
            return None
        stop_loss = float(recent_highs["high"].iloc[-1])
        risk = stop_loss - entry
        if risk <= 0:
            return None
        take_profit = entry - rr_ratio * risk

    return {
        "direction": direction,
        "entry": round(entry, 6),
        "stop_loss": round(stop_loss, 6),
        "take_profit": round(take_profit, 6),
        "risk_per_unit": round(risk, 6),
        "reward_ratio": rr_ratio,
    }
