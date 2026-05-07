from flask import Flask, request, jsonify
from flask_cors import CORS
from diagnosis_service import diagnose

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000"])


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        if not data or "symptom" not in data:
            return jsonify({"error": "Missing symptom"}), 400

        text = data["symptom"]

        user_id = data.get("user_id", "default_user")

        device_type = data.get("device_type", "laptop")

        result = diagnose(text, device_type, user_id)

        return jsonify(result)

    except Exception as e:
        print("[FATAL ERROR]", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)