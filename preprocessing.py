"""
StockSense AI - Data Science & Preprocessing Pipeline
Performs data quality validation, missing value handling, temporal daily aggregation,
exploratory data analysis (EDA), product stock inventory tracking, and price history intelligence.
"""

import os
import json
import pandas as pd
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
PROCESSED_DATA_PATH = os.path.join(DATA_DIR, "processed_daily_sales.csv")
EDA_SUMMARY_PATH = os.path.join(DATA_DIR, "eda_summary.json")

# Product inventory master config (stock on hand & reorder points)
STOCK_CATALOG_CONFIG = {
    "PRD-101": {"stock": 420, "reorder_point": 150, "lead_time_days": 4},
    "PRD-102": {"stock": 310, "reorder_point": 120, "lead_time_days": 3},
    "PRD-103": {"stock": 140, "reorder_point": 80,  "lead_time_days": 7},
    "PRD-104": {"stock": 580, "reorder_point": 200, "lead_time_days": 2},
    "PRD-105": {"stock": 260, "reorder_point": 130, "lead_time_days": 5},
    "PRD-106": {"stock": 190, "reorder_point": 100, "lead_time_days": 4},
    "PRD-107": {"stock": 720, "reorder_point": 250, "lead_time_days": 2},
    "PRD-108": {"stock": 160, "reorder_point": 90,  "lead_time_days": 5},
    "PRD-109": {"stock": 390, "reorder_point": 160, "lead_time_days": 4},
    "PRD-110": {"stock": 65,  "reorder_point": 50,  "lead_time_days": 8},  # Low stock test
    "PRD-111": {"stock": 480, "reorder_point": 180, "lead_time_days": 3},
    "PRD-112": {"stock": 610, "reorder_point": 220, "lead_time_days": 2},
    "PRD-113": {"stock": 350, "reorder_point": 140, "lead_time_days": 3},
    "PRD-114": {"stock": 115, "reorder_point": 110, "lead_time_days": 4},  # Low stock test
    "PRD-115": {"stock": 175, "reorder_point": 80,  "lead_time_days": 6},
    "PRD-116": {"stock": 45,  "reorder_point": 60,  "lead_time_days": 5},  # Critical reorder test
}

def preprocess_and_engineer_features(raw_csv_path):
    """
    1. Loads raw dataset and validates schema and types.
    2. Cleans missing values, negative or zero quantities, duplicates.
    3. Aggregates data by date and extracts rich EDA, stock inventory, and price history.
    4. Computes temporal calendar features, historical lags, and rolling statistics.
    5. Ensures strict chronological integrity without lookahead leakage.
    """
    if not os.path.exists(raw_csv_path):
        raise FileNotFoundError(f"Raw dataset file not found at: {raw_csv_path}")

    df_raw = pd.read_csv(raw_csv_path)

    # Standardise column names
    col_mapping = {}
    for col in df_raw.columns:
        c_lower = col.lower().strip()
        if "date" in c_lower:
            col_mapping[col] = "Date"
        elif "product" in c_lower and "name" in c_lower:
            col_mapping[col] = "Product_Name"
        elif "product" in c_lower and ("id" in c_lower or "code" in c_lower):
            col_mapping[col] = "Product_ID"
        elif "cat" in c_lower:
            col_mapping[col] = "Category"
        elif "qty" in c_lower or "quantity" in c_lower or "volume" in c_lower:
            col_mapping[col] = "Quantity"
        elif "unit" in c_lower and "price" in c_lower:
            col_mapping[col] = "Unit_Price"
        elif "total" in c_lower or "revenue" in c_lower or "sales" in c_lower:
            col_mapping[col] = "Total_Sales"

    df_raw = df_raw.rename(columns=col_mapping)

    if "Date" not in df_raw.columns:
        raise ValueError("Dataset missing required 'Date' column.")
    if "Quantity" not in df_raw.columns and "Total_Sales" in df_raw.columns:
        df_raw["Quantity"] = df_raw["Total_Sales"]

    initial_count = len(df_raw)

    # Date conversion and clean
    df_raw["Date"] = pd.to_datetime(df_raw["Date"], errors="coerce")
    df_clean = df_raw.dropna(subset=["Date", "Quantity"]).copy()
    df_clean = df_clean[df_clean["Quantity"] > 0]
    df_clean = df_clean.drop_duplicates()
    cleaned_count = len(df_clean)

    # Sort chronologically
    df_clean = df_clean.sort_values("Date").reset_index(drop=True)

    if "Unit_Price" not in df_clean.columns:
        df_clean["Unit_Price"] = 25.00
    if "Total_Sales" not in df_clean.columns:
        df_clean["Total_Sales"] = df_clean["Quantity"] * df_clean["Unit_Price"]

    # Exploratory Data Analysis (EDA), Product Stock & Price History
    eda = compute_eda_insights(df_clean, initial_count, cleaned_count)

    # Aggregate daily totals for regression model
    daily_df = df_clean.groupby("Date").agg(
        Total_Quantity=("Quantity", "sum"),
        Total_Revenue=("Total_Sales", "sum"),
        Transaction_Count=("Quantity", "count"),
        Avg_Unit_Price=("Unit_Price", "mean"),
        Is_Promotion=("Is_Promotion", "max") if "Is_Promotion" in df_clean.columns else ("Quantity", lambda x: 0)
    ).reset_index()

    # Reindex to continuous daily calendar
    daily_df = daily_df.sort_values("Date").set_index("Date")
    full_idx = pd.date_range(start=daily_df.index.min(), end=daily_df.index.max(), freq="D")
    daily_df = daily_df.reindex(full_idx)
    daily_df["Total_Quantity"] = daily_df["Total_Quantity"].fillna(0)
    daily_df["Total_Revenue"] = daily_df["Total_Revenue"].fillna(0)
    daily_df["Transaction_Count"] = daily_df["Transaction_Count"].fillna(0)
    daily_df["Avg_Unit_Price"] = daily_df["Avg_Unit_Price"].bfill().ffill()
    daily_df["Is_Promotion"] = daily_df["Is_Promotion"].fillna(0).astype(int)
    daily_df = daily_df.reset_index().rename(columns={"index": "Date"})

    # Feature Engineering (Strictly No Lookahead Leakage)
    daily_df["day_of_week"] = daily_df["Date"].dt.day_of_week
    daily_df["day_of_month"] = daily_df["Date"].dt.day
    daily_df["month"] = daily_df["Date"].dt.month
    daily_df["quarter"] = daily_df["Date"].dt.quarter
    daily_df["is_weekend"] = daily_df["day_of_week"].apply(lambda x: 1 if x >= 5 else 0)

    # Autoregressive historical lags
    daily_df["lag_1"] = daily_df["Total_Quantity"].shift(1)
    daily_df["lag_2"] = daily_df["Total_Quantity"].shift(2)
    daily_df["lag_3"] = daily_df["Total_Quantity"].shift(3)
    daily_df["lag_7"] = daily_df["Total_Quantity"].shift(7)
    daily_df["lag_14"] = daily_df["Total_Quantity"].shift(14)

    # Rolling statistics (computed strictly on prior days via shift(1))
    daily_df["rolling_mean_7"] = daily_df["Total_Quantity"].shift(1).rolling(window=7).mean()
    daily_df["rolling_std_7"] = daily_df["Total_Quantity"].shift(1).rolling(window=7).std().fillna(0)
    daily_df["rolling_mean_14"] = daily_df["Total_Quantity"].shift(1).rolling(window=14).mean()

    # Save processed daily dataset
    daily_df.to_csv(PROCESSED_DATA_PATH, index=False)

    with open(EDA_SUMMARY_PATH, "w", encoding="utf-8") as f:
        json.dump(eda, f, indent=2)

    return daily_df, eda

def compute_eda_insights(df, initial_rows, cleaned_rows):
    """Computes distribution stats, product stock matrix, monthly patterns, and price history."""
    total_qty = int(df["Quantity"].sum())
    total_rev = float(df["Total_Sales"].sum())
    avg_order_qty = float(df["Quantity"].mean())

    df["YearMonth"] = df["Date"].dt.to_period("M").astype(str)

    # Recent 30 days daily run-rate for inventory days computation
    latest_date = df["Date"].max()
    recent_30_days_df = df[df["Date"] >= (latest_date - pd.Timedelta(days=30))]

    # Products & Price History Analysis
    all_products = []
    if "Product_Name" in df.columns:
        group_cols = ["Product_ID", "Product_Name", "Category"] if "Category" in df.columns else ["Product_Name"]
        prod_agg = df.groupby(group_cols).agg(
            Units_Sold=("Quantity", "sum"),
            Total_Revenue=("Total_Sales", "sum"),
            Avg_Price=("Unit_Price", "mean"),
            Min_Price=("Unit_Price", "min"),
            Max_Price=("Unit_Price", "max"),
            Latest_Price=("Unit_Price", "last"),
            Promo_Count=("Is_Promotion", "sum") if "Is_Promotion" in df.columns else ("Quantity", lambda x: 0)
        ).reset_index().sort_values("Units_Sold", ascending=False)

        # Monthly Price & Sales History per product
        monthly_prod_agg = df.groupby(group_cols + ["YearMonth"]).agg(
            Monthly_Units=("Quantity", "sum"),
            Monthly_Revenue=("Total_Sales", "sum"),
            Monthly_Avg_Price=("Unit_Price", "mean"),
            Monthly_Min_Price=("Unit_Price", "min"),
            Monthly_Max_Price=("Unit_Price", "max")
        ).reset_index()

        for _, row in prod_agg.iterrows():
            pid = str(row.get("Product_ID", "PRD-UNK"))
            cfg = STOCK_CATALOG_CONFIG.get(pid, {"stock": 250, "reorder_point": 100, "lead_time_days": 4})

            # Calculate daily sales velocity (last 30 days)
            prod_recent = recent_30_days_df[recent_30_days_df["Product_ID"] == pid] if "Product_ID" in recent_30_days_df.columns else pd.DataFrame()
            recent_daily_rate = float(prod_recent["Quantity"].sum() / 30.0) if len(prod_recent) > 0 else (float(row["Units_Sold"]) / 730.0)
            recent_daily_rate = max(1.0, round(recent_daily_rate, 1))

            stock_level = cfg["stock"]
            reorder_point = cfg["reorder_point"]
            days_of_stock = int(round(stock_level / recent_daily_rate))

            if stock_level <= (reorder_point * 0.75):
                stock_status = "Critical Reorder"
                stock_badge = "critical"
            elif stock_level <= reorder_point:
                stock_status = "Low Stock Alert"
                stock_badge = "warning"
            else:
                stock_status = "Healthy Stock"
                stock_badge = "healthy"

            # Filter monthly price history for this product
            p_history_df = monthly_prod_agg[monthly_prod_agg["Product_ID"] == pid].sort_values("YearMonth") if "Product_ID" in monthly_prod_agg.columns else pd.DataFrame()
            price_history_timeline = [
                {
                    "month": str(h_row["YearMonth"]),
                    "avg_price": round(float(h_row["Monthly_Avg_Price"]), 2),
                    "min_price": round(float(h_row["Monthly_Min_Price"]), 2),
                    "max_price": round(float(h_row["Monthly_Max_Price"]), 2),
                    "units_sold": int(h_row["Monthly_Units"]),
                    "revenue": round(float(h_row["Monthly_Revenue"]), 2)
                }
                for _, h_row in p_history_df.iterrows()
            ]

            all_products.append({
                "product_id": pid,
                "product_name": str(row["Product_Name"]),
                "category": str(row.get("Category", "General")),
                "units_sold": int(row["Units_Sold"]),
                "total_revenue": round(float(row["Total_Revenue"]), 2),
                "avg_price": round(float(row["Avg_Price"]), 2),
                "min_price": round(float(row["Min_Price"]), 2),
                "max_price": round(float(row["Max_Price"]), 2),
                "latest_price": round(float(row["Latest_Price"]), 2),
                "current_stock": stock_level,
                "reorder_point": reorder_point,
                "lead_time_days": cfg["lead_time_days"],
                "stock_status": stock_status,
                "stock_badge": stock_badge,
                "recent_daily_rate": recent_daily_rate,
                "days_of_stock": days_of_stock,
                "price_history": price_history_timeline
            })

    # Overall Monthly trends
    monthly_agg = df.groupby("YearMonth").agg(
        Units=("Quantity", "sum"),
        Revenue=("Total_Sales", "sum"),
        Avg_Price=("Unit_Price", "mean")
    ).reset_index()

    monthly_patterns = [
        {
            "month": row["YearMonth"],
            "units": int(row["Units"]),
            "revenue": round(float(row["Revenue"]), 2),
            "avg_price": round(float(row["Avg_Price"]), 2)
        }
        for _, row in monthly_agg.iterrows()
    ]

    # Day of week averages
    df["DOW"] = df["Date"].dt.day_name()
    dow_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    dow_agg = df.groupby("DOW")["Quantity"].mean().reindex(dow_order).fillna(0)

    dow_patterns = [
        {"day": day, "avg_units": round(float(dow_agg.get(day, 0)), 1)}
        for day in dow_order
    ]

    return {
        "initial_records": initial_rows,
        "valid_records": cleaned_rows,
        "removed_records": initial_rows - cleaned_rows,
        "total_units_sold": total_qty,
        "total_revenue": round(total_rev, 2),
        "avg_daily_order_size": round(avg_order_qty, 2),
        "unique_products": int(df["Product_Name"].nunique()) if "Product_Name" in df.columns else 1,
        "top_products": all_products, # Return all products with full price & stock data!
        "monthly_patterns": monthly_patterns,
        "day_of_week_patterns": dow_patterns
    }

if __name__ == "__main__":
    from dataset_loader import load_or_fetch_dataset
    meta = load_or_fetch_dataset(force_refresh=True)
    df, eda = preprocess_and_engineer_features(meta["file_path"])
    print(f"Preprocessed daily records: {len(df)}")
    print(f"Total products tracked: {len(eda['top_products'])}")
    for p in eda['top_products'][:3]:
        print(f"  {p['product_id']}: {p['product_name']} | Stock: {p['current_stock']} | Status: {p['stock_status']} | Price range: ${p['min_price']} - ${p['max_price']}")
