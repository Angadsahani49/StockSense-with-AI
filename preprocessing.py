"""
StockSense AI - Data Science & Preprocessing Pipeline
Performs data quality validation, missing value handling, temporal aggregation,
exploratory data analysis (EDA), and lag/rolling feature engineering without data leakage.
"""

import os
import json
import pandas as pd
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
PROCESSED_DATA_PATH = os.path.join(DATA_DIR, "processed_daily_sales.csv")
EDA_SUMMARY_PATH = os.path.join(DATA_DIR, "eda_summary.json")

def preprocess_and_engineer_features(raw_csv_path):
    """
    1. Loads raw dataset and validates schema and types.
    2. Cleans missing values, negative or zero quantities, duplicates.
    3. Aggregates data by date and extracts EDA insights.
    4. Computes temporal calendar features, historical lags, and rolling statistics.
    5. Ensures strict chronological integrity without lookahead leakage.
    """
    if not os.path.exists(raw_csv_path):
        raise FileNotFoundError(f"Raw dataset file not found at: {raw_csv_path}")

    df_raw = pd.read_csv(raw_csv_path)

    # 1. Inspect data and standardise column names
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

    # 2. Date conversion and handling invalid records
    df_raw["Date"] = pd.to_datetime(df_raw["Date"], errors="coerce")
    df_clean = df_raw.dropna(subset=["Date", "Quantity"]).copy()

    # Filter out canceled/negative/zero transactions
    df_clean = df_clean[df_clean["Quantity"] > 0]
    df_clean = df_clean.drop_duplicates()
    cleaned_count = len(df_clean)

    # Sort chronologically
    df_clean = df_clean.sort_values("Date").reset_index(drop=True)

    # Ensure Unit_Price and Total_Sales exist
    if "Unit_Price" not in df_clean.columns:
        df_clean["Unit_Price"] = 25.00
    if "Total_Sales" not in df_clean.columns:
        df_clean["Total_Sales"] = df_clean["Quantity"] * df_clean["Unit_Price"]

    # 3. Exploratory Data Analysis (EDA)
    eda = compute_eda_insights(df_clean, initial_count, cleaned_count)

    # 4. Aggregate daily sales
    daily_df = df_clean.groupby("Date").agg(
        Total_Quantity=("Quantity", "sum"),
        Total_Revenue=("Total_Sales", "sum"),
        Transaction_Count=("Quantity", "count"),
        Avg_Unit_Price=("Unit_Price", "mean"),
        Is_Promotion=("Is_Promotion", "max") if "Is_Promotion" in df_clean.columns else ("Quantity", lambda x: 0)
    ).reset_index()

    # Ensure continuous daily index (fill any missing days with 0 or forward values)
    daily_df = daily_df.sort_values("Date").set_index("Date")
    full_idx = pd.date_range(start=daily_df.index.min(), end=daily_df.index.max(), freq="D")
    daily_df = daily_df.reindex(full_idx)
    daily_df["Total_Quantity"] = daily_df["Total_Quantity"].fillna(0)
    daily_df["Total_Revenue"] = daily_df["Total_Revenue"].fillna(0)
    daily_df["Transaction_Count"] = daily_df["Transaction_Count"].fillna(0)
    daily_df["Avg_Unit_Price"] = daily_df["Avg_Unit_Price"].bfill().ffill()
    daily_df["Is_Promotion"] = daily_df["Is_Promotion"].fillna(0).astype(int)
    daily_df = daily_df.reset_index().rename(columns={"index": "Date"})

    # 5. Strict Feature Engineering - NO FUTURE LEAKAGE
    # Calendar features known at prediction time
    daily_df["day_of_week"] = daily_df["Date"].dt.dayofweek
    daily_df["day_of_month"] = daily_df["Date"].dt.day
    daily_df["month"] = daily_df["Date"].dt.month
    daily_df["quarter"] = daily_df["Date"].dt.quarter
    daily_df["is_weekend"] = daily_df["day_of_week"].apply(lambda x: 1 if x >= 5 else 0)

    # Historical Lags: y_{t-k}
    daily_df["lag_1"] = daily_df["Total_Quantity"].shift(1)
    daily_df["lag_2"] = daily_df["Total_Quantity"].shift(2)
    daily_df["lag_3"] = daily_df["Total_Quantity"].shift(3)
    daily_df["lag_7"] = daily_df["Total_Quantity"].shift(7)
    daily_df["lag_14"] = daily_df["Total_Quantity"].shift(14)

    # Rolling statistics: computed ONLY on past values (shift 1 before rolling to exclude today)
    daily_df["rolling_mean_7"] = daily_df["Total_Quantity"].shift(1).rolling(window=7).mean()
    daily_df["rolling_std_7"] = daily_df["Total_Quantity"].shift(1).rolling(window=7).std().fillna(0)
    daily_df["rolling_mean_14"] = daily_df["Total_Quantity"].shift(1).rolling(window=14).mean()

    # Save processed daily dataset
    daily_df.to_csv(PROCESSED_DATA_PATH, index=False)

    with open(EDA_SUMMARY_PATH, "w", encoding="utf-8") as f:
        json.dump(eda, f, indent=2)

    return daily_df, eda

def compute_eda_insights(df, initial_rows, cleaned_rows):
    """Computes distribution stats, top products, monthly patterns, and day-of-week averages."""
    total_qty = int(df["Quantity"].sum())
    total_rev = float(df["Total_Sales"].sum())
    avg_order_qty = float(df["Quantity"].mean())

    # Top selling products
    top_products = []
    if "Product_Name" in df.columns:
        prod_agg = df.groupby(["Product_ID", "Product_Name", "Category"] if "Category" in df.columns else ["Product_Name"]).agg(
            Units_Sold=("Quantity", "sum"),
            Total_Revenue=("Total_Sales", "sum"),
            Avg_Price=("Unit_Price", "mean")
        ).reset_index().sort_values("Units_Sold", ascending=False)

        for _, row in prod_agg.head(8).iterrows():
            top_products.append({
                "product_id": str(row.get("Product_ID", "N/A")),
                "product_name": str(row["Product_Name"]),
                "category": str(row.get("Category", "General")),
                "units_sold": int(row["Units_Sold"]),
                "total_revenue": round(float(row["Total_Revenue"]), 2),
                "avg_price": round(float(row["Avg_Price"]), 2)
            })

    # Monthly trends
    df["YearMonth"] = df["Date"].dt.to_period("M").astype(str)
    monthly_agg = df.groupby("YearMonth").agg(
        Units=("Quantity", "sum"),
        Revenue=("Total_Sales", "sum")
    ).reset_index()

    monthly_patterns = [
        {"month": row["YearMonth"], "units": int(row["Units"]), "revenue": round(float(row["Revenue"]), 2)}
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
        "top_products": top_products,
        "monthly_patterns": monthly_patterns,
        "day_of_week_patterns": dow_patterns
    }

if __name__ == "__main__":
    from dataset_loader import load_or_fetch_dataset
    meta = load_or_fetch_dataset()
    df, eda = preprocess_and_engineer_features(meta["file_path"])
    print(f"Preprocessed daily records: {len(df)}")
    print(f"Features: {list(df.columns)}")
    print(f"Top product: {eda['top_products'][0]['product_name'] if eda['top_products'] else 'N/A'}")
