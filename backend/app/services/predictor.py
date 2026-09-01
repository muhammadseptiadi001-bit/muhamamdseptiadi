import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

FEATURE_COLUMNS = [
    "return_1d",
    "return_5d",
    "rsi14",
    "macd_hist",
    "close_vs_sma20",
    "close_vs_sma50",
]

MIN_ROWS_REQUIRED = 60


def _build_features(df: pd.DataFrame) -> pd.DataFrame:
    feat = pd.DataFrame(index=df.index)
    feat["return_1d"] = df["close"].pct_change(1)
    feat["return_5d"] = df["close"].pct_change(5)
    feat["rsi14"] = df["rsi14"]
    feat["macd_hist"] = df["macd_hist"]
    feat["close_vs_sma20"] = (df["close"] - df["sma20"]) / df["sma20"]
    feat["close_vs_sma50"] = (df["close"] - df["sma50"]) / df["sma50"]
    feat["target"] = (df["close"].shift(-1) > df["close"]).astype(int)
    return feat


def predict_trend(df_with_indicators: pd.DataFrame) -> dict:
    feat = _build_features(df_with_indicators)
    clean = feat.dropna(subset=FEATURE_COLUMNS)

    if len(clean) < MIN_ROWS_REQUIRED:
        return {
            "available": False,
            "reason": "Data historis belum cukup untuk membuat estimasi (minimal ~60 hari data valid).",
        }

    labeled = clean.dropna(subset=["target"])
    X = labeled[FEATURE_COLUMNS].values
    y = labeled["target"].values

    split_idx = int(len(labeled) * 0.8)
    if split_idx < 10 or len(labeled) - split_idx < 5:
        return {
            "available": False,
            "reason": "Data historis belum cukup untuk membagi data latih/uji.",
        }

    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = LogisticRegression(max_iter=1000)
    model.fit(X_train_scaled, y_train)
    backtest_accuracy = float(model.score(X_test_scaled, y_test))

    # Refit on all labeled data for the live prediction, then score the latest row.
    X_all_scaled = scaler.fit_transform(X)
    model.fit(X_all_scaled, y)

    latest_row = clean.iloc[[-1]][FEATURE_COLUMNS]
    latest_scaled = scaler.transform(latest_row.values)
    proba_up = float(model.predict_proba(latest_scaled)[0][1])

    return {
        "available": True,
        "as_of": str(clean.index[-1].date()),
        "probability_up": round(proba_up, 4),
        "probability_down": round(1 - proba_up, 4),
        "backtest_accuracy": round(backtest_accuracy, 4),
        "backtest_samples": int(len(y_test)),
        "disclaimer": (
            "Estimasi ini dihasilkan dari model statistik sederhana berbasis data historis. "
            "Akurasi backtest di atas dihitung dari data yang sudah lewat dan TIDAK menjamin "
            "hasil di masa depan. Jangan jadikan satu-satunya dasar keputusan trading."
        ),
    }
