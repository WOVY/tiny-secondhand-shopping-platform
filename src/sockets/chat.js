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

    // 연결 시점 이후(메시지를 보내는 매 순간)에도 휴면 처리될 수 있으므로,
    // 이미 열려 있는 소켓이라도 매 메시지마다 최신 상태를 다시 조회해서 확인한다.
    // (연결 시점 검사만으로는, 신고 누적으로 세션 도중 휴면 처리된 사용자가
    //  이미 맺어둔 소켓으로 계속 메시지를 보낼 수 있는 문제가 있었다.)
    function isStillActive() {
      const current = userModel.findById(userId);
      if (!current || current.status === 'suspended') {
        socket.disconnect(true);
        return false;
      }
      return true;
    }

    socket.on('chat:global:message', (content) => {
      if (!isStillActive()) return;
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
      if (!isStillActive()) return;
      const otherId = Number(otherUserId);
      if (!otherId || otherId === userId || !userModel.findById(otherId)) return;
      socket.join(roomKeyForUsers(userId, otherId));
    });

    socket.on('chat:dm:message', (payload) => {
      if (!isStillActive()) return;
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
