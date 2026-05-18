import os
import re
import pandas as pd
from sklearn.model_selection import train_test_split
from label_map import label2id

# <<<<<<< Updated upstream
# Use balanced dataset (350 samples, 50 per category)
INPUT_CSV = "D:/CAPSTONE2/new/IEMS-PLATFORM/AI-DIAGNOSIS/data/laptop/processed/laptop_dataset_balanced.csv"
OUTPUT_DIR = "D:/CAPSTONE2/new/IEMS-PLATFORM/AI-DIAGNOSIS/data/laptop/splits"
# =======
# BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# # Balanced dataset: 50 samples per category
# INPUT_CSV = os.path.join(BASE_DIR, "data", "laptop", "processed", "laptop_dataset_balanced.csv")
# OUTPUT_DIR = os.path.join(BASE_DIR, "data", "laptop", "splits")
# >>>>>>> Stashed changes

os.makedirs(OUTPUT_DIR, exist_ok=True)


def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = text.strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text


def main():
    df = pd.read_csv(INPUT_CSV)

    required_cols = ["id", "device_type", "symptom_text", "label"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Thiếu cột bắt buộc: {col}")

    df = df.dropna(subset=["symptom_text", "label"]).copy()
    df["symptom_text"] = df["symptom_text"].apply(clean_text)

    df = df[df["label"].isin(label2id.keys())].copy()
    df["labels"] = df["label"].map(label2id)

    # Xóa duplicate đơn giản theo text + label
    df = df.drop_duplicates(subset=["symptom_text", "label"]).reset_index(drop=True)

    # Chia test trước
    train_val_df, test_df = train_test_split(
        df,
        test_size=0.15,
        stratify=df["labels"],
        random_state=42
    )

    # Chia val từ phần train_val
    val_ratio_adjusted = 0.15 / 0.85
    train_df, val_df = train_test_split(
        train_val_df,
        test_size=val_ratio_adjusted,
        stratify=train_val_df["labels"],
        random_state=42
    )

    train_path = os.path.join(OUTPUT_DIR, "train.csv")
    val_path = os.path.join(OUTPUT_DIR, "val.csv")
    test_path = os.path.join(OUTPUT_DIR, "test.csv")

    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    test_df.to_csv(test_path, index=False)

    print("===== DATA SUMMARY =====")
    print(f"Total samples: {len(df)}")
    print(f"Train: {len(train_df)}")
    print(f"Val:   {len(val_df)}")
    print(f"Test:  {len(test_df)}")
    print("\nLabel distribution:")
    print(df["label"].value_counts())

    print("\nSaved files:")
    print(train_path)
    print(val_path)
    print(test_path)


if __name__ == "__main__":
    main()