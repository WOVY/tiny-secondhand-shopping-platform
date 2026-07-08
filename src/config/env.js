require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  sessionSecret: required('SESSION_SECRET', 'dev-only-insecure-secret'),
  dbPath: process.env.DB_PATH || './data/app.sqlite',
  // ngrok 등 신뢰할 수 있는 리버스 프록시 뒤에서 실행할 때만 true로 설정한다.
  // 무조건 켜두면 X-Forwarded-For 헤더를 조작해 rate limit을 우회할 수 있다.
  trustProxy: process.env.TRUST_PROXY === 'true',
};
