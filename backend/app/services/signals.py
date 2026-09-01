import pandas as pd

# Rule-based technical signal aggregator, similar in spirit to the
# "Technical Summary" widgets used by TradingView/broker platforms:
# each indicator casts a BUY / SELL / NEUTRAL vote, and the votes are
# tallied into an overall verdict. This is a transparent heuristic,
# not a prediction of future price movement.

BUY = "BUY"
SELL = "SELL"
NEUTRAL = "NEUTRAL"


def _trend_vote(price: float, ma: float) -> str:
    if pd.isna(price) or pd.isna(ma):
        return NEUTRAL
    if price > ma:
        return BUY
    if price < ma:
        return SELL
    return NEUTRAL


def _rsi_vote(rsi: float) -> str:
    if pd.isna(rsi):
        return NEUTRAL
    if rsi < 30:
        return BUY
    if rsi > 70:
        return SELL
    return NEUTRAL


def _macd_vote(macd: float, signal: float) -> str:
    if pd.isna(macd) or pd.isna(signal):
        return NEUTRAL
    return BUY if macd > signal else SELL


def _stoch_vote(k: float) -> str:
    if pd.isna(k):
        return NEUTRAL
    if k < 20:
        return BUY
    if k > 80:
        return SELL
    return NEUTRAL


def _bollinger_vote(price: float, lower: float, upper: float) -> str:
    if pd.isna(price) or pd.isna(lower) or pd.isna(upper):
        return NEUTRAL
    if price < lower:
        return BUY
    if price > upper:
        return SELL
    return NEUTRAL


def technical_summary(df_with_indicators: pd.DataFrame) -> dict:
    row = df_with_indicators.iloc[-1]
    price = row["close"]

    indicators = {
        "sma20": {"label": "Harga vs SMA20", "signal": _trend_vote(price, row["sma20"])},
        "sma50": {"label": "Harga vs SMA50", "signal": _trend_vote(price, row["sma50"])},
        "ema50": {"label": "Harga vs EMA50", "signal": _trend_vote(price, row["ema50"])},
        "ema200": {"label": "Harga vs EMA200", "signal": _trend_vote(price, row["ema200"])},
        "rsi14": {"label": "RSI (14)", "signal": _rsi_vote(row["rsi14"]), "value": round(row["rsi14"], 2) if pd.notna(row["rsi14"]) else None},
        "macd": {"label": "MACD vs Signal", "signal": _macd_vote(row["macd"], row["macd_signal"])},
        "stochastic": {"label": "Stochastic %K", "signal": _stoch_vote(row["stoch_k"]), "value": round(row["stoch_k"], 2) if pd.notna(row["stoch_k"]) else None},
        "bollinger": {"label": "Posisi Bollinger Bands", "signal": _bollinger_vote(price, row["bb_lower"], row["bb_upper"])},
    }

    votes = [item["signal"] for item in indicators.values()]
    buy_count = votes.count(BUY)
    sell_count = votes.count(SELL)
    neutral_count = votes.count(NEUTRAL)
    total = len(votes)

    score = (buy_count - sell_count) / total  # -1..1

    if score >= 0.5:
        verdict = "STRONG_BUY"
    elif score >= 0.15:
        verdict = "BUY"
    elif score <= -0.5:
        verdict = "STRONG_SELL"
    elif score <= -0.15:
        verdict = "SELL"
    else:
        verdict = "NEUTRAL"

    return {
        "as_of": str(df_with_indicators.index[-1].date()),
        "indicators": indicators,
        "buy_count": buy_count,
        "sell_count": sell_count,
        "neutral_count": neutral_count,
        "score": round(score, 3),
        "verdict": verdict,
        "disclaimer": (
            "Ringkasan ini adalah agregasi aturan dari beberapa indikator teknikal umum "
            "(mirip fitur 'technical summary' di platform trading), BUKAN rekomendasi "
            "investasi maupun jaminan hasil. Selalu lakukan riset tambahan dan "
            "pertimbangkan manajemen risiko sebelum mengambil keputusan."
        ),
    }
