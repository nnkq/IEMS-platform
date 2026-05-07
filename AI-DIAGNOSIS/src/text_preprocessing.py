import re

SLANG_MAP = {
    "lap": "laptop",
    "laptop": "laptop",
    "vcl": "rất",
    "vl": "rất",
    "vc": "rất",
    "ko": "không",
    "k": "không",
    "hok": "không",
    "sài": "xài",
    "xài": "sử dụng",
    "mỏ": "mới",
    "đt": "điện thoại",
    "mt": "máy tính",
    "đơ": "treo",
    "lag": "chậm",
    "sập": "tắt"
}

def normalize_text(text):
    text = text.lower()

    for k, v in SLANG_MAP.items():
        text = text.replace(k, v)

    return text