import json
# <<<<<<< Updated upstream
import pandas as pd

import os

# 1. Lấy đường dẫn thư mục gốc (AI-DIAGNOSIS)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 2. Trỏ tới file trong thư mục logs
LOG_PATH = os.path.join(BASE_DIR, "logs", "unknown_cases.jsonl")

rows = []

with open(LOG_PATH, "r", encoding="utf-8") as f:
    for line in f:

        item = json.loads(line)

        text = item["symptom"]

        # manual labeling
        label = input(f"{text} => label: ")

        rows.append({
            "text": text,
            "label": label
        })

df = pd.DataFrame(rows)

df.to_csv(
    "data/laptop/processed/new_training_data.csv",
    index=False,
    encoding="utf-8-sig"
)

print("DONE")
# =======
import csv

INPUT_FILE = "unknown_cases.jsonl"
OUTPUT_FILE = "new_training_data.csv"

with open(INPUT_FILE, "r", encoding="utf-8") as f, \
     open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as out:

    writer = csv.writer(out)
    writer.writerow(["text", "label"])

    for line in f:
        item = json.loads(line)

        if item["correct_label"]:   # chỉ lấy cái đã label
            writer.writerow([item["symptom"], item["correct_label"]])
# >>>>>>> Stashed changes
