import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getUserConversations,
  getConversationMessages,
  sendChatMessageApi,
  markConversationRead,
} from "../api/chatApi";
import { chatSocket } from "../api/chatSocket";
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
  const clean = String(name || "").trim();
  if (!clean) return "CH";

  return (
    clean
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "CH"
  );
}

export default function StoreChatPanel({ userId, userName = "Bạn" }) {
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
  const joinedConversationRef = useRef("");

  const localUser = JSON.parse(localStorage.getItem("user") || "{}");
  const resolvedUserId = userId || localUser?.id || null;

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

  const loadThreads = useCallback(async () => {
    if (!resolvedUserId) return;

    try {
      setLoadingThreads(true);
      const res = await getUserConversations(resolvedUserId);
      const conversationList = Array.isArray(res.data) ? res.data : [];
      setThreads(conversationList);

      setActiveThreadId((prev) => {
        if (!conversationList.length) return "";
        const stillExists = conversationList.some(
          (item) => String(item.conversation_id) === String(prev)
        );
        return stillExists ? prev : String(conversationList[0].conversation_id);
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách hội thoại user:", error);
    } finally {
      setLoadingThreads(false);
    }
  }, [resolvedUserId]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;

    try {
      setLoadingMessages(true);
      const res = await getConversationMessages(conversationId);
      const messageList = Array.isArray(res.data) ? res.data : [];
      setMessages(messageList);
    } catch (error) {
      console.error("Lỗi lấy tin nhắn conversation user:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!resolvedUserId) return;

    chatSocket.emit("chat:join-user", resolvedUserId);
    loadThreads();
  }, [resolvedUserId, loadThreads]);

  useEffect(() => {
    if (!isOpen || !activeThreadId) return;

    if (
      joinedConversationRef.current &&
      String(joinedConversationRef.current) !== String(activeThreadId)
    ) {
      chatSocket.emit("chat:leave-conversation", joinedConversationRef.current);
    }

    chatSocket.emit("chat:join-conversation", activeThreadId);
    joinedConversationRef.current = String(activeThreadId);

    loadMessages(activeThreadId);
    markConversationRead(activeThreadId, "user")
      .then(() => loadThreads())
      .catch((error) => console.error("Lỗi mark read user:", error));
  }, [isOpen, activeThreadId, loadMessages, loadThreads]);

  useEffect(() => {
    return () => {
      if (joinedConversationRef.current) {
        chatSocket.emit("chat:leave-conversation", joinedConversationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!resolvedUserId) return;

    const handleConversationCreated = async () => {
      await loadThreads();
    };

    const handleThreadUpdated = async (payload) => {
      await loadThreads();

      if (
        payload?.reason === "read" &&
        isOpen &&
        activeThreadId &&
        String(payload?.conversation_id) === String(activeThreadId)
      ) {
        await loadMessages(activeThreadId);
      }
    };

    const handleNewMessage = async (payload) => {
      const conversationId = payload?.conversation_id;
      const incomingMessage = payload?.message;

      await loadThreads();

      if (
        isOpen &&
        activeThreadId &&
        String(conversationId) === String(activeThreadId)
      ) {
        await loadMessages(activeThreadId);

        if (incomingMessage?.sender_role === "store") {
          try {
            await markConversationRead(activeThreadId, "user");
            await loadThreads();
          } catch (error) {
            console.error("Lỗi cập nhật đã đọc phía user:", error);
          }
        }
      }
    };

    const handleMessagesRead = async (payload) => {
      if (
        isOpen &&
        activeThreadId &&
        String(payload?.conversation_id) === String(activeThreadId)
      ) {
        await loadMessages(activeThreadId);
      }
    };

    chatSocket.on("chat:conversation-created", handleConversationCreated);
    chatSocket.on("chat:thread-updated", handleThreadUpdated);
    chatSocket.on("chat:new-message", handleNewMessage);
    chatSocket.on("chat:messages-read", handleMessagesRead);

    return () => {
      chatSocket.off("chat:conversation-created", handleConversationCreated);
      chatSocket.off("chat:thread-updated", handleThreadUpdated);
      chatSocket.off("chat:new-message", handleNewMessage);
      chatSocket.off("chat:messages-read", handleMessagesRead);
    };
  }, [resolvedUserId, isOpen, activeThreadId, loadThreads, loadMessages]);

  useEffect(() => {
    if (!isOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const filteredThreads = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return threads.filter((thread) => {
      const content = [
        thread.store_name,
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
      (thread) => String(thread.conversation_id) === String(activeThreadId)
    );

    if (!hasActive) {
      setActiveThreadId(String(filteredThreads[0].conversation_id));
    }
  }, [filteredThreads, activeThreadId]);

  const activeThread =
    threads.find(
      (thread) => String(thread.conversation_id) === String(activeThreadId)
    ) || null;

  const totalUnread = threads.reduce(
    (sum, thread) => sum + Number(thread.unread_count || 0),
    0
  );

  const quickReplies = [
    "Em đã gửi thông tin rồi ạ, cửa hàng kiểm tra giúp em nhé.",
    "Cửa hàng báo giúp em thời gian kiểm tra dự kiến nhé.",
    "Em có thể mang máy qua cửa hàng hôm nay ạ.",
  ];

  const handleSendMessage = async () => {
    if (!draft.trim() || !activeThreadId || !resolvedUserId) return;

    try {
      await sendChatMessageApi({
        conversation_id: activeThreadId,
        sender_role: "user",
        sender_id: resolvedUserId,
        message: draft.trim(),
      });

      setDraft("");
    } catch (error) {
      console.error("Lỗi gửi tin nhắn user:", error);
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
            aria-label="Mở chat cửa hàng"
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
              <strong>Chat cửa hàng</strong>
              <span>
                Trao đổi trực tiếp với cửa hàng đang nhận yêu cầu sửa chữa của bạn
              </span>
            </div>

            <button
              type="button"
              className="iems-floating-chat__close"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng chat"
            >
              <svg
                viewBox="0 0 24 24"
                className="iems-floating-chat__close-icon"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M6 6L18 18M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="iems-floating-chat__body">
            <aside className="iems-floating-chat__sidebar">
              <div className="iems-floating-chat__search">
                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Tìm cửa hàng hoặc thiết bị"
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
                          String(thread.conversation_id) === String(activeThreadId)
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setActiveThreadId(String(thread.conversation_id))
                        }
                      >
                        <div className="iems-floating-chat__thread-avatar">
                          {buildAvatarLabel(thread.store_name || "CH")}
                        </div>

                        <div className="iems-floating-chat__thread-content">
                          <div className="iems-floating-chat__thread-top">
                            <strong>{thread.store_name || "Cửa hàng"}</strong>
                            <span>{formatThreadTime(thread.last_message_time)}</span>
                          </div>

                          <div className="iems-floating-chat__thread-sub">
                            {deviceLabel || `Yêu cầu #${thread.repair_request_id}`}
                          </div>

                          <div className="iems-floating-chat__thread-meta">
                            <span className="tag">#{thread.repair_request_id}</span>
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
                        {buildAvatarLabel(activeThread.store_name || "CH")}
                      </div>

                      <div>
                        <strong>{activeThread.store_name || "Cửa hàng"}</strong>
                        <span>Yêu cầu #{activeThread.repair_request_id}</span>
                      </div>
                    </div>

                    <div className="iems-floating-chat__chat-chips">
                      <span className="chip chip--soft">
                        #{activeThread.repair_request_id}
                      </span>
                      <span className="chip chip--primary">
                        {[activeThread.brand, activeThread.model]
                          .filter(Boolean)
                          .join(" · ") ||
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
                        const isMine = message.sender_role === "user";

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
                                  ? userName || localUser?.name || "Bạn"
                                  : activeThread.store_name || "Cửa hàng"}
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
                        <p>Hãy nhắn tin cho cửa hàng để bắt đầu cuộc trò chuyện.</p>
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
                      placeholder="Nhập tin nhắn cho cửa hàng..."
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
                  <p>
                    Hội thoại sẽ xuất hiện khi bạn tạo yêu cầu sửa chữa và gửi tới cửa hàng.
                  </p>
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