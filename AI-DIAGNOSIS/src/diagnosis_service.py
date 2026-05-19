from inference_text import predict_issue
from metadata import ISSUE_METADATA
from text_preprocessing import normalize_text
from logger import log_unknown_case

THRESHOLD = 0.8
SUPPORTED_DEVICES = ["laptop"]

LAPTOP_KEYWORDS = [
    "laptop", "máy tính", "máy tính xách tay", "notebook",
    "asus", "vivobook", "zenbook", "tuf", "rog",
    "dell", "inspiron", "xps", "latitude",
    "hp", "pavilion", "omen", "elitebook",
    "lenovo", "thinkpad", "ideapad", "legion",
    "acer", "aspire", "nitro", "predator",
    "msi", "macbook",
    "pin", "sạc", "adapter", "màn hình", "bàn phím",
    "touchpad", "quạt", "cpu", "gpu", "ram", "ssd",
    "ổ cứng", "windows", "bios", "nguồn"
]


def is_laptop_related(text):
    print("DEBUG normalized text:", text)

    strong = any(k in text for k in LAPTOP_KEYWORDS)
    print("DEBUG strong laptop match:", strong)

    weak = "máy" in text
    issue_keywords = ["nóng", "sập", "không lên", "đen", "treo", "lag", "giật", "chậm", "đơ"]

    if strong:
        return True

    if weak and any(k in text for k in issue_keywords):
        return True

    return False


def keyword_boost(text, label, confidence):
    if "nóng" in text or "quạt" in text:
        if confidence < 0.85:
            return "overheating_issue", 0.85

    return label, confidence


# Thêm user_id=None vào cuối
def diagnose(text, device_type=None, user_id=None):
    original_text = text
    text = normalize_text(text)

    # ... (Giữ nguyên toàn bộ code bên dưới của bạn) ...

    detected_device = "laptop" if is_laptop_related(text) else "unknown"

    if device_type:
        device_type = device_type.lower()
    else:
        device_type = detected_device

    if device_type not in SUPPORTED_DEVICES:
        result = {
            "issue": "unknown_issue",
            "confidence": 0.0,
            "device_type": detected_device,
            "message": "Không xác định được thiết bị. Bạn có thể nói rõ là laptop không?"
        }
        log_unknown_case(original_text, result)
        return result

    if detected_device != "laptop":
        result = {
            "issue": "unknown_issue",
            "confidence": 0.0,
            "device_type": "unknown",
            "message": "chúng tôi chỉ vừa cập nhật các lỗi về laptop còn các thiết bị khác sẽ được cập nhật sau."
        }
        log_unknown_case(original_text, result)
        return result

    label, confidence = predict_issue(text)
    label, confidence = keyword_boost(text, label, confidence)

    if label in ["unknown", "unknown_issue"]:
        result = {
            "issue": "unknown_issue",
            "confidence": confidence,
            "device_type": "laptop",
            "message": "Không nhận diện được lỗi."
        }
        log_unknown_case(original_text, result)
        return result

    if confidence < THRESHOLD:
        result = {
            "issue": "unknown_issue",
            "confidence": confidence,
            "device_type": "laptop",
            "message": "Độ tin cậy thấp, cần thêm thông tin."
        }
        log_unknown_case(original_text, result)
        return result

    meta = ISSUE_METADATA.get(label, {})

    return {
        "issue": label,
        "confidence": confidence,
        "device_type": "laptop",
        "severity": meta.get("severity", "unknown"),
        "causes": meta.get("causes", []),
        "suggestions": meta.get("suggestions", []),
        "estimated_price": meta.get("estimated_price", "Chưa xác định"),
        "need_technician": meta.get("need_technician", True),
    }