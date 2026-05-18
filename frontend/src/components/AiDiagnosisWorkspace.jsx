import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AI_DIAGNOSIS_BASE_URL, resolveAiAssetUrl } from "../api/aiApi";
import "./AiDiagnosisWorkspace.css";

/**
 * Presentation-only workspace for AI Device Diagnosis.
 * Parent (Home) owns chat state, API calls, and business rules — this file only renders UI.
 */

const THINKING_STEPS = [
  { key: "device", label: "Đang nhận diện thiết bị", icon: "◆" },
  { key: "symptoms", label: "Đang khớp triệu chứng", icon: "◎" },
  { key: "diag", label: "Đang tạo chẩn đoán", icon: "✦" },
];

function isLocalAiService() {
  try {
    const u = String(AI_DIAGNOSIS_BASE_URL || "").toLowerCase();
    return u.includes("localhost") || u.includes("127.0.0.1");
  } catch {
    return true;
  }
}

function deviceGlyph(deviceType = "") {
  const t = String(deviceType).toLowerCase();
  if (t.includes("phone") || t.includes("điện thoại") || t.includes("iphone") || t.includes("android"))
    return "📱";
  if (t.includes("laptop") || t.includes("macbook") || t.includes("notebook")) return "💻";
  if (t.includes("tablet") || t.includes("ipad")) return "📟";
  if (t.includes("robot") || t.includes("hút bụi") || t.includes("vacuum")) return "🤖";
  if (t.includes("watch") || t.includes("đồng hồ")) return "⌚";
  if (t.includes("audio") || t.includes("loa") || t.includes("tai nghe")) return "🎧";
  return "🛠️";
}

function severityClass(sev) {
  const s = String(sev || "").toLowerCase();
  if (["low", "minor", "nhẹ", "light"].some((x) => s.includes(x))) return "aiw-sev--low";
  if (["medium", "moderate", "trung bình", "vừa"].some((x) => s.includes(x))) return "aiw-sev--medium";
  if (["high", "severe", "cao", "nặng"].some((x) => s.includes(x))) return "aiw-sev--high";
  if (["critical", "khẩn", "nguy hiểm"].some((x) => s.includes(x))) return "aiw-sev--critical";
  return "aiw-sev--unknown";
}

function severityLabel(sev) {
  const s = String(sev || "unknown");
  return s.replace(/_/g, " ");
}

/** Typing effect for AI narrative text — keeps API unchanged; purely visual. */
function TypewriterText({ text, active, className }) {
  const [shown, setShown] = useState(() => (active ? "" : text || ""));

  useEffect(() => {
    if (!active) {
      setShown(text || "");
      return;
    }
    if (!text) {
      setShown("");
      return;
    }
    setShown("");
    let i = 0;
    const stepMs = 14;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, stepMs);
    return () => window.clearInterval(id);
  }, [text, active]);

  return <p className={className}>{shown}</p>;
}

function DiagnosisCard({ card, typewriter }) {
  const pct = Math.round((card.confidence || 0) * 100);
  return (
    <div className="aiw-card">
      <div className="aiw-card-head">
        <span className="aiw-device">
          <span className="aiw-device-ico" aria-hidden>
            {deviceGlyph(card.deviceType)}
          </span>
          <span>Thiết bị · {String(card.deviceType || "—").replace(/_/g, " ")}</span>
        </span>
        <span className={`aiw-sev ${severityClass(card.severity)}`}>
          Mức độ · {severityLabel(card.severity)}
        </span>
      </div>

      <div className="aiw-result-block">
        <div className="aiw-result-label">Kết quả chẩn đoán</div>
        <p className="aiw-result-title">{String(card.issueLabel || "").replace(/_/g, " ")}</p>
      </div>

      <div className="aiw-meter">
        <div className="aiw-meter-label">
          <span>Độ tin cậy mô hình</span>
          <span>{pct}%</span>
        </div>
        <div className="aiw-meter-track" aria-hidden>
          <div className="aiw-meter-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {card.causes?.length > 0 && (
        <div className="aiw-list-block">
          <h4>Nguyên nhân có thể</h4>
          <ul className="aiw-list">
            {card.causes.map((c, i) => (
              <li key={`c-${i}`}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {card.suggestions?.length > 0 && (
        <div className="aiw-list-block">
          <h4>Khuyến nghị</h4>
          <ul className="aiw-list">
            {card.suggestions.map((s, i) => (
              <li key={`s-${i}`}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {card.footnote ? (
        <TypewriterText
          text={card.footnote}
          active={typewriter}
          className="aiw-foot"
        />
      ) : null}
    </div>
  );
}

function ThinkingPanel({ phase }) {
  return (
    <div className="aiw-thinking">
      <div className="aiw-thinking-title">Đang phân tích yêu cầu của bạn…</div>
      <div className="aiw-steps" aria-live="polite">
        {THINKING_STEPS.map((s, idx) => {
          const on = idx <= phase;
          const spin = idx === phase;
          return (
            <div
              key={s.key}
              className={`aiw-step ${on ? "aiw-step--on" : ""} ${spin ? "aiw-step--spin" : ""}`}
            >
              <span className="aiw-step-icon" aria-hidden>
                {s.icon}
              </span>
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IconImage() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
      <path d="M4 20h16a2 2 0 002-2V8a2 2 0 00-2-2h-3.5L15 3H9L7.5 6H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function IconAttach() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
      <path d="M19 10v1a7 7 0 01-14 0v-1M12 18v4M8 22h8" />
    </svg>
  );
}

function ChatMessageImages({ images }) {
  if (!Array.isArray(images) || images.length === 0) return null;

  return (
    <div className="aiw-msg-images">
      {images.map((img, idx) => {
        const src = resolveAiAssetUrl(img?.url);
        if (!src) return null;
        return (
          <a
            key={`${img.url}-${idx}`}
            className="aiw-msg-image-link"
            href={src}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={src} alt={img.name || `Ảnh đính kèm ${idx + 1}`} className="aiw-msg-image" />
          </a>
        );
      })}
    </div>
  );
}

function formatSessionDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  chatSessions = [],
  activeChatSessionId = null,
  chatSessionsLoading = false,
  chatSessionLoading = false,
  onNewChatSession,
  onSelectChatSession,
  chatSessionsError = "",
  onReloadChatSessions,
  pendingImages = [],
  chatImageUploading = false,
  onAddChatImages,
  onRemovePendingImage,
}) {
  const streamEndRef = useRef(null);
  const taRef = useRef(null);
  const attachWrapRef = useRef(null);
  const imageInputRef = useRef(null);
  const [thinkPhase, setThinkPhase] = useState(0);
  const [attachOpen, setAttachOpen] = useState(false);

  const last = chatMessages[chatMessages.length - 1];
  const showThinking = Boolean(chatLoading && last?.pending);

  /** Đóng menu “+” khi bấm ra ngoài — chỉ UX, không đổi luồng dữ liệu. */
  useEffect(() => {
    if (!attachOpen) return undefined;
    const onDocMouseDown = (e) => {
      if (attachWrapRef.current && !attachWrapRef.current.contains(e.target)) {
        setAttachOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setAttachOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [attachOpen]);

  useEffect(() => {
    if (!showThinking) {
      setThinkPhase(0);
      return undefined;
    }
    setThinkPhase(0);
    const t1 = window.setTimeout(() => setThinkPhase(1), 420);
    const t2 = window.setTimeout(() => setThinkPhase(2), 900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [showThinking, chatMessages.length]);

  useLayoutEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages, showThinking]);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(160, el.scrollHeight);
    /* Khớp min-height .aiw-ta (36px) + padding shell — đồng bộ với --aiw-rail */
    el.style.height = `${Math.max(36, next)}px`;
  }, [chatInput]);

  const localMode = isLocalAiService();

  const submitSend = (text) => {
    setAttachOpen(false);
    onSend(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!chatLoading && !chatImageUploading && (chatInput.trim() || pendingImages.length)) {
        submitSend(chatInput);
      }
    }
  };

  const openImagePicker = () => {
    setAttachOpen(false);
    imageInputRef.current?.click();
  };

  const handleImageInputChange = (e) => {
    const files = e.target.files;
    if (files?.length && onAddChatImages) {
      onAddChatImages(files);
    }
    e.target.value = "";
  };

  const canSend = Boolean(chatInput.trim() || pendingImages.length);

  return (
    <div className="aiw">
      <div className="aiw-layout">
        <aside className="aiw-side" aria-label="Lịch sử và gợi ý nhanh">
          <div className="aiw-side-head">
            <span className="eyebrow">Lịch sử</span>
            <h3 className="section-title">Phiên chat đã lưu</h3>
          </div>

          <button
            type="button"
            className="aiw-new-chat-btn"
            disabled={chatLoading || chatSessionLoading}
            onClick={() => onNewChatSession?.()}
          >
            + Cuộc trò chuyện mới
          </button>

          <div className="aiw-history-list">
            {chatSessionsError ? (
              <div className="aiw-history-error">
                <p>{chatSessionsError}</p>
                {onReloadChatSessions ? (
                  <button type="button" className="aiw-history-retry" onClick={onReloadChatSessions}>
                    Thử tải lại
                  </button>
                ) : null}
              </div>
            ) : null}
            {chatSessionsLoading ? (
              <p className="aiw-history-empty">Đang tải lịch sử…</p>
            ) : !chatSessionsError && chatSessions.length === 0 ? (
              <p className="aiw-history-empty">
                Chưa có phiên chat. Gửi tin nhắn đầu tiên để hệ thống tự lưu lại.
              </p>
            ) : !chatSessionsError ? (
              chatSessions.map((session) => {
                const isActive = Number(session.id) === Number(activeChatSessionId);
                return (
                  <button
                    key={session.id}
                    type="button"
                    role="listitem"
                    className={`aiw-history-item${isActive ? " aiw-history-item--active" : ""}`}
                    disabled={chatLoading || chatSessionLoading}
                    onClick={() => onSelectChatSession?.(session.id)}
                  >
                    <strong>{session.title || "Phiên chat AI"}</strong>
                    <span>{formatSessionDate(session.updatedAt || session.createdAt)}</span>
                    <small>{session.messageCount || 0} tin nhắn</small>
                  </button>
                );
              })
            ) : null}
          </div>

          <div className="aiw-side-divider" aria-hidden />

          <div className="aiw-side-head">
            <span className="eyebrow">Gợi ý nhanh</span>
            <h3 className="section-title">Bắt đầu từ mẫu</h3>
          </div>
          <div className="aiw-prompt-grid">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="aiw-prompt"
                disabled={chatLoading}
                onClick={() => {
                  setAttachOpen(false);
                  onSend(prompt);
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </aside>

        <div className="aiw-main">
          <div className="aiw-main-head">
            <div>
              <span className="eyebrow">Phiên làm việc</span>
              <h3>Trợ lý IEMS</h3>
            </div>
            <div className="aiw-main-head-actions">
              {chatSessionLoading ? (
                <span className="aiw-session-loading">Đang tải phiên chat…</span>
              ) : null}
              <div className="aiw-status-row" aria-label="Trạng thái dịch vụ AI">
                {localMode ? (
                  <span className="aiw-badge aiw-badge--local">
                    <span className="aiw-badge-dot" />
                    AI Local
                  </span>
                ) : (
                  <span className="aiw-badge aiw-badge--online">
                    <span className="aiw-badge-dot" />
                    AI Online
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            className={`aiw-stream${chatSessionLoading ? " aiw-stream--loading" : ""}`}
            role="log"
            aria-relevant="additions"
            aria-live="polite"
          >
            {chatMessages.map((msg, index) => {
              const isUser = msg.role === "user";
              const rowCls = `aiw-msg ${isUser ? "aiw-msg--user" : "aiw-msg--ai"}`;

              if (msg.pending) {
                return (
                  <div key={`pending-${index}`} className={`${rowCls}`}>
                    <div className="aiw-avatar" aria-hidden title="IEMS AI">
                      ✦
                    </div>
                    <div className="aiw-bubble">
                      <div className="aiw-bubble-top">
                        <strong>{msg.title}</strong>
                        <span className="aiw-ts">{msg.time}</span>
                      </div>
                      <ThinkingPanel phase={thinkPhase} />
                    </div>
                  </div>
                );
              }

              return (
                <div key={`msg-${index}-${msg.time}`} className={rowCls}>
                  <div className="aiw-avatar" aria-hidden title={isUser ? "Bạn" : "IEMS AI"}>
                    {isUser ? "👤" : "✦"}
                  </div>
                  <div className="aiw-bubble">
                    <div className="aiw-bubble-top">
                      <strong>{msg.title}</strong>
                      <span className="aiw-ts">{msg.time}</span>
                    </div>

                    <ChatMessageImages images={msg.images} />

                    {msg.diagnosisCard ? (
                      <DiagnosisCard card={msg.diagnosisCard} typewriter={Boolean(msg.typewriter)} />
                    ) : msg.text ? (
                      <TypewriterText
                        text={msg.text || ""}
                        active={Boolean(msg.typewriter)}
                        className="aiw-body-text"
                      />
                    ) : null}

                    {msg.showRepairCta ? (
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

          <footer className="aiw-footer">
            {pendingImages.length > 0 || chatImageUploading ? (
              <div className="aiw-pending-images" aria-label="Ảnh sẽ gửi kèm tin nhắn">
                {chatImageUploading ? (
                  <span className="aiw-pending-uploading">Đang tải ảnh lên…</span>
                ) : null}
                {pendingImages.map((img, idx) => (
                  <div key={`${img.url}-${idx}`} className="aiw-pending-thumb">
                    <img
                      src={resolveAiAssetUrl(img.url)}
                      alt={img.name || `Ảnh ${idx + 1}`}
                    />
                    <button
                      type="button"
                      className="aiw-pending-remove"
                      aria-label="Xóa ảnh đính kèm"
                      disabled={chatLoading || chatImageUploading}
                      onClick={() => onRemovePendingImage?.(idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="aiw-input-row">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="aiw-file-input"
                onChange={handleImageInputChange}
                tabIndex={-1}
                aria-hidden
              />
              <div className="aiw-attach-wrap" ref={attachWrapRef}>
                <button
                  type="button"
                  className={`aiw-plus-btn${attachOpen ? " aiw-plus-btn--open" : ""}`}
                  disabled={chatLoading || chatImageUploading}
                  aria-expanded={attachOpen}
                  aria-haspopup="menu"
                  aria-label="Thêm ảnh đính kèm"
                  onClick={() => setAttachOpen((v) => !v)}
                >
                  <IconPlus />
                </button>
                {attachOpen ? (
                  <div className="aiw-attach-pop" role="menu">
                    <button
                      type="button"
                      className="aiw-attach-pop-item"
                      role="menuitem"
                      disabled={
                        chatLoading || chatImageUploading || pendingImages.length >= 3
                      }
                      onClick={openImagePicker}
                    >
                      <span className="aiw-attach-pop-ico" aria-hidden>
                        <IconImage />
                      </span>
                      <span>
                        <strong>Tải ảnh thiết bị</strong>
                        <small>JPG, PNG, WEBP — tối đa 3 ảnh, 6MB/ảnh</small>
                      </span>
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="aiw-input-shell">
                <div className="aiw-ta-wrap">
                  <textarea
                    ref={taRef}
                    className="aiw-ta"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Mô tả triệu chứng, model thiết bị và tình huống xảy ra gần đây… (Enter gửi, Shift+Enter xuống dòng)"
                    disabled={chatLoading || chatImageUploading}
                    rows={1}
                    aria-label="Nội dung tin nhắn cho trợ lý AI"
                  />
                </div>
              </div>

              <button
                type="button"
                className="aiw-mic-btn"
                disabled={chatLoading}
                title="Ghi âm giọng nói (sắp có)"
                aria-label="Ghi âm giọng nói, tính năng sắp ra mắt"
              >
                <IconMic />
              </button>
            </div>

            <div className="aiw-send-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setAttachOpen(false);
                  onClearInput();
                }}
                disabled={chatLoading}
              >
                Xóa
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => submitSend(chatInput)}
                disabled={chatLoading || chatImageUploading || !canSend}
              >
                {chatLoading ? "Đang phân tích…" : "Gửi"}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
