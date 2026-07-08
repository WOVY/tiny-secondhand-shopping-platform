const bcrypt = require('bcryptjs');
const db = require('./db');

const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error(
    'ADMIN_PASSWORD 환경변수가 필요합니다 (예: ADMIN_PASSWORD=강한비밀번호 npm run seed)'
  );
  process.exit(1);
}

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

if (existing) {
  console.log(`관리자 계정 "${username}"이(가) 이미 존재합니다 (id=${existing.id}).`);
  process.exit(0);
}

const passwordHash = bcrypt.hashSync(password, 12);

db.prepare(
  'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
).run(username, passwordHash, 'admin');

console.log(`관리자 계정 "${username}"이(가) 생성되었습니다.`);
