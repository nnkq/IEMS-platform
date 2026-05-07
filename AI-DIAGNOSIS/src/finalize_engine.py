def finalize_diagnosis(issue, answers, device_type):

    confidence = 0.75

    root_causes = []

    # =========================
    # OVERHEATING
    # =========================

    if issue == "overheating_issue":

        if answers.get("charging") == "có":

            confidence += 0.1

            root_causes.append(
                "Pin hoặc IC sạc gây nóng"
            )

        if answers.get("fan_noise") == "có":

            confidence += 0.1

            root_causes.append(
                "Quạt tản nhiệt bám bụi"
            )

    return {

        "issue": issue,

        "confidence": round(confidence, 2),

        "device_type": device_type,

        "root_causes": root_causes,

        "message": "Đã hoàn tất chẩn đoán."
    }