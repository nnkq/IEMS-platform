"""
Gộp mẫu 6 loại lỗi laptop mới vào dataset đã cân bằng.
Giữ 50 mẫu/lớp để không làm lệch phân phối so với các nhãn hiện có.
"""
import os
import pandas as pd
from laptop_extra_samples import EXTRA_SYMPTOMS, CATEGORY_META

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_CSV = os.path.join(BASE_DIR, "data", "laptop", "processed", "laptop_dataset_balanced.csv")
OUTPUT_CSV = os.path.join(BASE_DIR, "data", "laptop", "processed", "laptop_dataset_balanced.csv")

NEW_CATEGORIES = list(CATEGORY_META.keys())
SAMPLES_PER_CATEGORY = 50


def _next_id(existing_df: pd.DataFrame) -> int:
    max_id = 0
    for row_id in existing_df["id"].astype(str):
        parts = row_id.split("_")
        if len(parts) >= 2 and parts[-1].isdigit():
            max_id = max(max_id, int(parts[-1]))
    return max_id + 1


def build_new_rows(start_id: int) -> list[dict]:
    rows = []
    current_id = start_id
    for label in NEW_CATEGORIES:
        symptoms = EXTRA_SYMPTOMS[label]
        if len(symptoms) < SAMPLES_PER_CATEGORY:
            raise ValueError(f"{label}: thiếu mẫu ({len(symptoms)}/{SAMPLES_PER_CATEGORY})")
        if len(symptoms) > SAMPLES_PER_CATEGORY:
            symptoms = symptoms[:SAMPLES_PER_CATEGORY]

        meta = CATEGORY_META[label]
        for text in symptoms:
            rows.append({
                "id": f"lap_{current_id:04d}",
                "device_type": "laptop",
                "symptom_text": text,
                "image_path": "",
                "label": label,
                "severity": meta["severity"],
                "recommendation": meta["recommendation"],
            })
            current_id += 1
    return rows


def main():
    if not os.path.exists(INPUT_CSV):
        raise FileNotFoundError(f"Không tìm thấy dataset: {INPUT_CSV}")

    existing_df = pd.read_csv(INPUT_CSV)
    print(f"Dataset hiện tại: {len(existing_df)} mẫu")
    print(existing_df["label"].value_counts())

    # Tránh thêm trùng nếu chạy lại script
    already_added = existing_df["label"].isin(NEW_CATEGORIES).any()
    if already_added:
        print("\nCác nhãn mới đã tồn tại trong dataset — bỏ qua bước thêm mẫu.")
        return

    start_id = _next_id(existing_df)
    new_rows = build_new_rows(start_id)
    new_df = pd.DataFrame(new_rows)

    combined = pd.concat([existing_df, new_df], ignore_index=True)
    combined = combined.drop_duplicates(subset=["symptom_text", "label"]).reset_index(drop=True)

    combined.to_csv(OUTPUT_CSV, index=False)

    print(f"\nĐã thêm {len(new_df)} mẫu ({SAMPLES_PER_CATEGORY} x {len(NEW_CATEGORIES)} loại)")
    print(f"Dataset mới: {len(combined)} mẫu")
    print("\nPhân phối nhãn:")
    print(combined["label"].value_counts())
    print(f"\nĐã lưu: {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
