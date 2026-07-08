'use strict';

// 최소한의 smoke test. 별도 프레임워크(Jest 등) 없이, 실제 서버를 띄우고
// fetch로 골든 패스(회원가입→로그인→상품등록→조회→로그아웃)와 핵심 보안 동작
// (CSRF 토큰 없는 요청 거부, 중복 아이디 거부, 비관리자의 /admin 접근 거부)을
// 순서대로 점검한다. 회귀가 생기면 이 스크립트가 바로 실패로 알려준다.
//
// 실행: npm run smoke  (서버가 실행 중이 아니어도 됨 — 이 스크립트가 직접 띄운다)

const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = 5099;
const BASE = `http://127.0.0.1:${PORT}`;
const DB_PATH = path.join(__dirname, '..', 'data', 'smoke-test.sqlite');

// app.js/db.js가 require 시점에 config.dbPath를 읽으므로, require보다 먼저 지정해야 한다.
process.env.NODE_ENV = 'test';
process.env.PORT = String(PORT);
process.env.SESSION_SECRET = 'smoke-test-only-secret-not-for-production';
process.env.DB_PATH = DB_PATH;
process.env.TRUST_PROXY = 'false';

for (const suffix of ['', '-wal', '-shm']) {
  const p = DB_PATH + suffix;
  if (fs.existsSync(p)) fs.rmSync(p);
}

const app = require('../src/app');

let passed = 0;
let failed = 0;

function check(condition, label) {
  if (condition) {
    passed += 1;
    console.log(`  ok   - ${label}`);
  } else {
    failed += 1;
    console.error(`  FAIL - ${label}`);
  }
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  absorb(res) {
    const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    for (const entry of raw) {
      const pair = entry.split(';', 1)[0];
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      this.cookies.set(pair.slice(0, idx), pair.slice(idx + 1));
    }
  }

  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

async function req(jar, method, urlPath, { form } = {}) {
  const headers = { Cookie: jar.header() };
  let body;
  if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(form).toString();
  }
  const res = await fetch(BASE + urlPath, { method, headers, body, redirect: 'manual' });
  jar.absorb(res);
  return res;
}

function extractCsrf(html) {
  const m = html.match(/name="_csrf" value="([^"]+)"/);
  if (!m) throw new Error(`CSRF 토큰을 페이지에서 찾지 못함: ${html.slice(0, 200)}`);
  return m[1];
}

async function main() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`smoke test: 임시 서버 http://127.0.0.1:${PORT} (DB: ${DB_PATH})`);

  const username = `smoke_${Date.now()}`;
  const password = 'smoke-test-pw-1234';

  try {
    // 1. 기본 페이지
    let res = await req(new CookieJar(), 'GET', '/');
    check(res.status === 200, 'GET / -> 200');

    const jar = new CookieJar();

    // 2. 회원가입 페이지 + CSRF 토큰 없이 제출하면 거부되어야 함
    res = await req(jar, 'GET', '/register');
    check(res.status === 200, 'GET /register -> 200');
    let html = await res.text();
    extractCsrf(html); // 페이지에 토큰이 정상적으로 렌더링되는지만 확인

    res = await req(jar, 'POST', '/register', { form: { username, password } });
    check(res.status === 403, 'POST /register (CSRF 토큰 없음) -> 403');

    // 3. 정상 회원가입 -> 로그인 상태로 리다이렉트
    res = await req(jar, 'GET', '/register');
    html = await res.text();
    let csrf = extractCsrf(html);

    res = await req(jar, 'POST', '/register', { form: { username, password, _csrf: csrf } });
    check(res.status === 302, `POST /register (정상) -> 302 (실제 ${res.status})`);

    res = await req(jar, 'GET', '/');
    check(res.status === 200, 'GET / (로그인 상태) -> 200');
    html = await res.text();
    check(html.includes(username), 'GET / 응답에 로그인한 아이디가 표시됨');
    csrf = extractCsrf(html); // 로그아웃 폼의 새 CSRF 토큰

    // 4. 같은 아이디로 재가입 시도 -> 거부 (별도 세션)
    const otherJar = new CookieJar();
    res = await req(otherJar, 'GET', '/register');
    const dupCsrf = extractCsrf(await res.text());
    res = await req(otherJar, 'POST', '/register', {
      form: { username, password, _csrf: dupCsrf },
    });
    check(res.status === 400, '중복 아이디 회원가입 -> 400');

    // 5. 상품 등록 -> 상세 페이지 조회
    res = await req(jar, 'GET', '/products');
    check(res.status === 200, 'GET /products -> 200');

    res = await req(jar, 'GET', '/products/new');
    check(res.status === 200, 'GET /products/new -> 200');
    csrf = extractCsrf(await res.text());

    const title = `스모크테스트 상품 ${Date.now()}`;
    res = await req(jar, 'POST', '/products/new', {
      form: { title, description: '자동 smoke test로 생성된 상품', price: '1000', _csrf: csrf },
    });
    check(res.status === 302, `POST /products/new -> 302 (실제 ${res.status})`);
    const location = res.headers.get('location') || '';
    check(/^\/products\/\d+$/.test(location), `등록 후 상세 페이지로 리다이렉트 (${location})`);

    res = await req(jar, 'GET', location);
    check(res.status === 200, `GET ${location} -> 200`);
    html = await res.text();
    check(html.includes(title), '상품 상세 페이지에 등록한 제목이 표시됨');

    // 6. 비관리자는 관리자 페이지 접근 불가
    res = await req(jar, 'GET', '/admin');
    check(res.status === 403, '일반 유저의 GET /admin -> 403');

    // 7. 로그아웃 -> 로그인 페이지에서 다시 로그인
    res = await req(jar, 'POST', '/logout', { form: { _csrf: csrf } });
    check(res.status === 302, `POST /logout -> 302 (실제 ${res.status})`);

    res = await req(jar, 'GET', '/login');
    check(res.status === 200, 'GET /login -> 200');
    csrf = extractCsrf(await res.text());

    res = await req(jar, 'POST', '/login', { form: { username, password: 'wrong-password', _csrf: csrf } });
    check(res.status === 400, '잘못된 비밀번호 로그인 -> 400');

    res = await req(jar, 'GET', '/login');
    csrf = extractCsrf(await res.text());
    res = await req(jar, 'POST', '/login', { form: { username, password, _csrf: csrf } });
    check(res.status === 302, `올바른 비밀번호 로그인 -> 302 (실제 ${res.status})`);
  } catch (err) {
    failed += 1;
    console.error('  FAIL - 예외 발생:', err);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    // better-sqlite3 핸들을 닫아야 아래에서 DB 파일을 지울 수 있다 (Windows는 열린
    // 파일 삭제 시 EPERM을 던진다).
    require('../src/config/db').close();
    for (const suffix of ['', '-wal', '-shm']) {
      const p = DB_PATH + suffix;
      try {
        if (fs.existsSync(p)) fs.rmSync(p);
      } catch {
        // 정리 실패는 다음 실행 시작 시 재시도되므로 테스트 결과에 영향을 주지 않는다.
      }
    }
  }

  console.log(`\n결과: ${passed}개 통과, ${failed}개 실패`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
