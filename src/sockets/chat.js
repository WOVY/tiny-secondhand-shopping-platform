const userModel = require('../models/user');
const messageModel = require('../models/message');
const { roomKeyForUsers } = require('../utils/chatRoom');

const MAX_MESSAGE_LENGTH = 1000;

function registerChatHandlers(io) {
  io.on('connection', (socket) => {
    const session = socket.request.session;
    const userId = session && session.userId;
    const user = userId ? userModel.findById(userId) : null;

    // 인증되지 않았거나 휴면 처리된 사용자의 소켓 연결은 즉시 종료한다.
    if (!user || user.status === 'suspended') {
      socket.disconnect(true);
      return;
    }

    socket.join('global');

    socket.on('chat:global:message', (content) => {
      if (typeof content !== 'string') return;
      const trimmed = content.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!trimmed) return;

      const message = messageModel.create({ roomId: 'global', senderId: userId, content: trimmed });
      io.to('global').emit('chat:global:message', {
        id: message.id,
        senderId: userId,
        senderUsername: user.username,
        content: trimmed,
        createdAt: message.created_at,
      });
    });

    socket.on('chat:dm:join', (otherUserId) => {
      const otherId = Number(otherUserId);
      if (!otherId || otherId === userId || !userModel.findById(otherId)) return;
      socket.join(roomKeyForUsers(userId, otherId));
    });

    socket.on('chat:dm:message', (payload) => {
      const { toUserId, content } = payload || {};
      const otherId = Number(toUserId);
      if (!otherId || otherId === userId || typeof content !== 'string') return;
      if (!userModel.findById(otherId)) return;

      const room = roomKeyForUsers(userId, otherId);
      // chat:dm:join으로 이미 참가한 방에만 메시지를 보낼 수 있도록 강제한다.
      // (room 키는 항상 소켓의 인증된 userId를 기준으로 서버가 계산하므로,
      //  제3자가 다른 두 사용자의 대화방 키를 알아내 join할 수 없다.)
      if (!socket.rooms.has(room)) return;

      const message = messageModel.create({ roomId: room, senderId: userId, content: content.trim().slice(0, MAX_MESSAGE_LENGTH) });
      io.to(room).emit('chat:dm:message', {
        id: message.id,
        senderId: userId,
        senderUsername: user.username,
        content: message.content,
        createdAt: message.created_at,
      });
    });
  });
}

module.exports = { registerChatHandlers };
