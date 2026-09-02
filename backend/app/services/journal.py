"""
Signal journal: a persistent record of BRG/EMA trade signals logged when
the user stars a symbol, later auto-resolved against live price so the
user can see - with real numbers, not a guess - which method has actually
been more accurate for which symbol.

This does NOT feed back into the BRG/EMA rules themselves. Auto-tuning a
rule-based strategy's own parameters from its own recent track record is
prone to overfitting (it just gets good at fitting the past). The value
here is honest bookkeeping the user can read, not a self-modifying model.
"""

import os
import sqlite3
from datetime import datetime, timezone

from .data import fetch_history
from . import brg as brg_service

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "journal.db")

VALID_METHODS = ("BRG", "EMA")
VALID_DIRECTIONS = ("BUY", "SELL")
OPEN_STATUSES = ("WAITING", "IN_POSITION")
RESOLVED_STATUSES = ("TP_HIT", "SL_HIT")


def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with _conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS signals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                method TEXT NOT NULL,
                timeframe TEXT NOT NULL,
                direction TEXT NOT NULL,
                entry REAL NOT NULL,
                stop_loss REAL NOT NULL,
                take_profit REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'WAITING',
                created_at TEXT NOT NULL,
                resolved_at TEXT
            )
            """
        )


init_db()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def log_signal(
    symbol: str,
    method: str,
    timeframe: str,
    direction: str,
    entry: float,
    stop_loss: float,
    take_profit: float,
) -> int:
    """Insert a new signal, unless an identical open one already exists
    (so re-starring a symbol that already has an active logged setup
    doesn't spam duplicate rows)."""
    with _conn() as conn:
        existing = conn.execute(
            """
            SELECT id FROM signals
            WHERE symbol = ? AND method = ? AND direction = ?
              AND entry = ? AND stop_loss = ? AND take_profit = ?
              AND status IN ('WAITING', 'IN_POSITION')
            """,
            (symbol, method, direction, entry, stop_loss, take_profit),
        ).fetchone()
        if existing:
            return existing["id"]

        cursor = conn.execute(
            """
            INSERT INTO signals
                (symbol, method, timeframe, direction, entry, stop_loss, take_profit, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'WAITING', ?)
            """,
            (symbol, method, timeframe, direction, entry, stop_loss, take_profit, _now()),
        )
        return cursor.lastrowid


def _latest_price(symbol: str) -> float | None:
    try:
        df = fetch_history(symbol, period="5d", interval="15m")
        if df.empty:
            return None
        return float(df["close"].iloc[-1])
    except Exception:
        return None


def resolve_open_signals() -> None:
    """Re-check every open (WAITING/IN_POSITION) signal against the
    latest price and update its status if it has since hit TP or SL."""
    with _conn() as conn:
        open_rows = conn.execute(
            "SELECT * FROM signals WHERE status IN ('WAITING', 'IN_POSITION')"
        ).fetchall()

        price_cache: dict[str, float | None] = {}
        for row in open_rows:
            symbol = row["symbol"]
            if symbol not in price_cache:
                price_cache[symbol] = _latest_price(symbol)
            price = price_cache[symbol]
            if price is None:
                continue

            trade_plan = {
                "direction": row["direction"],
                "entry": row["entry"],
                "stop_loss": row["stop_loss"],
                "take_profit": row["take_profit"],
            }
            new_status = brg_service.evaluate_trade_status(trade_plan, price)
            if new_status != row["status"]:
                resolved_at = _now() if new_status in RESOLVED_STATUSES else None
                conn.execute(
                    "UPDATE signals SET status = ?, resolved_at = ? WHERE id = ?",
                    (new_status, resolved_at, row["id"]),
                )


def list_signals(symbol: str | None = None, method: str | None = None, limit: int = 200) -> list[dict]:
    query = "SELECT * FROM signals WHERE 1=1"
    params: list = []
    if symbol:
        query += " AND symbol = ?"
        params.append(symbol)
    if method:
        query += " AND method = ?"
        params.append(method)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)

    with _conn() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(row) for row in rows]


def compute_stats() -> dict:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT * FROM signals WHERE status IN ('TP_HIT', 'SL_HIT')"
        ).fetchall()

    def _empty():
        return {"wins": 0, "losses": 0, "total": 0, "win_rate": None}

    overall = {method: _empty() for method in VALID_METHODS}
    by_symbol: dict[tuple, dict] = {}

    for row in rows:
        method = row["method"]
        won = row["status"] == "TP_HIT"
        bucket = overall.setdefault(method, _empty())
        bucket["wins" if won else "losses"] += 1
        bucket["total"] += 1

        key = (row["symbol"], method)
        sym_bucket = by_symbol.setdefault(key, _empty())
        sym_bucket["wins" if won else "losses"] += 1
        sym_bucket["total"] += 1

    for bucket in overall.values():
        if bucket["total"] > 0:
            bucket["win_rate"] = round(100 * bucket["wins"] / bucket["total"], 1)

    by_symbol_list = []
    for (symbol, method), bucket in by_symbol.items():
        if bucket["total"] > 0:
            bucket["win_rate"] = round(100 * bucket["wins"] / bucket["total"], 1)
        by_symbol_list.append({"symbol": symbol, "method": method, **bucket})
    by_symbol_list.sort(key=lambda x: x["total"], reverse=True)

    return {"overall": overall, "by_symbol": by_symbol_list}
