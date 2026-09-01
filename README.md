# Dashboard Analisa Saham & Forex

Dashboard edukasi untuk melihat harga saham (IDX) dan forex, lengkap dengan
indikator teknikal (SMA, RSI, MACD) dan estimasi kecenderungan tren berbasis
model statistik sederhana.

> **Bukan alat jaminan profit.** Estimasi tren dihasilkan dari model statistik
> berbasis data historis dan tidak menjamin hasil di masa depan. Gunakan
> sebagai bahan belajar, bukan satu-satunya dasar keputusan trading.

## Struktur project

- `backend/` — API FastAPI (Python) yang mengambil data lewat `yfinance`,
  menghitung indikator teknikal, dan menghasilkan estimasi tren.
- `frontend/` — Dashboard React (Vite) yang menampilkan chart harga,
  indikator, dan panel estimasi tren.

## Menjalankan backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend berjalan di `http://localhost:8000`.

## Menjalankan frontend

```bash
cd frontend
npm install
cp .env.example .env          # sesuaikan VITE_API_BASE_URL jika perlu
npm run dev
```

Frontend berjalan di `http://localhost:5173`.

## Catatan

- Sumber data harga menggunakan Yahoo Finance lewat library `yfinance`
  (gratis, tanpa API key, namun ada keterbatasan rate-limit).
- Simbol saham memakai format IDX (contoh: `BBCA.JK`), simbol forex memakai
  format Yahoo Finance (contoh: `EURUSD=X`).
