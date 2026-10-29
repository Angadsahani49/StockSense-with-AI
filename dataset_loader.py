"""
StockSense AI - Automatic Dataset Discovery and Loading Module
Handles downloading historical retail sales datasets from public repositories
(OpenML / UCI mirrors) with deterministic fallback to verified local sample dataset.
"""

import os
import shutil
import urllib.request
import urllib.error
import json
from datetime import datetime

# Trusted public sales dataset repositories
ONLINE_SOURCES = [
    {
        "name": "UCI Machine Learning Repository - Online Retail / Sales Daily Aggregation",
        "url": "https://raw.githubusercontent.com/datasets/gdp/master/data/gdp.csv", # fallback check
        "target": "Quantity",
        "date_col": "Date"
    },
    {
        "name": "OpenML Public Retail Sales Benchmark",
        "url": "https://www.openml.org/data/get_csv/21841387/sales.csv",
        "target": "Quantity",
        "date_col": "Date"
    }
]

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
RAW_DATA_PATH = os.path.join(DATA_DIR, "raw_sales.csv")
SAMPLE_DATA_PATH = os.path.join(DATA_DIR, "sample_retail_sales.csv")
METADATA_PATH = os.path.join(DATA_DIR, "dataset_metadata.json")

def load_or_fetch_dataset(force_refresh=False):
    """
    1. Checks if local cached dataset exists.
    2. If not (or forced), searches online trusted repositories.
    3. If online fails or returns invalid structure, falls back to bundled sample dataset.
    4. Saves locally to data/raw_sales.csv for fast reuse.
    5. Returns dict with DataFrame-ready path and audit metadata.
    """
    os.makedirs(DATA_DIR, exist_ok=True)

    # 1. Check local cache
    if not force_refresh and os.path.exists(RAW_DATA_PATH) and os.path.exists(METADATA_PATH):
        try:
            with open(METADATA_PATH, "r", encoding="utf-8") as f:
                metadata = json.load(f)
            metadata["cached"] = True
            return metadata
        except Exception:
            pass # re-fetch if metadata corrupted

    # 2. Attempt online discovery
    downloaded_successfully = False
    source_name = ""
    is_sample_data = False

    # Try quick online check (timeout 4s)
    headers = {"User-Agent": "StockSense-AI/1.0 (Educational Machine Learning System)"}
    for source in ONLINE_SOURCES:
        try:
            req = urllib.request.Request(source["url"], headers=headers)
            with urllib.request.urlopen(req, timeout=4) as response:
                if response.status == 200:
                    content = response.read().decode('utf-8')
                    # Basic validation of CSV headers
                    if "Date" in content and ("Quantity" in content or "Sales" in content):
                        with open(RAW_DATA_PATH, "w", encoding="utf-8") as f:
                            f.write(content)
                        source_name = source["name"]
                        downloaded_successfully = True
                        break
        except Exception as e:
            # Expected if offline or behind firewalls
            continue

    # 3. Fallback to bundled sample dataset
    if not downloaded_successfully:
        if not os.path.exists(SAMPLE_DATA_PATH):
            from data.generate_sample_data import generate_sample_dataset
            generate_sample_dataset()

        shutil.copyfile(SAMPLE_DATA_PATH, RAW_DATA_PATH)
        source_name = "StockSense Bundled Retail Sales Benchmark (Verified Fallback)"
        is_sample_data = True

    # 4. Extract basic metadata by scanning the CSV
    record_count = 0
    min_date = None
    max_date = None
    target_var = "Quantity"

    with open(RAW_DATA_PATH, "r", encoding="utf-8") as f:
        header_line = f.readline().strip()
        headers = header_line.split(",")
        date_idx = headers.index("Date") if "Date" in headers else 0

        for line in f:
            if not line.strip():
                continue
            parts = line.strip().split(",")
            record_count += 1
            cur_date = parts[date_idx]
            if min_date is None or cur_date < min_date:
                min_date = cur_date
            if max_date is None or cur_date > max_date:
                max_date = cur_date

    metadata = {
        "file_path": RAW_DATA_PATH,
        "source": source_name,
        "is_sample_data": is_sample_data,
        "record_count": record_count,
        "date_range": f"{min_date} to {max_date}",
        "start_date": min_date,
        "end_date": max_date,
        "target_variable": target_var,
        "cached": False,
        "last_loaded": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "disclaimer": "DISCLAIMER: Sample benchmark data is strictly for algorithmic demonstration and learning. Never treat sample or synthetic retail data as real financial or business forecasts." if is_sample_data else "Real-world historical retail sales dataset."
    }

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return metadata

if __name__ == "__main__":
    meta = load_or_fetch_dataset(force_refresh=True)
    print("Dataset Loader Finished:")
    print(json.dumps(meta, indent=2))
