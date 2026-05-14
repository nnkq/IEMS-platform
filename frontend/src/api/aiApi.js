import axios from "axios";

/** Base URL for the Python diagnosis service — exported for UI (local vs online badge) only. */
export const AI_DIAGNOSIS_BASE_URL = "http://localhost:5001";

/**
 * Call the AI diagnosis service to predict device issue
 * @param {string} symptom - Description of the device issue/symptom
 * @param {string} deviceType - Type of device (default: "laptop")
 * @returns {Promise} Response from AI model containing:
 *   - issue: The predicted issue type
 *   - confidence: Confidence score (0-1)
 *   - severity: Issue severity level
 *   - causes: Array of likely causes
 *   - suggestions: Array of recommended solutions
 *   - message: Human-readable message
 */
export const diagnoseDevice = async (symptom, deviceType = "laptop") => {
  try {
    const response = await axios.post(`${AI_DIAGNOSIS_BASE_URL}/predict`, {
      symptom: symptom.trim(),
      device_type: deviceType.toLowerCase(),
    });

    return response.data;
  } catch (error) {
    console.error("Lỗi gọi AI diagnosis API:", error);
    
    // Return a fallback response
    return {
      issue: "error",
      confidence: 0,
      device_type: deviceType,
      severity: "unknown",
      causes: [],
      suggestions: [],
      message: error.response?.data?.message || "Không thể kết nối đến dịch vụ AI. Vui lòng thử lại.",
    };
  }
};

export default {
  diagnoseDevice,
};
