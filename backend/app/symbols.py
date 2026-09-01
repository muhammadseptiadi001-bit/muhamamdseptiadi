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
    # Majors
    {"symbol": "EURUSD=X", "name": "EUR/USD"},
    {"symbol": "GBPUSD=X", "name": "GBP/USD"},
    {"symbol": "USDJPY=X", "name": "USD/JPY"},
    {"symbol": "USDCHF=X", "name": "USD/CHF"},
    {"symbol": "USDCAD=X", "name": "USD/CAD"},
    {"symbol": "AUDUSD=X", "name": "AUD/USD"},
    {"symbol": "NZDUSD=X", "name": "NZD/USD"},
    # Crosses
    {"symbol": "EURGBP=X", "name": "EUR/GBP"},
    {"symbol": "EURJPY=X", "name": "EUR/JPY"},
    {"symbol": "EURCHF=X", "name": "EUR/CHF"},
    {"symbol": "EURAUD=X", "name": "EUR/AUD"},
    {"symbol": "EURCAD=X", "name": "EUR/CAD"},
    {"symbol": "GBPJPY=X", "name": "GBP/JPY"},
    {"symbol": "GBPAUD=X", "name": "GBP/AUD"},
    {"symbol": "GBPCAD=X", "name": "GBP/CAD"},
    {"symbol": "GBPCHF=X", "name": "GBP/CHF"},
    {"symbol": "AUDJPY=X", "name": "AUD/JPY"},
    {"symbol": "CADJPY=X", "name": "CAD/JPY"},
    {"symbol": "CHFJPY=X", "name": "CHF/JPY"},
    {"symbol": "NZDJPY=X", "name": "NZD/JPY"},
    # Rupiah & regional
    {"symbol": "USDIDR=X", "name": "USD/IDR"},
    {"symbol": "USDSGD=X", "name": "USD/SGD"},
    {"symbol": "USDMYR=X", "name": "USD/MYR"},
    {"symbol": "USDCNY=X", "name": "USD/CNY"},
    # Metals / commodities (traded like forex)
    {"symbol": "GC=F", "name": "Emas (Gold Futures)"},
    {"symbol": "SI=F", "name": "Perak (Silver Futures)"},
]

ALL_SYMBOLS = {item["symbol"] for item in STOCKS + FOREX}
