"""
Generate high-fidelity sample retail sales dataset for StockSense AI.
This dataset serves as the verified bundled fallback when online repository
fetching is unreachable or offline, guaranteeing 100% reproducibility.
"""
import os
import math
import random
from datetime import datetime, timedelta

def generate_sample_dataset():
    os.makedirs("data", exist_ok=True)
    filepath = os.path.join("data", "sample_retail_sales.csv")

    # Seed for determinism
    random.seed(42)

    products = [
        {"id": "PRD-101", "name": "Wireless Noise-Canceling Headphones", "cat": "Audio", "base_price": 149.99, "base_demand": 35},
        {"id": "PRD-102", "name": "Ergonomic Mechanical Keyboard", "cat": "Peripherals", "base_price": 89.99, "base_demand": 28},
        {"id": "PRD-103", "name": "Ultra-HD 4K 27-inch Monitor", "cat": "Displays", "base_price": 299.99, "base_demand": 18},
        {"id": "PRD-104", "name": "USB-C Dual HDMI Multiport Dock", "cat": "Accessories", "base_price": 49.99, "base_demand": 42},
        {"id": "PRD-105", "name": "Smart Fitness & Heart Rate Tracker", "cat": "Wearables", "base_price": 79.99, "base_demand": 30},
        {"id": "PRD-106", "name": "High-Speed NVMe 1TB Portable SSD", "cat": "Storage", "base_price": 119.99, "base_demand": 24},
        {"id": "PRD-107", "name": "MagSafe Fast Wireless Charger Pad", "cat": "Accessories", "base_price": 29.99, "base_demand": 50},
        {"id": "PRD-108", "name": "Studio Condenser Podcast Microphone", "cat": "Audio", "base_price": 129.99, "base_demand": 20},
    ]

    # Generate 730 days (2 full years: 2024-01-01 to 2025-12-31)
    start_date = datetime(2024, 1, 1)
    num_days = 730

    header = "Date,Product_ID,Product_Name,Category,Quantity,Unit_Price,Total_Sales,Is_Promotion,Day_of_Week\n"

    rows = []
    days_of_week_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    for d in range(num_days):
        current_date = start_date + timedelta(days=d)
        date_str = current_date.strftime("%Y-%m-%d")
        dow_idx = current_date.weekday()
        dow_name = days_of_week_names[dow_idx]

        # Weekly pattern: sales higher on Fri, Sat, Sun
        weekend_mult = 1.35 if dow_idx in [4, 5, 6] else 1.0

        # Annual seasonality: higher in Q4 (holidays / Black Friday), slight dip in Feb
        day_of_year = current_date.timetuple().tm_yday
        seasonal_mult = 1.0 + 0.25 * math.sin((day_of_year - 80) * 2 * math.pi / 365.0)
        if current_date.month in [11, 12]:
            seasonal_mult *= 1.35

        # Promotion check: ~12% chance of promotional campaign
        is_promo = 1 if (random.random() < 0.12 or (current_date.month == 11 and current_date.day in [24, 25, 26, 27, 28, 29])) else 0
        promo_mult = 1.45 if is_promo else 1.0

        for p in products:
            noise = random.gauss(1.0, 0.12)
            noise = max(0.65, min(1.45, noise))

            # Calculate daily quantity
            expected_qty = p["base_demand"] * weekend_mult * seasonal_mult * promo_mult * noise
            actual_qty = max(1, int(round(expected_qty)))

            # Unit price may have small promo discount
            price_factor = 0.85 if is_promo else 1.0
            unit_price = round(p["base_price"] * price_factor, 2)
            total_sales = round(actual_qty * unit_price, 2)

            rows.append(f"{date_str},{p['id']},{p['name']},{p['cat']},{actual_qty},{unit_price:.2f},{total_sales:.2f},{is_promo},{dow_name}\n")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(header)
        f.writelines(rows)

    print(f"Sample dataset generated successfully: {filepath} with {len(rows)} records across {num_days} days.")

if __name__ == "__main__":
    generate_sample_dataset()
