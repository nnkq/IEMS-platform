import os
import csv
import pandas as pd
from datetime import datetime
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_CSV = os.path.join(BASE_DIR, "data", "laptop", "processed", "laptop_dataset_300_samples.csv")
OUTPUT_CSV = os.path.join(BASE_DIR, "data", "laptop", "processed", "laptop_dataset_with_unknown.csv")

# Unknown data samples to add - ambiguous, out-of-scope, or generic issues
UNKNOWN_SAMPLES = [
    {
        "device_type": "phone",
        "symptom_text": "điện thoại em bị chậm sau khi cập nhật",
        "severity": "low",
        "recommendation": "Thử xóa cache hoặc khởi động lại thiết bị"
    },
    {
        "device_type": "phone",
        "symptom_text": "các ứng dụng hay bị lỗi khi chạy đồng thời",
        "severity": "low",
        "recommendation": "Kiểm tra bộ nhớ, đóng các ứng dụng nền"
    },
    {
        "device_type": "tablet",
        "symptom_text": "máy tính bảng kết nối wifi nhưng không vào mạng được",
        "severity": "medium",
        "recommendation": "Khởi động lại modem, quên mạng rồi kết nối lại"
    },
    {
        "device_type": "desktop",
        "symptom_text": "máy tính để bàn bị đứng yên không phản hồi",
        "severity": "high",
        "recommendation": "Kiểm tra kết nối, bật lại máy"
    },
    {
        "device_type": "laptop",
        "symptom_text": "máy vừa bật vừa tắt, chưa kịp vào hệ điều hành",
        "severity": "high",
        "recommendation": "Kiểm tra bộ cấp nguồn, phần mềm BIOS"
    },
    {
        "device_type": "monitor",
        "symptom_text": "màn hình máy tính không nhận tín hiệu từ CPU",
        "severity": "medium",
        "recommendation": "Kiểm tra cáp kết nối, thay cáp HDMI"
    },
    {
        "device_type": "printer",
        "symptom_text": "máy in không kết nối được với laptop",
        "severity": "low",
        "recommendation": "Cài lại driver, kiểm tra cáp USB"
    },
    {
        "device_type": "phone",
        "symptom_text": "mặt kính điện thoại bị vỡ nhưng còn chạy được",
        "severity": "medium",
        "recommendation": "Thay kính bảo vệ hoặc thay màn hình"
    },
    {
        "device_type": "laptop",
        "symptom_text": "máy tính có mùi cháy lạ, hơi khó chịu",
        "severity": "high",
        "recommendation": "Tắt ngay, mang đi kiểm tra, có thể lỗi linh kiện"
    },
    {
        "device_type": "other",
        "symptom_text": "thiết bị không lên nguồn dù đã thay adapter mới",
        "severity": "high",
        "recommendation": "Kiểm tra lô cấp điện, pin tích lũy"
    },
    {
        "device_type": "tablet",
        "symptom_text": "bàn phím bluetooth không kết nối được",
        "severity": "low",
        "recommendation": "Ghép lại thiết bị, cập nhật driver"
    },
    {
        "device_type": "laptop",
        "symptom_text": "máy nóng nhưng quạt không quay, chỉ nghe tiếng kêu lạ",
        "severity": "high",
        "recommendation": "Có thể quạt bị kẹt, cần vệ sinh hoặc thay"
    },
    {
        "device_type": "phone",
        "symptom_text": "camera không focus được khi chụp ảnh gần",
        "severity": "low",
        "recommendation": "Lau lens camera, thử reset camera app"
    },
    {
        "device_type": "laptop",
        "symptom_text": "âm thanh loa bị vỡ, phát ra tiếng kêu khó chịu",
        "severity": "low",
        "recommendation": "Hạ volume, thay loa nếu cần"
    },
    {
        "device_type": "other",
        "symptom_text": "cáp sạc bị hỏng, chỉ sạc được ở góc nào đó",
        "severity": "low",
        "recommendation": "Thay cáp sạc mới"
    },
    {
        "device_type": "monitor",
        "symptom_text": "độ sáng trên màn hình không điều chỉnh được",
        "severity": "low",
        "recommendation": "Kiểm tra nút điều chỉnh vật lý hoặc menu"
    },
    {
        "device_type": "phone",
        "symptom_text": "pin máy điện thoại phồng ra ngoài pin",
        "severity": "high",
        "recommendation": "Không sử dụng, mang đi kiểm tra ngay"
    },
    {
        "device_type": "laptop",
        "symptom_text": "touchpad em bị nặng, chạm vào không có phản ứng",
        "severity": "medium",
        "recommendation": "Cập nhật driver touchpad, thay pin bàn phím"
    },
    {
        "device_type": "other",
        "symptom_text": "thiết bị em mua cũng không có chế độ chuyên sâu",
        "severity": "low",
        "recommendation": "Xem hướng dẫn sử dụng"
    },
    {
        "device_type": "desktop",
        "symptom_text": "quạt tản nhiệt CPU phát tiếng rè rè rất to",
        "severity": "medium",
        "recommendation": "Vệ sinh quạt, thay keo tản nhiệt"
    },
    {
        "device_type": "phone",
        "symptom_text": "loa ngoài điện thoại vẫn phát âm mà loa trong im lặng",
        "severity": "low",
        "recommendation": "Kiểm tra cài đặt âm thanh, thử khởi động lại"
    },
    {
        "device_type": "tablet",
        "symptom_text": "màn hình cảm ứng không phản ứng ở một góc nào đó",
        "severity": "medium",
        "recommendation": "Hiệu chỉnh màn hình cảm ứng hoặc thay panel"
    },
    {
        "device_type": "laptop",
        "symptom_text": "máy tính chạy rất chậm, ngay cả khi không chạy chương trình nào",
        "severity": "medium",
        "recommendation": "Kiểm tra CPU/RAM, cài đặt lại hệ điều hành"
    },
    {
        "device_type": "other",
        "symptom_text": "công suất máy yếu hơn bình thường, hiệu năng giảm",
        "severity": "low",
        "recommendation": "Kiểm tra cài đặt hiệu năng, cập nhật driver"
    },
    {
        "device_type": "phone",
        "symptom_text": "mạng 4G chỉ kết nối được mà tốc độ rất chậm",
        "severity": "low",
        "recommendation": "Kiểm tra sóng mạng, thử chuyển sang 3G"
    },
    {
        "device_type": "laptop",
        "symptom_text": "máy em có lỗi lạ không thể mô tả cụ thể",
        "severity": "medium",
        "recommendation": "Mô tả chi tiết hơn hoặc mang đi kiểm tra"
    },
    {
        "device_type": "monitor",
        "symptom_text": "màn hình nhấp nháy nhẹ nhàng, hầu như không thấy",
        "severity": "low",
        "recommendation": "Điều chỉnh tần số màn hình hoặc thay cáp"
    },
    {
        "device_type": "desktop",
        "symptom_text": "PC không nhận ổ cứng mới sau khi lắp vào",
        "severity": "high",
        "recommendation": "Kiểm tra dây kết nối, BIOS settings"
    },
    {
        "device_type": "phone",
        "symptom_text": "viền pin phù, pin không vừa vặn trong khe",
        "severity": "high",
        "recommendation": "Thay pin mới, không tự tháo"
    },
    {
        "device_type": "laptop",
        "symptom_text": "em không biết máy bị gì, chỉ biết không chạy được như trước",
        "severity": "medium",
        "recommendation": "Mô tả triệu chứng cụ thể hơn"
    },
    {
        "device_type": "other",
        "symptom_text": "thiết bị cũ không còn được bảo hành",
        "severity": "low",
        "recommendation": "Mang đi sửa chữa theo yêu cầu"
    },
    {
        "device_type": "tablet",
        "symptom_text": "máy tính bảng kết nối USB nhưng không nhận thiết bị",
        "severity": "medium",
        "recommendation": "Kiểm tra cáp USB, cập nhật driver"
    },
    {
        "device_type": "phone",
        "symptom_text": "thẻ SIM không được nhận sau khi cập nhật",
        "severity": "medium",
        "recommendation": "Đặt lại thẻ SIM, khởi động lại điện thoại"
    },
    {
        "device_type": "laptop",
        "symptom_text": "máy em từng lỏng nhưng giờ chặt lại, có vấn đề",
        "severity": "low",
        "recommendation": "Kiểm tra vít, cơ khí máy tính"
    },
    {
        "device_type": "monitor",
        "symptom_text": "loa trên màn hình phát tiếng lạ, không rõ ràng",
        "severity": "low",
        "recommendation": "Kiểm tra mức âm, kết nối audio"
    },
    {
        "device_type": "desktop",
        "symptom_text": "đèn LED trên case PC sáng bất thường",
        "severity": "low",
        "recommendation": "Kiểm tra kết nối dây LED, cài đặt"
    },
    {
        "device_type": "phone",
        "symptom_text": "ứng dụng store bị lỗi không thể tải được",
        "severity": "low",
        "recommendation": "Xóa cache, cập nhật ứng dụng store"
    },
    {
        "device_type": "laptop",
        "symptom_text": "máy tính em không tìm được network mới",
        "severity": "medium",
        "recommendation": "Cập nhật driver mạng, reset Wifi"
    },
    {
        "device_type": "other",
        "symptom_text": "thiết bị quá cũ, không còn phụ tùng thay thế",
        "severity": "high",
        "recommendation": "Mua thiết bị mới hoặc tìm cách thay thế"
    },
    {
        "device_type": "tablet",
        "symptom_text": "pin máy tính bảng chai sau 5 năm sử dụng",
        "severity": "medium",
        "recommendation": "Thay pin mới"
    },
    {
        "device_type": "phone",
        "symptom_text": "hệ điều hành điện thoại cùi, không update được",
        "severity": "low",
        "recommendation": "Kiểm tra bộ nhớ, cập nhật thủ công"
    },
    {
        "device_type": "laptop",
        "symptom_text": "máy em vừa mua mà chất lượng âm thanh không tốt",
        "severity": "low",
        "recommendation": "Kiểm tra driver âm thanh, cài đặt"
    },
    {
        "device_type": "monitor",
        "symptom_text": "góc hiển thị màn hình không đều, bên trái bên phải khác nhau",
        "severity": "low",
        "recommendation": "Điều chỉnh góc màn hình hoặc cài đặt"
    },
    {
        "device_type": "desktop",
        "symptom_text": "fan mains supply bị ầm ầm, tiếng gió rất to",
        "severity": "low",
        "recommendation": "Thay quạt hoặc vệ sinh quạt"
    },
    {
        "device_type": "phone",
        "symptom_text": "nút bấm điều khiển âm lượng bị chết một bên",
        "severity": "low",
        "recommendation": "Sử dụng menu điều chỉnh, thay nút bấm"
    },
    {
        "device_type": "laptop",
        "symptom_text": "em không rõ là lỗi phần mềm hay phần cứng",
        "severity": "medium",
        "recommendation": "Thử restart hoặc cài lại Windows"
    },
    {
        "device_type": "other",
        "symptom_text": "cáp HDMI bị hỏng, màn hình không hiện",
        "severity": "medium",
        "recommendation": "Thay cáp HDMI hoặc sử dụng chuẩn khác"
    },
    {
        "device_type": "tablet",
        "symptom_text": "màn hình máy tính bảng có điểm chết không hiển thị",
        "severity": "low",
        "recommendation": "Thay panel hoặc sửa chữa"
    },
    {
        "device_type": "phone",
        "symptom_text": "âm lượng rung của điện thoại không hoạt động",
        "severity": "low",
        "recommendation": "Kiểm tra cài đặt, thay motor rung"
    },
    {
        "device_type": "laptop",
        "symptom_text": "máy tính phát tiếng kêu từ quạt chỉ lúc startup",
        "severity": "low",
        "recommendation": "Cấu hình quạt, kiểm tra BIOS"
    },
]


def main():
    # Read existing data
    existing_df = pd.read_csv(INPUT_CSV)
    print(f"Original dataset: {len(existing_df)} samples")
    
    # Get the max ID to continue numbering
    max_id = 0
    for idx in existing_df["id"]:
        try:
            num = int(idx.split("_")[1])
            max_id = max(max_id, num)
        except:
            pass
    
    # Create new unknown samples
    new_samples = []
    for i, sample in enumerate(UNKNOWN_SAMPLES):
        new_id = f"unk_{i+1:04d}"
        new_samples.append({
            "id": new_id,
            "device_type": sample["device_type"],
            "symptom_text": sample["symptom_text"],
            "image_path": "",
            "label": "unknown",
            "severity": sample["severity"],
            "recommendation": sample["recommendation"]
        })
    
    # Create new dataframe
    new_df = pd.DataFrame(new_samples)
    
    # Combine dataframes
    combined_df = pd.concat([existing_df, new_df], ignore_index=True)
    
    # Save combined dataset
    combined_df.to_csv(OUTPUT_CSV, index=False)
    
    print(f"\n✓ Added {len(new_df)} unknown samples")
    print(f"✓ New dataset: {len(combined_df)} samples")
    print(f"\nLabel distribution:")
    print(combined_df["label"].value_counts())
    print(f"\nDevice type distribution:")
    print(combined_df["device_type"].value_counts())
    print(f"\n✓ Saved to: {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
