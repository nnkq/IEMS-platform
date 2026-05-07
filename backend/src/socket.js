const { Server } = require('socket.io');

let io = null;

function initSocket(server, clientUrl) {
  io = new Server(server, {
    cors: {
      origin: clientUrl,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('chat:join-user', (userId) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
    });

    socket.on('chat:join-store', (storeId) => {
      if (!storeId) return;
      socket.join(`store:${storeId}`);
    });

    socket.on('chat:join-conversation', (conversationId) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('chat:leave-conversation', (conversationId) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });
  });

  return io;
}

function emitConversationCreated(userId, storeId, payload) {
  if (!io) return;
  if (userId) io.to(`user:${userId}`).emit('chat:conversation-created', payload);
  if (storeId) io.to(`store:${storeId}`).emit('chat:conversation-created', payload);
}

function emitConversationMessage(conversationId, payload) {
  if (!io || !conversationId) return;
  io.to(`conversation:${conversationId}`).emit('chat:new-message', payload);
}

function emitThreadUpdated(userId, storeId, payload) {
  if (!io) return;
  if (userId) io.to(`user:${userId}`).emit('chat:thread-updated', payload);
  if (storeId) io.to(`store:${storeId}`).emit('chat:thread-updated', payload);
}

function emitMessagesRead(conversationId, payload) {
  if (!io || !conversationId) return;
  io.to(`conversation:${conversationId}`).emit('chat:messages-read', payload);
}

module.exports = {
  initSocket,
  emitConversationCreated,
  emitConversationMessage,
  emitThreadUpdated,
  emitMessagesRead,
};