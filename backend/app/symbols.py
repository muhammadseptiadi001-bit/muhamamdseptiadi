STOCKS = [
    {"symbol": "BBCA.JK", "name": "Bank Central Asia"},
    {"symbol": "BBRI.JK", "name": "Bank Rakyat Indonesia"},
    {"symbol": "BMRI.JK", "name": "Bank Mandiri"},
    {"symbol": "TLKM.JK", "name": "Telkom Indonesia"},
    {"symbol": "ASII.JK", "name": "Astra International"},
    {"symbol": "UNVR.JK", "name": "Unilever Indonesia"},
    {"symbol": "GOTO.JK", "name": "GoTo Gojek Tokopedia"},
    {"symbol": "ANTM.JK", "name": "Aneka Tambang"},
]

FOREX = [
    {"symbol": "EURUSD=X", "name": "EUR/USD"},
    {"symbol": "GBPUSD=X", "name": "GBP/USD"},
    {"symbol": "USDJPY=X", "name": "USD/JPY"},
    {"symbol": "AUDUSD=X", "name": "AUD/USD"},
    {"symbol": "USDIDR=X", "name": "USD/IDR"},
]

ALL_SYMBOLS = {item["symbol"] for item in STOCKS + FOREX}
