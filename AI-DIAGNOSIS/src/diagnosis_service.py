from inference_text import predict_issue
from metadata import ISSUE_METADATA
from text_preprocessing import normalize_text
from logger import log_unknown_case
from memory import save_context, get_context, clear_context
from conversation_memory import (
    update_context,
    get_last_question,
    set_last_question,
    set_prediction,
    get_prediction
)
from diagnostic_flow import DIAGNOSTIC_FLOWS
from memory import (
    save_context,
    get_context,
    clear_context,
    update_answer,
    next_step,
    get_step
)
from finalize_engine import finalize_diagnosis

THRESHOLD = 0.8
SUPPORTED_DEVICES = ["laptop"]

LAPTOP_KEYWORDS = [
    "laptop", "lap", "máy tính", "mt", "pc", "notebook",
    "màn hình", "bàn phím", "pin", "sạc", "quạt", "cpu", "ram"
]

# ==============================
# Detect device
# ==============================
def is_laptop_related(text):
    strong = any(k in text for k in LAPTOP_KEYWORDS)
    weak = "máy" in text

    # Cập nhật thêm các từ khóa lỗi phổ biến để bắt diện rộng
    issue_keywords = ["nóng", "sập", "sập nguồn", "không lên", "đen", "treo", "tự tắt"]

    if strong:
        return True

    if weak and any(k in text for k in issue_keywords):
        return True

    return False


# ==============================
# Rule boost (backup for model)
# ==============================
def keyword_boost(text, label, confidence):

    # =========================
    # OVERHEATING
    # =========================
    overheating_keywords = [
        "nóng",
        "quạt to",
        "quạt quay mạnh",
        "rất nóng",
        "nóng ran"
    ]

    if any(k in text for k in overheating_keywords):
        if label == "unknown" or confidence < 0.8:
            return "overheating_issue", 0.85

    # =========================
    # BATTERY / POWER
    # =========================
    battery_keywords = [
        "sạc không vào",
        "không nhận sạc",
        "pin tụt",
        "sập nguồn",
        "sập",          
        "tự tắt",        
        "chai pin"
    ]

    if any(k in text for k in battery_keywords):
        if label == "unknown" or confidence < 0.8:
            return "battery_charging_issue", 0.85

    # =========================
    # SCREEN
    # =========================
    screen_keywords = [
        "đen màn",
        "màn hình xanh",
        "sọc màn",
        "màn hình nhấp nháy"
    ]

    if any(k in text for k in screen_keywords):
        if label == "unknown" or confidence < 0.8:
            return "screen_issue", 0.85

    # 🔥 SỬA TẠI ĐÂY: Đưa dòng này ra ngoài cùng của hàm, không lồng trong `if any(k in text for k in screen_keywords):`
    return label, confidence

# ==============================
# Main diagnose function
# ==============================
def diagnose(text, device_type="laptop", user_id="default"):

    update_context(user_id, text)

    context = get_context(user_id)

    if context:

        issue = context["issue"]

        flow = DIAGNOSTIC_FLOWS.get(issue)

        step = get_step(user_id)

        if flow and step < len(flow):

            current = flow[step]

            key = current["key"]

            update_answer(user_id, key, text)

            next_step(user_id)

            step = get_step(user_id)

            # hỏi tiếp
            if step < len(flow):

                next_question = flow[step]["question"]

                return {
                    "issue": "need_more_info",
                    "message": next_question
                }

        # ===== DONE ALL QUESTIONS =====

        answers = context["answers"]

        clear_context(user_id)

        return finalize_diagnosis(
            issue,
            answers,
            device_type
        )

    raw_text = text  # 🔥 giữ lại text gốc
    text = normalize_text(text)

    # ===== CONTEXT MEMORY =====

    context = get_context(user_id)

    short_answers = [
        "có",
        "không",
        "có ạ",
        "không ạ",
        "yes",
        "no"
    ]

    if context and text in short_answers:

        old_symptom = context["symptom"]

        text = old_symptom + " " + text

        print("[CONTEXT MERGED]", text)

    try:
        # ===== check device =====
        if device_type.lower() not in SUPPORTED_DEVICES:
            result = {
                "issue": "unknown_issue",
                "confidence": 0.0,
                "device_type": device_type,
                "message": f"Hiện tại chỉ hỗ trợ: {', '.join(SUPPORTED_DEVICES)}"
            }
            log_unknown_case(raw_text, result)
            return result

        if not is_laptop_related(text):
            result = {
                "issue": "unknown_issue",
                "confidence": 0.0,
                "device_type": device_type,
                "message": "Không xác định được thiết bị. Bạn có thể nói rõ là laptop không?"
            }
            log_unknown_case(raw_text, result)
            return result

        # ===== model predict =====
        label, confidence = predict_issue(text)

        # ===== rule boost =====
        # Gọi hàm này trước để kịp thời cứu những ca model bị "unknown" hoặc độ tự tin thấp
        label, confidence = keyword_boost(text, label, confidence)

        # ===== low confidence or fallback detect =====
        # Di chuyển logic kiểm tra độ tự tin và từ khóa fallback lên TRƯỚC khi từ chối nhận diện lỗi
        if label == "unknown" or confidence < THRESHOLD:

            possible_issue = label

            # fallback detect bằng từ khóa cứng
            if "nóng" in text:
                possible_issue = "overheating_issue"

            elif "sạc" in text or "sập" in text or "tắt" in text: # 🔥 SỬA: Thêm bẫy từ khóa tại đây
                possible_issue = "battery_charging_issue"

            elif "màn hình" in text:
                possible_issue = "screen_issue"

            flow = DIAGNOSTIC_FLOWS.get(possible_issue)

            if flow:
                first_question = flow[0]["question"]

                save_context(
                    user_id,
                    raw_text,
                    possible_issue
                )

                return {
                    "issue": "need_more_info",
                    "device_type": device_type,
                    "message": first_question
                }

        # ===== unknown label (Khi cả model lẫn bộ lọc từ khóa đều chịu thua) =====
        if label == "unknown":
            result = {
                "issue": "unknown_issue",
                "confidence": confidence,
                "device_type": device_type,
                "message": "Không nhận diện được lỗi."
            }
            log_unknown_case(raw_text, result)
            return result

        # ===== metadata safe =====
        meta = ISSUE_METADATA.get(label)

        if not meta:
            result = {
                "issue": label,
                "confidence": confidence,
                "device_type": device_type,
                "message": "Chưa có thông tin chi tiết cho lỗi này"
            }
            log_unknown_case(raw_text, result)
            return result

        # ===== success =====
        result = {
            "issue": label,
            "confidence": confidence,
            "device_type": device_type,
            "severity": meta.get("severity", "unknown"),
            "causes": meta.get("causes", []),
            "suggestions": meta.get("suggestions", []),
            "estimated_price": meta.get("estimated_price", "Chưa xác định"),
            "need_technician": meta.get("need_technician", True),

            "human_readable": f"""
            🔧 Chẩn đoán: {label.replace('_', ' ').upper()}

            📊 Độ tin cậy: {int(confidence * 100)}%

            ⚠️ Mức độ: {meta.get("severity", "unknown")}

            🛠️ Nguyên nhân có thể:
            - {' - '.join(meta.get("causes", []))}

            💡 Gợi ý xử lý:
            - {' - '.join(meta.get("suggestions", []))}

            💰 Chi phí dự kiến:
            {meta.get("estimated_price", "Chưa xác định")}
            """
        }

        print(f"[DEBUG] raw='{raw_text}' | norm='{text}' | label={label} | conf={confidence}")

        clear_context(user_id)
        
        return result

    except Exception as e:
        result = {
            "issue": "system_error",
            "confidence": 0.0,
            "device_type": device_type,
            "message": f"Lỗi hệ thống: {str(e)}"
        }

        print("[ERROR]", str(e))

        log_unknown_case(raw_text, result)

        return result