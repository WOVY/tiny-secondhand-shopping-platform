const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('./config/env');
const sessionMiddleware = require('./middleware/session');
const { registerChatHandlers } = require('./sockets/chat');

const server = http.createServer(app);
const io = new Server(server);

// Express와 동일한 세션 미들웨어 인스턴스를 사용해야만, HTTP 로그인으로 생성된
// 세션을 소켓 연결에서 조회할 수 있다 (서로 다른 인스턴스는 별도의 메모리 스토어를 가짐).
io.engine.use(sessionMiddleware);

registerChatHandlers(io);

server.listen(config.port, () => {
  console.log(`Server listening on port ${config.port} (${config.nodeEnv})`);
});
