import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from text_preprocessing import normalize_text

MODEL_PATH = "D:/CAPSTONE2/new/IEMS-platform/AI-DIAGNOSIS/models/text_baseline"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
model.to(device)
model.eval()

id2label = model.config.id2label


def predict_issue(text):
    
    text = normalize_text(text)   # 👈 QUAN TRỌNG NHẤT
    
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=128
    )

    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    probs = F.softmax(outputs.logits, dim=1)

    confidence, pred_id = torch.max(probs, dim=1)

    # 🔥 NEW: lấy top2
    top2 = torch.topk(probs, 2)

    top1_prob = top2.values[0][0].item()
    top2_prob = top2.values[0][1].item()

    label = id2label[pred_id.item()]

    # 🔥 RULE: nếu model không chắc chắn → UNKNOWN
    if (top1_prob - top2_prob) < 0.15:
        return "unknown", round(top1_prob, 4)

    return label, round(confidence.item(), 4)