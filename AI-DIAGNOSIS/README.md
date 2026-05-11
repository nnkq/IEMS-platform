# AI Diagnosis Service

**Flask-based AI microservice for device symptom diagnosis using PyTorch text classification**

## Overview

The AI Diagnosis Service is a dedicated microservice that provides intelligent device diagnosis capabilities for the I-EMS platform. It uses a PyTorch-based transformer model to analyze device symptoms and generate diagnostic recommendations.

### Technology Stack
- **Web Framework:** Flask 3.0+
- **ML Framework:** PyTorch 2.1+
- **Model Type:** Transformer-based text classifier
- **Language:** Python 3.8+
- **Port:** 5001

## Quick Start

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Virtual environment (recommended)

### Installation

1. **Clone and navigate to directory:**
```bash
cd AI-DIAGNOSIS
```

2. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

### Running the Service

```bash
python src/app.py
```

The service will start on `http://localhost:5001`

**Expected output:**
```
 * Running on http://0.0.0.0:5001
 * Press CTRL+C to quit
```

### Testing the Service

```bash
curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "symptom": "máy tính nóng",
    "device_type": "laptop",
    "user_id": "test_user"
  }'
```

**Expected response:**
```json
{
  "issue": "overheating_issue",
  "confidence": 0.85,
  "severity": "medium",
  "causes": ["bụi bám quạt", "keo tản nhiệt khô"],
  "suggestions": ["vệ sinh quạt", "thay keo tản nhiệt"],
  "device_type": "laptop"
}
```

## API Specification

### Endpoint: POST /predict

**Description:** Analyze device symptoms and return diagnosis with recommendations

**Request:**
```json
{
  "symptom": "string (required) - Device problem description",
  "device_type": "string (optional) - Device category (laptop, phone, tablet, etc.)",
  "user_id": "string (optional) - User identifier for logging"
}
```

**Response (200 OK):**
```json
{
  "issue": "string - Identified issue category",
  "confidence": "number (0-1) - Model confidence score",
  "severity": "string - Severity level (low, medium, high)",
  "causes": ["array of strings - Possible root causes"],
  "suggestions": ["array of strings - Recommended actions"],
  "device_type": "string - Device category",
  "timestamp": "ISO 8601 timestamp"
}
```

**Error Response (400/500):**
```json
{
  "error": "string - Error message"
}
```

## Project Structure

```
AI-DIAGNOSIS/
├── src/
│   ├── app.py                      # Flask application entry point
│   ├── diagnosis_service.py        # Core diagnosis logic
│   ├── inference_text.py           # PyTorch model inference
│   ├── text_preprocessing.py       # Text cleaning & normalization
│   ├── label_map.py                # Issue label mapping
│   ├── metadata.py                 # Model metadata
│   ├── conversation_memory.py      # Conversation state
│   ├── memory.py                   # Memory management
│   ├── logger.py                   # Logging utilities
│   ├── train_text_classifier.py    # Model training script
│   └── verify_implementation.py    # Verification tests
│
├── models/
│   └── text_baseline/              # Trained model directory
│       ├── model.safetensors       # Model weights
│       ├── config.json             # Model configuration
│       ├── tokenizer.json          # Tokenizer
│       ├── tokenizer_config.json   # Tokenizer config
│       ├── checkpoint-183/         # Training checkpoint
│       └── checkpoint-488/         # Training checkpoint
│
├── data/
│   └── laptop/
│       ├── raw/                    # Original dataset
│       ├── processed/              # Processed data
│       ├── splits/                 # Train/val/test splits
│       └── images/                 # Reference images
│
├── logs/
│   └── unknown_cases.jsonl         # Unclassified cases log
│
├── requirements.txt                # Python dependencies
├── README.md                        # This file
└── .env.example                    # Environment variables template
```

## Configuration

### Environment Variables

Create `.env` file in `AI-DIAGNOSIS/` directory:

```bash
# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True
PORT=5001

# CORS Configuration
CORS_ORIGINS=["http://localhost:5173", "http://localhost:5000", "http://localhost:3000"]

# Model Configuration
MODEL_PATH=./models/text_baseline
DEVICE_TYPE=cpu  # or 'cuda' for GPU

# Logging
LOG_LEVEL=INFO
LOG_FILE=./logs/ai_service.log
```

## Model Management

### Current Model
- **Type:** Transformer-based text classifier
- **Training Data:** Device repair logs and troubleshooting data
- **Languages:** Vietnamese, English
- **Categories:** Device types (laptop, phone, tablet, etc.)
- **Versions:** Stored as checkpoints (183, 488, etc.)

### Training a New Model

```bash
python src/train_text_classifier.py \
  --data_dir ./data/laptop \
  --output_dir ./models/text_baseline \
  --epochs 20 \
  --batch_size 32
```

### Model Loading

Models are automatically loaded on service startup from `models/text_baseline/`. The service selects the latest compatible checkpoint.

## Monitoring & Logging

### Service Logs
- **Location:** `logs/ai_service.log`
- **Level:** INFO (configurable)
- **Format:** Timestamp | Level | Message

### Diagnosis Logs
- **Location:** Database table `ai_diagnosis_logs`
- **Content:** All inference requests/responses
- **Purpose:** Audit trail, model performance analysis

### Unknown Cases
- **Location:** `logs/unknown_cases.jsonl`
- **Content:** Symptoms that couldn't be reliably classified
- **Purpose:** Model improvement feedback

## Integration with I-EMS Backend

### Backend Integration Points

1. **Frontend calls Backend API:**
   ```
   POST /api/ai/diagnose
   ```

2. **Backend forwards to AI Service:**
   ```
   POST http://localhost:5001/predict
   ```

3. **Logging:**
   - Backend logs AI responses to `ai_diagnosis_logs` table
   - Used for analytics and model monitoring

## Performance

### Current Performance Metrics
- **Average Inference Time:** < 500ms
- **Model Size:** ~350MB (with weights)
- **Memory Usage:** ~2GB (GPU) or ~1GB (CPU)
- **Accuracy:** ~85% on test set
- **Throughput:** 20+ requests/second (single GPU)

### Optimization

For production deployment:
1. Use GPU acceleration (CUDA)
2. Implement model quantization
3. Use TorchServe for scaling
4. Add request batching

## Troubleshooting

### Issue: Port 5001 already in use
```bash
# Find process using port 5001
lsof -i :5001  # macOS/Linux
netstat -ano | findstr :5001  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Issue: CORS errors
- Verify `CORS_ORIGINS` in `.env` includes requesting URLs
- Check Flask-CORS middleware is initialized

### Issue: Model loading fails
```bash
# Verify model files exist
ls -la models/text_baseline/

# Regenerate tokenizer if corrupted
python src/train_text_classifier.py --regenerate-tokenizer
```

### Issue: Low inference accuracy
- Check if symptom is in training domain
- Review `logs/unknown_cases.jsonl` for patterns
- Retrain model with additional data

## Development

### Running Tests
```bash
pytest tests/ -v --cov=src
```

### Code Style
```bash
# Format code with black
black src/

# Check linting with pylint
pylint src/
```

## API Contract with Backend

The Backend (Express) communicates with AI Service using:

**Request Format:**
```javascript
const response = await axios.post('http://localhost:5001/predict', {
  symptom: 'device_symptom_text',
  device_type: 'laptop',
  user_id: 'user_identifier'
}, {
  timeout: 5000
});
```

**Error Handling:**
```javascript
try {
  const diagnosis = await diagnoseDevice(symptom, deviceType);
  // Store in ai_diagnosis_logs
  await logDiagnosis(userId, symptom, diagnosis);
} catch (error) {
  console.error('AI service unavailable:', error);
  // Fallback to manual diagnosis form
}
```

## Contributing

1. Create feature branch from `main`
2. Make changes with tests
3. Ensure `pytest` passes
4. Submit PR with description

## License

Part of I-EMS Capstone Project 2 (C2SE.57)

## Support

For issues or questions:
- Check logs in `logs/`
- Review existing issues in GitHub
- Contact team via project email

---

**Last Updated:** May 9, 2026  
**Maintainer:** I-EMS Development Team
