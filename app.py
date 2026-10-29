"""
StockSense AI - Flask Web Application
Data Science & Machine Learning-Based Sales Forecasting and Demand Prediction System
Serves the web dashboard, interactive analytics, and REST API endpoints.
"""

import os
import json
from flask import Flask, render_template, jsonify, request
from dataset_loader import load_or_fetch_dataset
from preprocessing import preprocess_and_engineer_features
from model_engine import train_and_evaluate_model, MODEL_METADATA_PATH, PROCESSED_DATA_PATH

app = Flask(__name__)

# Ensure pipeline is initialized on startup
def initialize_pipeline():
    print("--- StockSense AI Startup Initialization ---")
    meta = load_or_fetch_dataset()
    print(f"Dataset status: {meta['source']} (Cached: {meta.get('cached', False)})")
    
    if not os.path.exists(PROCESSED_DATA_PATH):
        print("Preprocessing raw data...")
        preprocess_and_engineer_features(meta["file_path"])
        
    if not os.path.exists(MODEL_METADATA_PATH):
        print("Training RandomForest model & computing baseline...")
        train_and_evaluate_model()
    print("StockSense AI ready.")

# Initialize on module load
try:
    initialize_pipeline()
except Exception as e:
    print(f"Warning during pipeline initialization: {e}")

@app.route("/")
def index():
    """Renders the primary responsive web dashboard."""
    return render_template("index.html")

@app.route("/api/status", methods=["GET"])
def api_status():
    """Returns dataset freshness, source, and audit trail."""
    try:
        meta = load_or_fetch_dataset()
        return jsonify({"status": "success", "data": meta})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/overview", methods=["GET"])
def api_overview():
    """Returns exploratory data analysis metrics, top products, and monthly patterns."""
    eda_path = os.path.join(os.path.dirname(__file__), "data", "eda_summary.json")
    if not os.path.exists(eda_path):
        meta = load_or_fetch_dataset()
        preprocess_and_engineer_features(meta["file_path"])
    
    with open(eda_path, "r", encoding="utf-8") as f:
        eda = json.load(f)
    return jsonify({"status": "success", "data": eda})

@app.route("/api/forecast", methods=["GET"])
def api_forecast():
    """Returns the 7-day recursive demand forecast and actual vs predicted validation curve."""
    try:
        model_meta = train_and_evaluate_model()
        return jsonify({
            "status": "success",
            "forecast": model_meta["future_forecast"],
            "actual_vs_predicted": model_meta["actual_vs_predicted"],
            "disclaimer": model_meta["disclaimer"]
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/metrics", methods=["GET"])
def api_metrics():
    """Returns MAE, RMSE, Baseline comparison and feature importances."""
    try:
        model_meta = train_and_evaluate_model()
        return jsonify({
            "status": "success",
            "metrics": model_meta["metrics"],
            "explanations": model_meta["metric_explanations"],
            "feature_importance": model_meta["feature_importance"],
            "training_samples": model_meta["training_samples"],
            "test_samples": model_meta["test_samples"],
            "train_period": model_meta["train_period"],
            "test_period": model_meta["test_period"]
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/retrain", methods=["POST"])
def api_retrain():
    """Force re-fetches or reloads data and retrains the model."""
    try:
        meta = load_or_fetch_dataset(force_refresh=True)
        preprocess_and_engineer_features(meta["file_path"])
        model_meta = train_and_evaluate_model(force_retrain=True)
        return jsonify({
            "status": "success",
            "message": "Dataset re-ingested and Machine Learning model retrained successfully.",
            "metrics": model_meta["metrics"]
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    # Local development server
    port = int(os.environ.get("FLASK_PORT", 5000))
    print(f"Starting StockSense AI Flask server on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
