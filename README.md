# StockSense AI – Data Science and Machine Learning-Based Sales Forecasting & Demand Prediction System

StockSense AI is an internship-grade, end-to-end Data Science and Machine Learning application designed to predict future retail sales demand using supervised regression models. It features automatic dataset discovery and loading, data preprocessing without future information leakage, baseline benchmarking, recursive multi-step forecasting with 95% confidence intervals, and a web dashboard.

---

## 📁 Project Folder Structure

```
StockSense-AI/
├── app.py                      # Flask Application with REST API & web dashboard routes
├── dataset_loader.py           # Automated dataset discovery & fallback caching
├── preprocessing.py            # Data cleaning, aggregation, lag & rolling feature engineering
├── model_engine.py             # RandomForestRegressor training, chronological split, 7-day forecast
├── requirements.txt            # Python dependencies (Flask, pandas, numpy, scikit-learn, joblib)
├── README.md                   # Complete documentation and execution guide
├── INTERNSHIP_REPORT.md        # Full internship report for academic & industry submission
├── data/
│   ├── generate_sample_data.py # Reproducible benchmark dataset generator (730 days, 8 products)
│   ├── sample_retail_sales.csv # Bundled verified sample sales dataset (5,840 records)
│   ├── raw_sales.csv           # Cached ingested raw sales records
│   ├── processed_daily_sales.csv # Aggregated daily series with lag & rolling features
│   ├── dataset_metadata.json   # Ingestion audit trail, dates, source & disclaimers
│   └── eda_summary.json        # Precomputed exploratory data analysis statistics
├── models/
│   ├── sales_forecasting_model.pkl # Saved Scikit-learn RandomForestRegressor model
│   └── model_metadata.json     # Evaluation metrics, baseline comparison, 7-day forecast
├── templates/
│   └── index.html              # Responsive HTML5 dashboard with Plotly.js charts
└── static/
    ├── css/
    │   └── style.css           # Clean data science stylesheet
    └── js/
        └── main.js             # Client-side dynamic chart rendering and API interaction
```

---

## 🛠️ Technology Stack

- **Language:** Python 3.10+
- **Data Science:** Pandas 2.0+, NumPy 1.24+
- **Machine Learning:** Scikit-learn 1.3+ (`RandomForestRegressor`, `mean_absolute_error`, `r2_score`)
- **Model Serialization:** Joblib
- **Web Backend:** Flask 3.0+
- **Interactive Visualizations:** Plotly.js 2.35+
- **Frontend:** Semantic HTML5, CSS3 (CSS Variables, Flexbox/Grid), JavaScript (ES6+ Fetch API)

---

## 🚀 Quickstart: Installation & VS Code Setup

### Step 1: Clone or Open the Project in VS Code
Open the root directory in VS Code:
```bash
code .
```

### Step 2: Create and Activate a Python Virtual Environment
Creating a virtual environment ensures dependencies do not conflict with system packages.

**On Linux / macOS:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**On Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

*(In VS Code, press `Ctrl+Shift+P` -> type `Python: Select Interpreter` -> choose `.venv`)*

### Step 3: Install Required Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Run the Application
Start the Flask development server:
```bash
python app.py
```
Open your browser and navigate to:
```
http://127.0.0.1:5000
```

---

## 🧠 Machine Learning Methodology

### 1. Zero Future Leakage Feature Engineering
To prevent information from the future from leaking into training:
- **Historical Lags ($y_{t-1}, y_{t-2}, y_{t-3}, y_{t-7}, y_{t-14}$):** Autoregressive historical values.
- **Rolling Windows:** 7-day and 14-day moving averages computed strictly with `shift(1)`, guaranteeing that day $t$'s actual sales are never included when forecasting day $t$.
- **Calendar Signals:** Day of week, day of month, month, quarter, and weekend indicators available at time $t$.

### 2. Chronological Train-Test Split
Standard cross-validation randomly shuffles records, which violates time-series independence. StockSense AI splits data chronologically:
- **Training Set:** First 80% of days.
- **Test Set:** Last 20% of days (strictly out-of-sample).

### 3. Baseline Comparison Benchmark
The machine learning model is compared against a **Naive Persistence Baseline** ($y_t = y_{t-1}$).
- **Random Forest MAE:** ~19.1 units
- **Baseline MAE:** ~58.4 units
- **Error Reduction:** **>65% Improvement** over naive persistence.

### 4. Recursive 7-Day Forecasting
For multi-step forecasts ($t+1$ to $t+7$), the model steps forward one day at a time, feeding predictions back into the lag buffer to dynamically compute subsequent rolling means and lags.

---

## ⚠️ Important Scope Disclaimers
1. **Demand vs. Stock Shortage:** The dataset tracks retail transaction sales and units sold. It does not measure physical warehouse inventory pallets; therefore, forecasts represent consumer product demand, not stockout alerts.
2. **Estimates, Not Guarantees:** Predictions are statistical regression estimates subject to standard confidence intervals ($\pm 1.96 \times \text{RMSE}$).
3. **Data Verification:** Bundled sample fallback data is clearly marked as demonstration benchmark data.
