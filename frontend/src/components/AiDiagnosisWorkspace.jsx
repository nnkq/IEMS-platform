import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AI_DIAGNOSIS_BASE_URL } from "../api/aiApi";
import "./AiDiagnosisWorkspace.css";

const THINKING_STEPS = [
  "Nhận diện thiết bị",
  "Đối chiếu triệu chứng",
  "Tạo gợi ý xử lý",
];

function isLocalAiService() {
  const url = String(AI_DIAGNOSIS_BASE_URL || "").toLowerCase();
  return url.includes("localhost") || url.includes("127.0.0.1");
}

function deviceLabel(deviceType = "") {
  return String(deviceType || "Thiết bị").replace(/_/g, " ");
}

function deviceIcon(deviceType = "") {
  const value = String(deviceType).toLowerCase();
  if (value.includes("phone") || value.includes("điện thoại") || value.includes("iphone")) return "ĐT";
  if (value.includes("laptop") || value.includes("macbook")) return "LT";
  if (value.includes("tablet") || value.includes("ipad")) return "TB";
  if (value.includes("watch") || value.includes("đồng hồ")) return "SW";
  return "AI";
}

function severityClass(severity) {
  const value = String(severity || "").toLowerCase();
  if (["low", "minor", "nhẹ"].some((item) => value.includes(item))) return "aiw-sev--low";
  if (["medium", "moderate", "trung bình", "vừa"].some((item) => value.includes(item))) return "aiw-sev--medium";
  if (["high", "severe", "cao", "nặng"].some((item) => value.includes(item))) return "aiw-sev--high";
  if (["critical", "khẩn", "nguy hiểm"].some((item) => value.includes(item))) return "aiw-sev--critical";
  return "aiw-sev--unknown";
}

function severityLabel(severity) {
  const value = String(severity || "Chưa rõ").replace(/_/g, " ");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function TypewriterText({ text, active, className }) {
  const [shown, setShown] = useState(() => (active ? "" : text || ""));

  useEffect(() => {
    if (!active) {
      setShown(text || "");
      return undefined;
    }
    setShown("");
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      setShown(String(text || "").slice(0, index));
      if (index >= String(text || "").length) window.clearInterval(id);
    }, 12);
    return () => window.clearInterval(id);
  }, [text, active]);

  return <p className={className}>{shown}</p>;
}

function DiagnosisCard({ card, typewriter }) {
  const confidence = Math.max(0, Math.min(100, Math.round((Number(card.confidence) || 0) * 100)));

  return (
    <div className="aiw-card">
      <div className="aiw-card-top">
        <span className="aiw-device-pill">
          <span>{deviceIcon(card.deviceType)}</span>
          {deviceLabel(card.deviceType)}
        </span>
        <span className={`aiw-sev ${severityClass(card.severity)}`}>
          {severityLabel(card.severity)}
        </span>
      </div>

      <div className="aiw-result">
        <span>Kết quả dự đoán</span>
        <strong>{String(card.issueLabel || "Chưa xác định").replace(/_/g, " ")}</strong>
      </div>

      <div className="aiw-confidence">
        <div>
          <span>Độ tin cậy</span>
          <strong>{confidence}%</strong>
        </div>
        <div className="aiw-confidence-track">
          <div style={{ width: `${confidence}%` }} />
        </div>
      </div>

      {card.causes?.length > 0 && (
        <div className="aiw-card-section">
          <h4>Nguyên nhân có thể</h4>
          <ul>
            {card.causes.map((cause, index) => (
              <li key={`cause-${index}`}>{cause}</li>
            ))}
          </ul>
        </div>
      )}

      {card.suggestions?.length > 0 && (
        <div className="aiw-card-section">
          <h4>Khuyến nghị</h4>
          <ul>
            {card.suggestions.map((suggestion, index) => (
              <li key={`suggestion-${index}`}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {card.footnote ? (
        <TypewriterText text={card.footnote} active={typewriter} className="aiw-note" />
      ) : null}
    </div>
  );
}

function ThinkingPanel({ phase }) {
  return (
    <div className="aiw-thinking">
      <strong>Đang phân tích yêu cầu...</strong>
      <div className="aiw-thinking-steps">
        {THINKING_STEPS.map((step, index) => (
          <span key={step} className={index <= phase ? "active" : ""}>
            {step}
          </span>
        ))}
      </div>
    </div>
  );
}

function IconSend() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

export default function AiDiagnosisWorkspace({
  chatMessages,
  chatInput,
  setChatInput,
  chatLoading,
  onSend,
  onClearInput,
  quickPrompts,
  onOpenRepairRequest,
}) {
  const streamEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [thinkPhase, setThinkPhase] = useState(0);

  const localMode = isLocalAiService();
  const lastMessage = chatMessages[chatMessages.length - 1];
  const showThinking = Boolean(chatLoading && lastMessage?.pending);

  useEffect(() => {
    if (!showThinking) {
      setThinkPhase(0);
      return undefined;
    }

    setThinkPhase(0);
    const first = window.setTimeout(() => setThinkPhase(1), 420);
    const second = window.setTimeout(() => setThinkPhase(2), 900);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [showThinking, chatMessages.length]);

  useLayoutEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages, showThinking]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const nextHeight = Math.max(44, Math.min(132, textarea.scrollHeight));
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 132 ? "auto" : "hidden";
  }, [chatInput]);

  const submitSend = (text) => {
    const clean = String(text || "").trim();
    if (!clean || chatLoading) return;
    onSend(clean);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitSend(chatInput);
    }
  };

  return (
    <div className="aiw">
      <section className="aiw-chat" aria-label="Phiên trò chuyện với trợ lý AI">
        <div className="aiw-chat-head">
          <div className="aiw-chat-title">
            <div className="aiw-bot-mark">AI</div>
            <div>
              <strong>Trợ lý IEMS</strong>
              <span>Mô tả lỗi, dòng máy và thời điểm xảy ra để nhận gợi ý ban đầu.</span>
            </div>
          </div>

          <span className={`aiw-status ${localMode ? "local" : "online"}`}>
            {localMode ? "AI Local" : "AI Online"}
          </span>
        </div>

        <div className="aiw-prompt-strip" aria-label="Gợi ý nhanh">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="aiw-prompt"
              disabled={chatLoading}
              onClick={() => onSend(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="aiw-stream" role="log" aria-live="polite" aria-relevant="additions">
          {chatMessages.map((message, index) => {
            const isUser = message.role === "user";
            const rowClass = `aiw-msg ${isUser ? "aiw-msg--user" : "aiw-msg--ai"}`;

            if (message.pending) {
              return (
                <div className={rowClass} key={`pending-${index}`}>
                  <div className="aiw-avatar">AI</div>
                  <div className="aiw-bubble">
                    <div className="aiw-bubble-meta">
                      <strong>{message.title}</strong>
                      <span>{message.time}</span>
                    </div>
                    <ThinkingPanel phase={thinkPhase} />
                  </div>
                </div>
              );
            }

            return (
              <div className={rowClass} key={`message-${index}-${message.time}`}>
                <div className="aiw-avatar">{isUser ? "Bạn" : "AI"}</div>
                <div className="aiw-bubble">
                  <div className="aiw-bubble-meta">
                    <strong>{message.title}</strong>
                    <span>{message.time}</span>
                  </div>

                  {message.diagnosisCard ? (
                    <DiagnosisCard card={message.diagnosisCard} typewriter={Boolean(message.typewriter)} />
                  ) : (
                    <TypewriterText
                      text={message.text || ""}
                      active={Boolean(message.typewriter)}
                      className="aiw-message-text"
                    />
                  )}

                  {message.showRepairCta ? (
                    <div className="aiw-cta">
                      <button type="button" className="btn btn-primary" onClick={onOpenRepairRequest}>
                        Tạo yêu cầu sửa chữa
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div ref={streamEndRef} />
        </div>

        <footer className="aiw-composer">
          <textarea
            ref={textareaRef}
            className="aiw-input"
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ví dụ: iPhone 12 sạc chậm, máy nóng và tụt pin nhanh..."
            disabled={chatLoading}
            rows={1}
            aria-label="Nội dung gửi cho trợ lý AI"
          />
          <div className="aiw-actions">
            <button type="button" className="btn btn-secondary" onClick={onClearInput} disabled={chatLoading || !chatInput}>
              Xóa
            </button>
            <button
              type="button"
              className="btn btn-primary aiw-send"
              onClick={() => submitSend(chatInput)}
              disabled={chatLoading || !chatInput.trim()}
            >
              <IconSend />
              {chatLoading ? "Đang phân tích" : "Gửi"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
