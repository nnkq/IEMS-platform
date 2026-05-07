import pandas as pd
import os

INPUT_CSV = "D:/CAPSTONE2/new/IEMS-PLATFORM/AI-DIAGNOSIS/data/laptop/processed/laptop_dataset_with_unknown.csv"
OUTPUT_CSV = "D:/CAPSTONE2/new/IEMS-PLATFORM/AI-DIAGNOSIS/data/laptop/processed/laptop_dataset_balanced.csv"

def balance_dataset():
    """
    Cân bằng dataset bằng cách giữ 50 samples cho mỗi category
    (thay vì 156 unknown samples dư thừa)
    """
    
    df = pd.read_csv(INPUT_CSV)
    print(f"Original dataset: {len(df)} samples")
    print(f"\nOriginal label distribution:")
    print(df["label"].value_counts())
    
    # Danh sách các specific categories
    specific_categories = [
        "screen_issue", 
        "battery_charging_issue",
        "overheating_issue",
        "keyboard_issue",
        "boot_issue",
        "audio_issue"
    ]
    
    # Giữ 50 samples cho mỗi specific category
    balanced_dfs = []
    for category in specific_categories:
        category_df = df[df["label"] == category]
        print(f"\n{category}: {len(category_df)} samples → keeping all 50")
        balanced_dfs.append(category_df)
    
    # Giữ chỉ 50 samples unknown (thay vì 156)
    unknown_df = df[df["label"] == "unknown"]
    print(f"\nunknown: {len(unknown_df)} samples → keeping only 50 (random sample)")
    
    # Lấy 50 unknown samples ngẫu nhiên
    unknown_balanced = unknown_df.sample(n=50, random_state=42)
    balanced_dfs.append(unknown_balanced)
    
    # Kết hợp tất cả
    balanced_df = pd.concat(balanced_dfs, ignore_index=True)
    
    print(f"\n{'='*60}")
    print(f"New balanced dataset: {len(balanced_df)} samples")
    print(f"\nNew label distribution:")
    print(balanced_df["label"].value_counts())
    
    print(f"\nPercentage distribution:")
    for label, count in balanced_df["label"].value_counts().items():
        pct = (count / len(balanced_df)) * 100
        print(f"  {label}: {count} samples ({pct:.1f}%)")
    
    # Lưu dataset cân bằng
    balanced_df.to_csv(OUTPUT_CSV, index=False)
    print(f"\n✓ Saved balanced dataset to: {OUTPUT_CSV}")
    
    return OUTPUT_CSV


if __name__ == "__main__":
    balance_dataset()
