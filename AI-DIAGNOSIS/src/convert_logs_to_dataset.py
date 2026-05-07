import json
import pandas as pd

LOG_PATH = "D:/CAPSTONE2/new/IEMS-PLATFORM/AI-DIAGNOSIS/logs/unknown_cases.jsonl"

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