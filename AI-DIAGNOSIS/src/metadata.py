ISSUE_METADATA = {

    "overheating_issue": {
        "severity": "medium",
        "causes": [
            "bụi bám quạt tản nhiệt",
            "keo tản nhiệt khô",
            "CPU chạy quá tải"
        ],
        "suggestions": [
            "vệ sinh quạt",
            "thay keo tản nhiệt",
            "đóng app nền"
        ],
        "estimated_price": "200k - 500k",
        "need_technician": True
    },

    "screen_issue": {
        "severity": "high",
        "causes": [
            "panel màn hình lỗi",
            "cáp màn hình lỏng",
            "GPU lỗi"
        ],
        "suggestions": [
            "test màn hình ngoài",
            "kiểm tra cable",
            "mang kỹ thuật kiểm tra"
        ],
        "estimated_price": "500k - 3 triệu",
        "need_technician": True
    },

    "battery_charging_issue": {
        "severity": "medium",
        "causes": [
            "pin chai",
            "adapter lỗi",
            "IC sạc lỗi"
        ],
        "suggestions": [
            "thử adapter khác",
            "kiểm tra battery health"
        ],
        "estimated_price": "400k - 1.5 triệu",
        "need_technician": True
    },

    "boot_issue": {
        "severity": "critical",
        "causes": [
            "RAM lỗi",
            "SSD lỗi",
            "mainboard lỗi"
        ],
        "suggestions": [
            "tháo lắp RAM",
            "kiểm tra ổ cứng",
            "đem kỹ thuật kiểm tra"
        ],
        "estimated_price": "300k - 4 triệu",
        "need_technician": True
    },

    "keyboard_issue": {
        "severity": "low",
        "causes": [
            "bụi dưới phím",
            "liệt mạch phím"
        ],
        "suggestions": [
            "vệ sinh bàn phím",
            "thay keyboard"
        ],
        "estimated_price": "200k - 900k",
        "need_technician": True
    },

    "audio_issue": {
        "severity": "low",
        "causes": [
            "driver lỗi",
            "loa hỏng",
            "mic lỗi"
        ],
        "suggestions": [
            "cài lại driver",
            "test loa ngoài"
        ],
        "estimated_price": "100k - 800k",
        "need_technician": False
    },

    "unknown": {
        "severity": "unknown",
        "causes": [
            "không xác định được lỗi",
            "lỗi có thể từ thiết bị khác hoặc không phải laptop"
        ],
        "suggestions": [
            "mô tả chi tiết triệu chứng hơn",
            "liên hệ kỹ thuật viên để kiểm tra trực tiếp",
            "kiểm tra xem có phải lỗi phần mềm hay phần cứng không"
        ],
        "estimated_price": "tùy theo lỗi thực tế",
        "need_technician": True
    }
}