# 보안 체크리스트

`npm audit` 결과: 0 vulnerabilities (2026-07 기준).

| # | 분류 | 체크 항목 | 확인 방법 | 상태 |
|---|------|-----------|-----------|------|
| 1 | 회원가입/로그인 | 아이디 형식/길이, 비밀번호 길이 서버측 검증 | express-validator (`src/routes/auth.js`) | ✅ |
| 2 | 회원가입/로그인 | 아이디 중복 가입 방지 | `users.username UNIQUE` + 사전 조회 | ✅ |
| 3 | 비밀번호 보안 | 평문 저장 금지, bcrypt 해시만 저장 | `bcryptjs.hashSync(..., 12)` | ✅ |
| 4 | 브루트포스 방지 | 로그인 실패 rate limit (15분/IP당 10회) | `express-rate-limit` (`auth.js`) | ✅ |
| 5 | 브루트포스 방지 | 전역 rate limit (15분/IP당 300회) | `express-rate-limit` (`app.js`) | ✅ |
| 6 | 세션 보안 | 세션 쿠키 httpOnly, sameSite | `src/middleware/session.js` | ✅ |
| 7 | 세션 보안 | 로그인/회원가입 성공시 세션 재발급(고정 공격 방지) | `session.regenerate()` | ✅ |
| 8 | 세션 보안 | 세션 재발급시 CSRF 토큰도 함께 재발급 | `src/app.js` try/catch → `generateToken(..., true)` | ✅ |
| 9 | CSRF | 모든 상태변경(POST) 요청에 토큰 검증 | `csrf-csrf` doubleCsrfProtection 전역 적용 | ✅ |
| 10 | CSRF | 로그아웃도 GET 링크가 아닌 POST+토큰으로 처리 | `src/routes/auth.js` | ✅ |
| 11 | XSS | 서버 렌더링은 EJS 자동 이스케이프(`<%= %>`) | 모든 뷰, `<%-`는 nav partial include에만 사용 | ✅ |
| 12 | XSS | 실시간 채팅 클라이언트는 textContent만 사용 (innerHTML 미사용) | `public/js/chat-*.js` | ✅ |
| 13 | XSS/CSP | 인라인 스크립트/이벤트핸들러/스타일 제거, CSP로 차단 | helmet CSP `script-src 'self'`, `style-src 'self'` | ✅ |
| 14 | SQL Injection | 모든 쿼리 파라미터 바인딩, 문자열 조합 없음 | 전체 `src/models/*.js` grep으로 확인 | ✅ |
| 15 | 인가/IDOR | 상품 수정/삭제는 소유자만 (서버측 재검증) | `src/routes/products.js` | ✅ |
| 16 | 인가/IDOR | 관리자 라우트는 role 서버측 재검증 (숨김 아님) | `src/middleware/admin.js` | ✅ |
| 17 | Mass Assignment | 회원가입/프로필 요청으로 role/balance 변경 불가 | 모델이 화이트리스트 컬럼만 INSERT/UPDATE | ✅ |
| 18 | 소켓 인증 | 미인증/휴면 소켓 연결 즉시 종료 | `src/sockets/chat.js` | ✅ |
| 18-1 | 소켓 인증 | 연결 이후 휴면 처리되어도 매 메시지마다 재확인해 즉시 종료 | `isStillActive()` (`src/sockets/chat.js`, 이슈 #11에서 발견/수정) | ✅ |
| 19 | 소켓 인가 | 1:1 채팅방은 참가자만 접근 (room 키를 서버가 계산) | `src/utils/chatRoom.js` | ✅ |
| 20 | 신고 남용 방지 | 동일 대상 중복 신고 방지 (사전 체크 + DB UNIQUE) | `reports` 테이블 UNIQUE 제약 | ✅ |
| 21 | 데이터 무결성 | 송금 시 잔액 확인+차감+입금+기록이 원자적 트랜잭션 | `db.transaction()` (`src/models/transaction.js`) | ✅ (동시성 테스트로 검증) |
| 22 | 데이터 무결성 | 잔액 음수 방지 DB 제약 (애플리케이션 검증의 최종 방어선) | `users.balance CHECK (balance >= 0)` | ✅ |
| 23 | 파일 업로드 | 확장자+MIME 화이트리스트, 크기 제한, 랜덤 파일명 | `src/middleware/upload.js` | ✅ |
| 24 | 에러 처리 | 에러 발생시 스택트레이스/DB 에러 미노출 | `src/app.js` 전역 에러 핸들러 | ✅ |
| 25 | 관리자 삭제 안전성 | FK 제약으로 인한 삭제 실패를 500이 아닌 안내로 처리 | `src/routes/admin.js` try/catch | ✅ |
| 26 | 시크릿 관리 | `.env`/DB 파일/업로드 파일 git 미포함 | `.gitignore` | ✅ |
| 27 | 관리자 계정 | 초기 관리자 비밀번호 하드코딩 금지 (환경변수 필수) | `src/config/seed.js` | ✅ |
| 28 | 리버스 프록시 | trust proxy는 명시적 옵트인일 때만 활성화 | `TRUST_PROXY` env (`src/config/env.js`) | ✅ |
| 29 | 의존성 | 알려진 취약점 있는 패키지 회피/상향 (multer 1.x→2.x) | `npm audit` | ✅ |
| 30 | CSRF | 멀티파트(이미지 업로드) 폼도 CSRF 토큰이 실제로 검증됨 (파싱 순서 버그 수정 후) | `src/app.js` (`security-fixes.md` #7) | ✅ |
