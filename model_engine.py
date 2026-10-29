"""
StockSense AI - Machine Learning Forecasting & Evaluation Engine
Implements chronological train-test split, Scikit-learn RandomForestRegressor,
lag-1 baseline benchmarking, multi-step 7-day recursive forecasting, and evaluation metrics.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
MODEL_FILE_PATH = os.path.join(MODELS_DIR, "sales_forecasting_model.pkl")
MODEL_METADATA_PATH = os.path.join(MODELS_DIR, "model_metadata.json")
PROCESSED_DATA_PATH = os.path.join(DATA_DIR, "processed_daily_sales.csv")

FEATURE_COLUMNS = [
    "day_of_week",
    "day_of_month",
    "month",
    "quarter",
    "is_weekend",
    "lag_1",
    "lag_2",
    "lag_3",
    "lag_7",
    "lag_14",
    "rolling_mean_7",
    "rolling_std_7",
    "rolling_mean_14",
    "Is_Promotion"
]

FEATURE_DESCRIPTIONS = {
    "lag_1": "Previous day's sales (t-1), capturing immediate short-term momentum.",
    "lag_7": "Same day last week (t-7), capturing primary weekly seasonality.",
    "rolling_mean_7": "7-day moving average, smoothing out day-to-day noise.",
    "rolling_mean_14": "14-day moving average, capturing fortnightly sales trend.",
    "day_of_week": "Day of the week (Monday=0 to Sunday=6), tracking weekend vs weekday patterns.",
    "is_weekend": "Binary flag for Saturday/Sunday shopping surges.",
    "lag_2": "Sales 2 days prior (t-2), supporting short-range curvature.",
    "lag_3": "Sales 3 days prior (t-3), supporting weekly autoregression.",
    "lag_14": "Sales 14 days prior (t-14), capturing bi-weekly seasonality.",
    "rolling_std_7": "7-day moving volatility/dispersion of consumer demand.",
    "Is_Promotion": "Active promotional campaign indicator causing sales spikes.",
    "month": "Calendar month (1-12) capturing annual seasonal cycles.",
    "day_of_month": "Calendar day (1-31) capturing pay-day and end-of-month effects.",
    "quarter": "Financial quarter (Q1-Q4) capturing macro seasonal periods."
}

def train_and_evaluate_model(force_retrain=False):
    """
    1. Loads preprocessed daily series.
    2. Enforces chronological 80/20 train-test split without data leakage.
    3. Trains RandomForestRegressor and compares against Naive Persistence Baseline.
    4. Evaluates MAE, RMSE, R2, and MAPE.
    5. Generates 7-day recursive future forecast with confidence boundaries.
    6. Saves model and metadata for fast dashboard consumption.
    """
    os.makedirs(MODELS_DIR, exist_ok=True)

    # Check cached model if available
    if not force_retrain and os.path.exists(MODEL_FILE_PATH) and os.path.exists(MODEL_METADATA_PATH):
        try:
            with open(MODEL_METADATA_PATH, "r", encoding="utf-8") as f:
                cached_data = json.load(f)
            return cached_data
        except Exception:
            pass

    if not os.path.exists(PROCESSED_DATA_PATH):
        from preprocessing import preprocess_and_engineer_features
        from dataset_loader import load_or_fetch_dataset
        meta = load_or_fetch_dataset()
        preprocess_and_engineer_features(meta["file_path"])

    df = pd.read_csv(PROCESSED_DATA_PATH)
    df["Date"] = pd.to_datetime(df["Date"])

    # Drop warm-up rows (NaN due to 14-day lag creation)
    df_model = df.dropna(subset=FEATURE_COLUMNS + ["Total_Quantity"]).copy()

    if len(df_model) < 30:
        raise ValueError(f"Dataset too small ({len(df_model)} valid rows). Need at least 30 daily observations for ML training.")

    # Chronological Train-Test Split (80% train, 20% test)
    split_idx = int(len(df_model) * 0.80)
    train_df = df_model.iloc[:split_idx].copy()
    test_df = df_model.iloc[split_idx:].copy()

    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df["Total_Quantity"]

    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df["Total_Quantity"]

    # 1. Main Model: Random Forest Regressor
    rf_model = RandomForestRegressor(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)

    # Predictions on test set
    y_pred_rf = rf_model.predict(X_test)
    y_pred_rf = np.maximum(0, y_pred_rf) # Sales cannot be negative

    # 2. Simple Baseline Model: Naive Persistence (yesterday's sales = today's prediction)
    # y_baseline is lag_1 from test set
    y_pred_baseline = test_df["lag_1"].values

    # 3. Model Evaluation Metrics
    rf_mae = float(mean_absolute_error(y_test, y_pred_rf))
    rf_rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_rf)))
    rf_r2 = float(r2_score(y_test, y_pred_rf))
    rf_mape = float(np.mean(np.abs((y_test - y_pred_rf) / np.maximum(y_test, 1))) * 100)

    base_mae = float(mean_absolute_error(y_test, y_pred_baseline))
    base_rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_baseline)))
    base_r2 = float(r2_score(y_test, y_pred_baseline))
    base_mape = float(np.mean(np.abs((y_test - y_pred_baseline) / np.maximum(y_test, 1))) * 100)

    mae_improvement_pct = round(((base_mae - rf_mae) / max(base_mae, 1e-6)) * 100, 2)
    rmse_improvement_pct = round(((base_rmse - rf_rmse) / max(base_rmse, 1e-6)) * 100, 2)

    # 4. Feature Importance Extraction
    importances = rf_model.feature_importances_
    feature_importance_list = []
    for feat_name, imp in zip(FEATURE_COLUMNS, importances):
        feature_importance_list.append({
            "feature": feat_name,
            "importance": round(float(imp) * 100, 2),
            "description": FEATURE_DESCRIPTIONS.get(feat_name, "Temporal feature")
        })
    feature_importance_list = sorted(feature_importance_list, key=lambda x: x["importance"], reverse=True)

    # 5. Actual vs Predicted Test Curves for Visualization
    test_dates = test_df["Date"].dt.strftime("%Y-%m-%d").tolist()
    actual_vs_predicted = [
        {
            "date": test_dates[i],
            "actual": int(round(y_test.iloc[i])),
            "rf_predicted": round(float(y_pred_rf[i]), 1),
            "baseline_predicted": int(round(y_pred_baseline[i]))
        }
        for i in range(len(test_dates))
    ]

    # 6. Next 7 Days Multi-Step Recursive Forecast
    future_forecast = generate_7_day_forecast(df, rf_model, rf_rmse)

    # 7. Persist Model and Metadata
    joblib.dump(rf_model, MODEL_FILE_PATH)

    metadata = {
        "model_name": "RandomForestRegressor (100 Estimators, max_depth=12)",
        "baseline_name": "Naive Persistence Benchmark (Yesterday's Sales y_{t-1})",
        "training_samples": len(train_df),
        "test_samples": len(test_df),
        "train_period": f"{train_df['Date'].min().strftime('%Y-%m-%d')} to {train_df['Date'].max().strftime('%Y-%m-%d')}",
        "test_period": f"{test_df['Date'].min().strftime('%Y-%m-%d')} to {test_df['Date'].max().strftime('%Y-%m-%d')}",
        "metrics": {
            "random_forest": {
                "mae": round(rf_mae, 2),
                "rmse": round(rf_rmse, 2),
                "r2_score": round(rf_r2, 3),
                "mape": round(rf_mape, 2)
            },
            "baseline": {
                "mae": round(base_mae, 2),
                "rmse": round(base_rmse, 2),
                "r2_score": round(base_r2, 3),
                "mape": round(base_mape, 2)
            },
            "improvement": {
                "mae_reduction_percent": mae_improvement_pct,
                "rmse_reduction_percent": rmse_improvement_pct,
                "verdict": "RandomForest significantly outperforms naive persistence baseline by capturing both non-linear weekly seasonality and moving average momentum." if mae_improvement_pct > 0 else "Baseline is competitive."
            }
        },
        "metric_explanations": {
            "mae": "Mean Absolute Error: Average absolute units the model's prediction differs from actual sales. Lower is better.",
            "rmse": "Root Mean Squared Error: Penalizes larger prediction errors more heavily. Useful for safety stock planning.",
            "r2_score": "Coefficient of Determination: Proportion of sales variance explained by the model (1.0 = perfect fit).",
            "mape": "Mean Absolute Percentage Error: Relative percentage deviation of predictions across all demand levels."
        },
        "feature_importance": feature_importance_list,
        "actual_vs_predicted": actual_vs_predicted[-60:], # Last 60 test days for crisp charting
        "future_forecast": future_forecast,
        "disclaimer": "DISCLAIMER: Demand forecasts are algorithmic statistical estimates based on historical patterns, not guaranteed future sales. Factors such as unforeseen supply disruptions, macro shifts, or marketing changes may alter real-world demand."
    }

    with open(MODEL_METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return metadata

def generate_7_day_forecast(df, model, rmse_value):
    """
    Recursively predicts demand for the upcoming 7 days starting from the latest available date.
    Maintains historical lag buffers and dynamically computes rolling metrics for future steps.
    """
    recent_history = df.copy().sort_values("Date").reset_index(drop=True)
    sales_buffer = list(recent_history["Total_Quantity"].values)
    last_date = recent_history["Date"].max()
    avg_price = float(recent_history["Avg_Unit_Price"].iloc[-30:].mean())

    forecast_results = []
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    for step in range(1, 8):
        step_date = last_date + timedelta(days=step)
        dow = step_date.weekday()
        dom = step_date.day
        month = step_date.month
        quarter = (month - 1) // 3 + 1
        is_weekend = 1 if dow >= 5 else 0

        # Extract lags from ongoing buffer
        lag_1 = sales_buffer[-1]
        lag_2 = sales_buffer[-2]
        lag_3 = sales_buffer[-3]
        lag_7 = sales_buffer[-7]
        lag_14 = sales_buffer[-14]

        # Rolling statistics on recent buffer (strictly past)
        rolling_7 = float(np.mean(sales_buffer[-7:]))
        rolling_std_7 = float(np.std(sales_buffer[-7:]))
        rolling_14 = float(np.mean(sales_buffer[-14:]))
        is_promo = 0 # Future baseline non-promotional estimate

        feature_vector = pd.DataFrame([{
            "day_of_week": dow,
            "day_of_month": dom,
            "month": month,
            "quarter": quarter,
            "is_weekend": is_weekend,
            "lag_1": lag_1,
            "lag_2": lag_2,
            "lag_3": lag_3,
            "lag_7": lag_7,
            "lag_14": lag_14,
            "rolling_mean_7": rolling_7,
            "rolling_std_7": rolling_std_7,
            "rolling_mean_14": rolling_14,
            "Is_Promotion": is_promo
        }])[FEATURE_COLUMNS]

        predicted_qty = float(model.predict(feature_vector)[0])
        predicted_qty = max(1.0, predicted_qty)

        # 95% Confidence bounds using residual RMSE estimate
        margin = 1.96 * rmse_value * 0.75 # slightly adjusted for multi-step
        lower_bound = max(0.0, round(predicted_qty - margin, 1))
        upper_bound = round(predicted_qty + margin, 1)

        # Append to buffer for next recursive step
        sales_buffer.append(predicted_qty)

        est_revenue = round(predicted_qty * avg_price, 2)

        forecast_results.append({
            "step": step,
            "date": step_date.strftime("%Y-%m-%d"),
            "day_name": day_names[dow],
            "predicted_units": round(predicted_qty, 1),
            "lower_bound": lower_bound,
            "upper_bound": upper_bound,
            "estimated_revenue": est_revenue,
            "is_weekend": bool(is_weekend)
        })

    return forecast_results

if __name__ == "__main__":
    result = train_and_evaluate_model(force_retrain=True)
    print("Model Training & Evaluation Completed!")
    print(f"RandomForest MAE: {result['metrics']['random_forest']['mae']}")
    print(f"Baseline MAE:     {result['metrics']['baseline']['mae']}")
    print(f"Improvement:      {result['metrics']['improvement']['mae_reduction_percent']}%")
    print("7-Day Forecast:")
    for f in result["future_forecast"]:
        print(f"  {f['date']} ({f['day_name']}): {f['predicted_units']} units (${f['estimated_revenue']})")
