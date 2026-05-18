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

def normalize_text(text: str) -> str:
    text = text.lower()

    # replace slang
    for k, v in SLANG_MAP.items():
        text = re.sub(rf"\b{k}\b", v, text)

    # remove special chars
    text = re.sub(r"[^\w\s]", " ", text)

    # remove duplicate spaces
    text = re.sub(r"\s+", " ", text).strip()

    return text