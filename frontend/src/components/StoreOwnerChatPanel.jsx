import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getStoreConversations,
  getConversationMessages,
  sendChatMessageApi,
  markConversationRead,
} from "../api/chatApi";
import "./StoreChatPanel.css";

function formatThreadTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  return isToday
    ? date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      });
}

function formatBubbleTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildAvatarLabel(name = "") {
  const clean = name.trim();
  if (!clean) return "KH";
  return clean
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function StoreOwnerChatPanel({
  storeId,
  storeName = "Cửa hàng của tôi",
}) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [messages, setMessages] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [draft, setDraft] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const bottomRef = useRef(null);

  const localUser = JSON.parse(localStorage.getItem("user") || "{}");
  const resolvedStoreId = storeId || localUser?.id || null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const loadThreads = async () => {
    if (!resolvedStoreId) return;

    try {
      setLoadingThreads(true);
      const res = await getStoreConversations(resolvedStoreId);
      const conversationList = Array.isArray(res.data) ? res.data : [];
      setThreads(conversationList);

      if (!activeThreadId && conversationList.length > 0) {
        setActiveThreadId(conversationList[0].conversation_id);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách hội thoại store:", error);
    } finally {
      setLoadingThreads(false);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!conversationId) return;

    try {
      setLoadingMessages(true);

      const res = await getConversationMessages(conversationId);
      const messageList = Array.isArray(res.data) ? res.data : [];
      setMessages(messageList);

      await markConversationRead(conversationId, "store");
    } catch (error) {
      console.error("Lỗi lấy tin nhắn conversation store:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    loadThreads();
    const timer = setInterval(() => {
      loadThreads();
    }, 3000);

    return () => clearInterval(timer);
  }, [isOpen, resolvedStoreId]);

  useEffect(() => {
    if (!isOpen || !activeThreadId) return;

    loadMessages(activeThreadId);

    const timer = setInterval(() => {
      loadMessages(activeThreadId);
    }, 2500);

    return () => clearInterval(timer);
  }, [isOpen, activeThreadId]);

  useEffect(() => {
    if (!isOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const filteredThreads = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return threads.filter((thread) => {
      const content = [
        thread.customer_name,
        thread.title,
        thread.brand,
        thread.model,
        thread.device_type,
        thread.repair_request_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return keyword ? content.includes(keyword) : true;
    });
  }, [threads, searchText]);

  useEffect(() => {
    if (!filteredThreads.length) return;

    const hasActive = filteredThreads.some(
      (thread) => thread.conversation_id === activeThreadId
    );

    if (!hasActive) {
      setActiveThreadId(filteredThreads[0].conversation_id);
    }
  }, [filteredThreads, activeThreadId]);

  const activeThread =
    threads.find((thread) => thread.conversation_id === activeThreadId) || null;

  const totalUnread = threads.reduce(
    (sum, thread) => sum + Number(thread.unread_count || 0),
    0
  );

  const quickReplies = [
    "Dạ em đã nhận thông tin của anh/chị ạ.",
    "Anh/chị vui lòng gửi thêm hình ảnh giúp em nhé.",
    "Cửa hàng có thể kiểm tra máy trong hôm nay ạ.",
  ];

  const handleSendMessage = async () => {
    if (!draft.trim() || !activeThreadId || !resolvedStoreId) return;

    try {
      await sendChatMessageApi({
        conversation_id: activeThreadId,
        sender_role: "store",
        sender_id: resolvedStoreId,
        message: draft.trim(),
      });

      setDraft("");
      await loadMessages(activeThreadId);
      await loadThreads();
    } catch (error) {
      console.error("Lỗi gửi tin nhắn store:", error);
      alert("Không gửi được tin nhắn");
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {isOpen && (
        <div
          className="iems-floating-chat__backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="iems-floating-chat">
        {!isOpen && (
          <button
            type="button"
            className="iems-floating-chat__launcher"
            onClick={() => setIsOpen(true)}
            aria-label="Mở chat khách hàng"
          >
            <span className="iems-floating-chat__launcher-icon">💬</span>
            {totalUnread > 0 && (
              <span className="iems-floating-chat__launcher-badge">
                {totalUnread}
              </span>
            )}
          </button>
        )}

        <div className={`iems-floating-chat__panel ${isOpen ? "show" : ""}`}>
          <div className="iems-floating-chat__header">
            <div className="iems-floating-chat__header-copy">
              <strong>Chat khách hàng</strong>
              <span>Trao đổi trực tiếp với khách đang gửi yêu cầu sửa chữa</span>
            </div>

            <button
              type="button"
              className="iems-floating-chat__close"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng chat"
            >
              ×
            </button>
          </div>

          <div className="iems-floating-chat__body">
            <aside className="iems-floating-chat__sidebar">
              <div className="iems-floating-chat__search">
                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Tìm khách hàng hoặc thiết bị"
                />
              </div>

              <div className="iems-floating-chat__threads">
                {loadingThreads && threads.length === 0 ? (
                  <div className="iems-floating-chat__empty">
                    Đang tải hội thoại...
                  </div>
                ) : filteredThreads.length > 0 ? (
                  filteredThreads.map((thread) => {
                    const deviceLabel = [
                      thread.brand,
                      thread.model,
                      thread.title || thread.device_type,
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <button
                        key={thread.conversation_id}
                        type="button"
                        className={`iems-floating-chat__thread ${
                          thread.conversation_id === activeThreadId ? "active" : ""
                        }`}
                        onClick={() => setActiveThreadId(thread.conversation_id)}
                      >
                        <div className="iems-floating-chat__thread-avatar">
                          {buildAvatarLabel(thread.customer_name || "KH")}
                        </div>

                        <div className="iems-floating-chat__thread-content">
                          <div className="iems-floating-chat__thread-top">
                            <strong>{thread.customer_name || "Khách hàng"}</strong>
                            <span>{formatThreadTime(thread.last_message_time)}</span>
                          </div>

                          <div className="iems-floating-chat__thread-sub">
                            {deviceLabel || `Yêu cầu #${thread.repair_request_id}`}
                          </div>

                          <div className="iems-floating-chat__thread-meta">
                            <span className="tag">
                              #{thread.repair_request_id}
                            </span>
                            {Number(thread.unread_count || 0) > 0 && (
                              <span className="badge">{thread.unread_count}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="iems-floating-chat__empty">
                    Chưa có hội thoại nào.
                  </div>
                )}
              </div>
            </aside>

            <section className="iems-floating-chat__main">
              {activeThread ? (
                <>
                  <div className="iems-floating-chat__chat-head">
                    <div className="iems-floating-chat__chat-identity">
                      <div className="iems-floating-chat__chat-avatar">
                        {buildAvatarLabel(activeThread.customer_name || "KH")}
                      </div>

                      <div>
                        <strong>{activeThread.customer_name || "Khách hàng"}</strong>
                        <span>Yêu cầu #{activeThread.repair_request_id}</span>
                      </div>
                    </div>

                    <div className="iems-floating-chat__chat-chips">
                      <span className="chip chip--soft">
                        #{activeThread.repair_request_id}
                      </span>
                      <span className="chip chip--primary">
                        {[activeThread.brand, activeThread.model].filter(Boolean).join(" · ") ||
                          activeThread.title ||
                          activeThread.device_type ||
                          "Thiết bị"}
                      </span>
                    </div>
                  </div>

                  <div className="iems-floating-chat__stream">
                    {loadingMessages && messages.length === 0 ? (
                      <div className="iems-floating-chat__empty-main">
                        <strong>Đang tải tin nhắn...</strong>
                      </div>
                    ) : messages.length > 0 ? (
                      messages.map((message) => {
                        const isMine = message.sender_role === "store";

                        return (
                          <div
                            key={message.id}
                            className={`iems-floating-chat__bubble ${
                              isMine ? "mine" : "theirs"
                            }`}
                          >
                            <div className="iems-floating-chat__bubble-head">
                              <strong>
                                {isMine
                                  ? storeName || "Cửa hàng"
                                  : activeThread.customer_name || "Khách hàng"}
                              </strong>
                              <span>{formatBubbleTime(message.created_at)}</span>
                            </div>
                            <p>{message.message}</p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="iems-floating-chat__empty-main">
                        <div className="iems-floating-chat__empty-icon">💬</div>
                        <strong>Chưa có tin nhắn</strong>
                        <p>Hãy phản hồi khách hàng để bắt đầu cuộc trò chuyện.</p>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  <div className="iems-floating-chat__quick-replies">
                    {quickReplies.map((reply) => (
                      <button
                        type="button"
                        key={reply}
                        onClick={() => setDraft(reply)}
                      >
                        {reply}
                      </button>
                    ))}
                  </div>

                  <div className="iems-floating-chat__composer">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Nhập phản hồi cho khách hàng..."
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />

                    <div className="iems-floating-chat__composer-actions">
                      <button
                        type="button"
                        className="iems-floating-chat__btn iems-floating-chat__btn--ghost"
                        onClick={() => setDraft("")}
                      >
                        Xóa nhanh
                      </button>
                      <button
                        type="button"
                        className="iems-floating-chat__btn iems-floating-chat__btn--primary"
                        onClick={handleSendMessage}
                      >
                        Gửi
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="iems-floating-chat__empty-main">
                  <div className="iems-floating-chat__empty-icon">💬</div>
                  <strong>Chưa có hội thoại</strong>
                  <p>Hội thoại sẽ xuất hiện khi user tạo yêu cầu và được gắn với store.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}