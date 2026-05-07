import json
import os
from datetime import datetime

LOG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs", "unknown_cases.jsonl")


def log_unknown_case(text, result):
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "symptom": text,
        "predicted": result.get("issue"),
        "confidence": result.get("confidence"),
        "device_type": result.get("device_type"),

        # 🔥 NEW FIELD
        "correct_label": None,
        "needs_labeling": True
    }

    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")