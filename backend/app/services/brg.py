"""
Heuristic, rule-based approximation of a discretionary multi-timeframe
"parallel channel + supply/demand zone" charting method (the "BRG" style
seen in retail trading tutorials): a linear-regression channel stands in
for manually-drawn trendlines, and a consolidation-then-breakout pattern
stands in for manually-marked supply/demand boxes.

This is a best-effort algorithmic approximation, not a reproduction of a
discretionary trader's exact drawing decisions - it will not always match
what someone would draw by hand, and none of it predicts future price
movement.
"""

import numpy as np
import pandas as pd


def _fmt_ts(ts) -> str:
    return ts.isoformat()


def _atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    high, low, close = df["high"], df["low"], df["close"]
    prev_close = close.shift(1)
    tr = pd.concat(
        [high - low, (high - prev_close).abs(), (low - prev_close).abs()],
        axis=1,
    ).max(axis=1)
    return tr.rolling(period).mean()


def detect_swings(df: pd.DataFrame, window: int = 2) -> pd.DataFrame:
    """Mark local-extrema swing highs/lows (simple fractal method)."""
    out = df.copy()
    highs = out["high"].values
    lows = out["low"].values
    n = len(out)
    swing_high = np.zeros(n, dtype=bool)
    swing_low = np.zeros(n, dtype=bool)

    for i in range(window, n - window):
        h_slice = highs[i - window : i + window + 1]
        l_slice = lows[i - window : i + window + 1]
        if highs[i] == h_slice.max():
            swing_high[i] = True
        if lows[i] == l_slice.min():
            swing_low[i] = True

    out["swing_high"] = swing_high
    out["swing_low"] = swing_low
    return out


def fit_channel(df: pd.DataFrame, lookback: int = 80, exclude_recent: int = 10) -> dict:
    """
    Fit a linear-regression parallel channel on a training window that
    EXCLUDES the most recent `exclude_recent` bars, then project that
    line forward across those recent bars too.

    Fitting the channel on the same bars it's later tested against would
    make a "breakout" structurally impossible - the channel's own upper/
    lower bound is defined as the max/min residual within that window, so
    the newest point could at best sit exactly on the boundary, never
    beyond it. Excluding recent bars from the fit keeps the boundary
    independent of the price action being tested for a breakout.
    """
    n = len(df)
    exclude_recent = max(0, min(exclude_recent, n - 2))
    train_end = n - exclude_recent
    lookback = min(lookback, train_end)
    train_start = train_end - lookback

    train = df.iloc[train_start:train_end]
    x_train = np.arange(len(train))
    y_train = train["close"].values

    slope, intercept = np.polyfit(x_train, y_train, 1)
    fitted_train = slope * x_train + intercept
    residuals = y_train - fitted_train
    upper_offset = float(residuals.max())
    lower_offset = float(residuals.min())

    # Project the fitted line across the training window plus the
    # excluded recent bars, so callers can see whether current price has
    # broken out of the established channel.
    project_index = df.index[train_start:]
    x_project = np.arange(len(project_index))
    fitted_project = slope * x_project + intercept

    channel_upper = pd.Series(np.nan, index=df.index)
    channel_lower = pd.Series(np.nan, index=df.index)
    channel_upper.loc[project_index] = fitted_project + upper_offset
    channel_lower.loc[project_index] = fitted_project + lower_offset

    return {
        "slope": float(slope),
        "upper_offset": upper_offset,
        "lower_offset": lower_offset,
        "channel_upper": channel_upper,
        "channel_lower": channel_lower,
    }


def detect_snd_zones(
    df: pd.DataFrame,
    base_max_bars: int = 3,
    base_max_range_atr: float = 0.6,
    breakout_lookahead: int = 4,
    breakout_atr_mult: float = 1.8,
    max_zones: int = 5,
) -> list[dict]:
    """
    Find consolidation ("base") clusters immediately followed by a strong
    directional move, and label the base's price range as a supply zone
    (if the breakout was down) or demand zone (if the breakout was up).
    """
    atr = _atr(df)
    n = len(df)
    zones = []
    i = 1

    while i < n - breakout_lookahead:
        a = atr.iloc[i]
        if pd.isna(a) or a == 0:
            i += 1
            continue

        rng = df["high"].iloc[i] - df["low"].iloc[i]
        if rng > base_max_range_atr * a:
            i += 1
            continue

        base_start = i
        base_end = i
        while (
            base_end + 1 < n - breakout_lookahead
            and base_end - base_start < base_max_bars - 1
        ):
            next_a = atr.iloc[base_end + 1]
            next_rng = df["high"].iloc[base_end + 1] - df["low"].iloc[base_end + 1]
            if pd.isna(next_a) or next_rng > base_max_range_atr * next_a:
                break
            base_end += 1

        zone_top = float(df["high"].iloc[base_start : base_end + 1].max())
        zone_bottom = float(df["low"].iloc[base_start : base_end + 1].min())

        anchor_close = df["close"].iloc[base_end]
        future_close = df["close"].iloc[base_end + breakout_lookahead]
        move = future_close - anchor_close
        base_atr = atr.iloc[base_end]

        if pd.notna(base_atr) and base_atr > 0 and abs(move) >= breakout_atr_mult * base_atr:
            zone_type = "demand" if move > 0 else "supply"
            after = df.iloc[base_end + 1 :]
            touched = (after["low"] <= zone_top) & (after["high"] >= zone_bottom)
            zones.append(
                {
                    "start": _fmt_ts(df.index[base_start]),
                    "end": _fmt_ts(df.index[base_end]),
                    "start_idx": int(base_start),
                    "end_idx": int(base_end),
                    "top": zone_top,
                    "bottom": zone_bottom,
                    "type": zone_type,
                    "mitigated": bool(touched.any()),
                }
            )

        i = base_end + 1

    return zones[-max_zones:]


def active_zone(zones: list[dict]) -> dict | None:
    unmitigated = [z for z in zones if not z["mitigated"]]
    pool = unmitigated if unmitigated else zones
    return pool[-1] if pool else None


def channel_breakout_bias(df: pd.DataFrame, channel: dict) -> dict:
    """
    Use the fitted channel's boundaries as a stand-in for the "SNR" zone:
    a close beyond the channel signals a directional bias, matching the
    breakout-close rule described in the source methodology.
    """
    last_close = float(df["close"].iloc[-1])
    upper = channel["channel_upper"].dropna()
    lower = channel["channel_lower"].dropna()
    last_upper = float(upper.iloc[-1]) if not upper.empty else None
    last_lower = float(lower.iloc[-1]) if not lower.empty else None

    if last_upper is not None and last_close > last_upper:
        bias = "BUY"
    elif last_lower is not None and last_close < last_lower:
        bias = "SELL"
    else:
        bias = "NEUTRAL"

    return {
        "bias": bias,
        "last_close": last_close,
        "channel_upper": last_upper,
        "channel_lower": last_lower,
    }


def zones_nested(inner: dict | None, outer: dict | None) -> bool:
    if not inner or not outer:
        return False
    inner_mid = (inner["top"] + inner["bottom"]) / 2
    return outer["bottom"] <= inner_mid <= outer["top"]


def latest_atr(df: pd.DataFrame, period: int = 14) -> float | None:
    value = _atr(df, period).iloc[-1]
    return float(value) if pd.notna(value) else None


def compute_trade_plan(zone: dict, atr: float | None, rr_ratio: float = 2.0) -> dict | None:
    """
    A standard "SL beyond the zone, TP at a fixed risk:reward multiple"
    plan - not a prediction, just the arithmetic of a common risk-
    management rule applied to the detected zone. Returns None when
    there isn't enough information (no zone, no ATR) to compute it.
    """
    if not zone or atr is None or atr <= 0:
        return None

    buffer = 0.25 * atr

    if zone["type"] == "demand":
        direction = "BUY"
        entry = zone["top"]
        stop_loss = zone["bottom"] - buffer
        risk = entry - stop_loss
        if risk <= 0:
            return None
        take_profit = entry + rr_ratio * risk
    else:
        direction = "SELL"
        entry = zone["bottom"]
        stop_loss = zone["top"] + buffer
        risk = stop_loss - entry
        if risk <= 0:
            return None
        take_profit = entry - rr_ratio * risk

    return {
        "direction": direction,
        "entry": round(float(entry), 6),
        "stop_loss": round(float(stop_loss), 6),
        "take_profit": round(float(take_profit), 6),
        "risk_per_unit": round(float(risk), 6),
        "reward_ratio": rr_ratio,
    }


def evaluate_trade_status(trade_plan: dict, current_price: float) -> str:
    """
    Compare the live price against a computed trade plan's levels.

    WAITING     - price hasn't reached the entry zone yet
    IN_POSITION - price is past entry, between SL and TP
    TP_HIT      - take-profit level reached -> time to sell/close
    SL_HIT      - stop-loss level reached -> time to cut loss
    """
    entry = trade_plan["entry"]
    sl = trade_plan["stop_loss"]
    tp = trade_plan["take_profit"]

    if trade_plan["direction"] == "BUY":
        if current_price >= tp:
            return "TP_HIT"
        if current_price <= sl:
            return "SL_HIT"
        if current_price >= entry:
            return "IN_POSITION"
        return "WAITING"
    else:
        if current_price <= tp:
            return "TP_HIT"
        if current_price >= sl:
            return "SL_HIT"
        if current_price <= entry:
            return "IN_POSITION"
        return "WAITING"
