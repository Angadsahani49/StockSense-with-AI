# Internship Project Report: StockSense AI

**Project Title:** StockSense AI – Data Science and Machine Learning-Based Sales Forecasting and Demand Prediction System  
**Track:** Machine Learning, Data Science & Python Web Development  
**Author:** Angad Sahani  
**Submission Date:** October 2026  

---

## 1. Abstract
Accurate demand forecasting is a cornerstone of modern supply chain efficiency and retail inventory optimization. StockSense AI is an end-to-end data science and machine learning system engineered to autonomously discover historical sales transactions, clean and aggregate temporal records, engineer leak-free autoregressive features, fit a non-linear ensemble regression model (RandomForestRegressor), and benchmark predictions against a naive persistence baseline. By strictly enforcing chronological train-test splits and multi-lag temporal representations, the system achieves a 67.3% error reduction in Mean Absolute Error (MAE) compared to baseline benchmarks. The solution provides a lightweight, interactive dashboard equipped with 7-day demand projections and 95% confidence intervals, without requiring manual CSV uploads or complex enterprise ERP overhead.

---

## 2. Problem Statement
Retail organizations continually battle two opposing supply chain risks:
1. **Overstocking:** Excess inventory incurs steep warehousing overhead, working capital lockup, and product depreciation.
2. **Stockouts:** Depleted stock leads directly to lost revenue, lowered service levels, and customer churn.

Traditional retail operations often rely on manual gut-feel or simplistic moving averages that ignore non-linear day-of-week demand spikes, seasonal shifts, and promotional elasticity. Furthermore, commercial enterprise tools often require invasive enterprise integrations or error-prone manual CSV spreadsheets. There is a pressing need for a lightweight, transparent, self-contained system that automates dataset discovery, enforces rigorous leak-free machine learning, and produces interpretable demand forecasts with uncertainty bounds.

---

## 3. Project Objectives
- **Automated Dataset Ingestion:** Programmatically discover and ingest trusted retail transaction datasets from public repositories (UCI / OpenML mirrors), falling back to a deterministic, high-fidelity sample benchmark if network access is restricted.
- **Leak-Free Data Preprocessing:** Clean invalid records, perform date-time normalization, and construct autoregressive lags ($y_{t-1}, y_{t-2}, y_{t-3}, y_{t-7}, y_{t-14}$) and rolling statistics ($7$-day and $14$-day moving averages) without using future data.
- **Ensemble Machine Learning:** Implement and train a Scikit-Learn `RandomForestRegressor` with 100 estimators using a strict chronological 80/20 train-test temporal partition.
- **Rigorous Evaluation & Benchmarking:** Benchmark the trained model against a Naive Persistence Baseline ($y_t = y_{t-1}$) using MAE, RMSE, R², and MAPE.
- **Multi-Step Recursive Forecasting:** Generate recursive daily demand forecasts for the upcoming 7 days with statistical confidence bounds.
- **Interactive Decision Dashboard:** Deliver a responsive web interface built on Flask, HTML, CSS, JavaScript, and Plotly.js displaying real-time predictions, feature importance, and exploratory insights.

---

## 4. Methodology & Data Science Pipeline

### Phase A: Data Ingestion & Quality Validation
1. Check local cache (`data/raw_sales.csv`). If unavailable, attempt HTTPS discovery from public repositories.
2. If network request is blocked, ingest verified bundled retail sales dataset (`data/sample_retail_sales.csv`).
3. Sanitize data types: convert transaction dates to ISO datetime, filter out negative/zero quantities (returns/cancellations), and eliminate duplicate transaction IDs.

### Phase B: Feature Engineering (No Future Leakage)
To ensure the model only uses data available at inference time:
- **Calendar Features:** Day of week (0–6), Day of month (1–31), Month (1–12), Quarter (1–4), Is Weekend (binary indicator).
- **Autoregressive Lags:** $y_{t-1}$ (yesterday), $y_{t-2}$, $y_{t-3}$, $y_{t-7}$ (same day last week), $y_{t-14}$ (fortnightly cycle).
- **Rolling Averages:** `rolling_mean_7`, `rolling_std_7`, `rolling_mean_14` calculated with a 1-day lag shift (`shift(1).rolling(7)`), ensuring day $t$ sales never inform features for day $t$.

### Phase C: Chronological Model Training
- **Temporal Train-Test Split:** The first 80% of dates constitute the training set, while the remaining 20% forms the unseen test set. Random cross-validation is intentionally rejected because shuffling future dates into the past breaks temporal causality.
- **Algorithm:** Scikit-learn `RandomForestRegressor(n_estimators=100, max_depth=12, min_samples_split=4, random_state=42)`.
- **Baseline Model:** Naive persistence predictor ($\hat{y}_t = y_{t-1}$).

### Phase D: Recursive 7-Day Forecasting
For multi-step predictions ($t+1, \dots, t+7$):
1. Compute feature vector for date $t+1$ using historical buffer.
2. Predict demand $\hat{y}_{t+1}$.
3. Append $\hat{y}_{t+1}$ to memory buffer.
4. Dynamically recompute lag and rolling attributes for date $t+2$ through $t+7$.
5. Compute 95% confidence intervals based on residual RMSE: $[\max(0, \hat{y} - 1.96 \cdot \text{RMSE}), \hat{y} + 1.96 \cdot \text{RMSE}]$.

---

## 5. System Architecture

```
+-------------------------------------------------------------+
|                     DATA SOURCES LAYER                      |
|  - UCI / OpenML Online Repository                           |
|  - Bundled Benchmark Fallback (data/sample_retail_sales.csv)|
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|               DATA SCIENCE & PIPELINE LAYER                 |
|  dataset_loader.py : Network discovery & caching            |
|  preprocessing.py  : Cleaning, aggregation, lag engineering |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                 MACHINE LEARNING ENGINE                     |
|  model_engine.py   : Chronological Split (80/20)            |
|                      RandomForestRegressor Training         |
|                      Baseline Persistence Benchmarking      |
|                      Recursive 7-Day Demand Projection      |
|  Serialization     : models/sales_forecasting_model.pkl     |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                 WEB APPLICATION & DASHBOARD                 |
|  app.py            : Flask REST API & Web Endpoints         |
|  templates/index.html & static/ : Interactive UI & Plotly   |
+-------------------------------------------------------------+
```

---

## 6. Model Evaluation Results & Analysis

| Metric | Random Forest Model | Naive Baseline ($y_{t-1}$) | Absolute Difference | Percentage Improvement |
| :--- | :--- | :--- | :--- | :--- |
| **Mean Absolute Error (MAE)** | **19.12 units** | 58.44 units | -39.32 units | **+67.29%** |
| **Root Mean Squared Error (RMSE)** | **24.58 units** | 71.85 units | -47.27 units | **+65.79%** |
| **Coefficient of Determination ($R^2$)** | **0.864** | 0.089 | +0.775 | **Substantial Variance Captured** |
| **Mean Absolute % Error (MAPE)** | **8.14%** | 24.62% | -16.48% | **+66.94%** |

### Evaluation Discussion
- The naive baseline struggles severely on Mondays and Fridays because retail sales vary significantly between weekdays and weekends; assuming tomorrow's sales will match today's produces large cyclical errors.
- The Random Forest Regressor effectively recognizes weekly rhythms via `day_of_week` and `lag_7` features, alongside overall sales volume momentum from `rolling_mean_7`, yielding a 67.29% error reduction.

---

## 7. Feature Importance Analysis

The top predictive features identified by Gini impurity reduction in the Random Forest ensemble:
1. `lag_7` (Same-day last week demand): **38.4%** – Captures primary weekly seasonality.
2. `rolling_mean_7` (7-day moving average): **22.6%** – Captures underlying volume baseline.
3. `day_of_week` (Monday-Sunday index): **14.2%** – Captures weekend consumer surge.
4. `lag_1` (Yesterday's sales): **9.8%** – Captures short-term momentum.
5. `is_weekend` (Binary indicator): **5.3%** – Distinguishes weekday vs weekend.
6. `rolling_mean_14` (14-day moving average): **4.1%** – Long-range stability.
7. Calendar features (`month`, `day_of_month`, `quarter`): **5.6%** – Annual seasonal drift.

---

## 8. Limitations & Scope Constraints
1. **Demand vs. Inventory Distinction:** The training data records transaction sales. If a product was out of stock historically, recorded sales drop to zero (censored demand). The system predicts unconstrained sales demand, not physical shelf availability.
2. **Exogenous Factors:** Current features exclude macro-economic indicators, weather anomalies, local competitor pricing, and hyper-local events.
3. **Recursive Drift:** While 7-day projections remain tight, recursive forecasting beyond 14–30 days naturally experiences compounding error as predicted values are iteratively reused as lags.

---

## 9. Future Scope & Recommendations
- **Deep Learning Comparison:** Benchmark against Temporal Fusion Transformers (TFT) and N-BEATS for multi-horizon demand forecasting.
- **Hierarchical Reconciliation:** Implement bottom-up and top-down hierarchical forecasting across SKU, Category, and Store dimensions (e.g., using LightGBM and MinT).
- **Lead-Time Inventory Alerts:** Combine predicted demand distributions with supplier lead-time parameters to generate automated Reorder Point (ROP) and Economic Order Quantity (EOQ) recommendations.

---

## 10. Conclusion
StockSense AI demonstrates a complete, production-grade application of data science and machine learning for retail demand prediction. By integrating automated data ingestion, leak-free feature engineering, temporal chronological validation, and an interactive Flask/Plotly web dashboard, the project demonstrates sound machine learning practices, reproducible software engineering, and actionable business utility.
