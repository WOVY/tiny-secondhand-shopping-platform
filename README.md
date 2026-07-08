# Tiny Second-hand Shopping Platform

WHS(화이트햇스쿨) Secure Coding 과제 — 회원가입/로그인, 상품 등록·조회·검색, 전체/1:1
채팅, 신고 및 자동 차단·휴면, 유저간 송금(내부 포인트), 관리자 페이지를 갖춘 작은
중고거래 플랫폼.

개발 전 과정(요구사항 분석/시스템 설계/구현/체크리스트/테스트/유지보수)과 개발 중 발견한
보안 약점 및 수정 내역은 [`docs/`](./docs) 디렉터리에 정리되어 있다.

- [요구사항 분석](./docs/requirements.md)
- [시스템 설계](./docs/design.md)
- [보안 체크리스트](./docs/checklist.md)
- [테스트](./docs/testing.md)
- [발견한 보안 약점과 수정 내역](./docs/security-fixes.md)
- [유지보수](./docs/maintenance.md)

## 기술 스택

- Node.js + Express
- EJS (서버 렌더링)
- SQLite (`better-sqlite3`)
- Socket.IO (실시간 채팅)
- `bcryptjs`, `csrf-csrf`, `helmet`, `express-rate-limit`, `express-validator`, `multer`

## 환경 설정 및 실행 방법

### 요구사항

- Node.js 18 이상 (개발/테스트는 Node.js 24 기준)
- npm

### 설치 및 실행

```bash
git clone <this-repo-url>
cd tiny-secondhand-shopping-platform
npm install

cp .env.example .env
# .env를 열어 SESSION_SECRET을 임의의 긴 무작위 문자열로 바꾸고,
# ADMIN_USERNAME / ADMIN_PASSWORD를 원하는 관리자 계정 정보로 채운다.

npm run seed   # .env의 ADMIN_USERNAME/ADMIN_PASSWORD로 관리자 계정 생성

npm start      # http://localhost:5000
```

최초 실행시 `data/app.sqlite`가 자동으로 생성되고 스키마가 적용된다 (별도 마이그레이션
명령 불필요). 일반 회원가입으로 만든 계정은 자동으로 `role=user`이며, 관리자 계정은
반드시 `npm run seed`로만 생성된다.

### 환경변수 (`.env`)

| 변수 | 설명 | 기본값 |
|---|---|---|
| `PORT` | 서버 포트 | `5000` |
| `NODE_ENV` | `development` / `production` | `development` |
| `SESSION_SECRET` | 세션/CSRF 서명에 사용하는 비밀키. 반드시 변경할 것 | (예시값, 변경 필수) |
| `DB_PATH` | SQLite 파일 경로 | `./data/app.sqlite` |
| `TRUST_PROXY` | ngrok 등 리버스 프록시 뒤에서 실행할 때만 `true` | `false` |
| `ADMIN_USERNAME` | `npm run seed`로 생성할 관리자 아이디 | `admin` |
| `ADMIN_PASSWORD` | `npm run seed`로 생성할 관리자 비밀번호 (필수, 기본값 없음) | (없음) |

### 외부에서 접속 테스트 (선택, ngrok)

```bash
ngrok http 5000
```

ngrok으로 외부 노출할 경우 `.env`의 `TRUST_PROXY=true`로 설정해야 rate limit이
클라이언트의 실제 IP 기준으로 정확히 동작한다.

### 개발 모드 (자동 재시작)

```bash
npm run dev
```

## 폴더 구조

```
src/
  app.js               Express 앱 설정 (미들웨어, 라우터 마운트)
  server.js             HTTP 서버 + Socket.IO 부트스트랩
  config/                env, DB 연결/스키마, 상수, 관리자 시드 스크립트
  middleware/            인증, 관리자 권한, CSRF, 세션, 파일 업로드
  models/                DB 접근 계층 (user/product/report/message/transaction)
  routes/                라우트 핸들러
  sockets/                Socket.IO 채팅 핸들러
  utils/                  공용 유틸(채팅방 키 계산 등)
views/                    EJS 템플릿
public/                   정적 자산 (css, 클라이언트 js, 업로드된 이미지)
docs/                     보고서용 문서 (요구사항/설계/체크리스트/테스트/보안/유지보수)
```
