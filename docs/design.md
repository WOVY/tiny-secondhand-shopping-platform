# 시스템 설계

## 기술 스택

- **Backend**: Node.js + Express
- **View**: EJS (서버 렌더링, `<%= %>` 자동 이스케이프)
- **스타일링**: Bootstrap 5 (자체 호스팅 — CDN은 CSP `style-src`/`script-src 'self'`에
  막혀 사용하지 않음, `security-fixes.md` #8 참고)
- **DB**: SQLite (`better-sqlite3`, 동기 드라이버 — 트랜잭션 원자성 확보에 유리)
- **인증**: `express-session`(세션) + `bcryptjs`(비밀번호 해시)
- **실시간**: `socket.io` (전체 채팅 + 1:1 채팅)
- **보안 미들웨어**: `helmet`, `csrf-csrf`, `express-rate-limit`, `express-validator`
- **파일 업로드**: `multer` (상품 사진, 선택 기능)

## 데이터 모델

```
users        id, username(UNIQUE), password_hash, bio, balance, role(user|admin),
             status(active|suspended), created_at
products     id, title, description, price, seller_id(FK users), image_path,
             status(active|blocked|sold), created_at
reports      id, reporter_id(FK users), target_type(user|product), target_id, reason,
             resolved, created_at, UNIQUE(reporter_id, target_type, target_id)
messages     id, room_id, sender_id(FK users), content, created_at
transactions id, from_user_id(FK users), to_user_id(FK users), amount, created_at
```

- `users.balance`, `products.price`, `transactions.amount`에는 DB CHECK 제약을 걸어
  애플리케이션 로직이 실패하더라도 음수 잔액/가격이 저장될 수 없게 했다.
- `reports`의 UNIQUE 제약은 동일 신고자가 같은 대상을 중복 신고하는 것을 DB 레벨에서
  최종적으로 방지한다 (애플리케이션 레벨 사전 체크는 사용성을 위한 것이고, UNIQUE 제약이
  경합 조건 상황의 진짜 방어선이다).

## 라우트 구성

| 영역 | 라우트 |
|---|---|
| 인증 | `GET/POST /register`, `GET/POST /login`, `POST /logout` |
| 마이페이지 | `GET /profile`, `POST /profile/bio`, `POST /profile/password` |
| 상품 | `GET /products`(검색 포함), `GET/POST /products/new`, `GET /products/mine`, `GET /products/:id`, `GET/POST /products/:id/edit`, `POST /products/:id/delete` |
| 채팅 | `GET /chat`(전체), `GET /chat/:userId`(1:1) + Socket.IO 이벤트 |
| 신고 | `GET/POST /report` |
| 송금 | `GET/POST /transfer` |
| 관리자 | `GET /admin`, `GET/POST /admin/users/*`, `GET/POST /admin/products/*`, `GET/POST /admin/reports/*` |

## 그룹 B 상세 설계

### 송금 (내부 포인트/잔액 시스템)

- 실제 PG 연동 없이 `users.balance` 정수 컬럼과 `transactions` 원장 테이블로만 구성했다.
  결제망 연동은 과제 범위를 벗어나고, 검증해야 할 보안 표면(웹훅 위변조, 결제 재시도 등)이
  본질과 무관하게 늘어나기 때문이다.
- 가입시 데모용 초기 잔액(10,000P)을 지급해, 실제로 두 사용자 사이의 송금을 처음부터
  시연/테스트할 수 있게 했다.
- 송금 로직은 "잔액 확인 → 차감 → 입금 → 원장 기록"을 `better-sqlite3`의 동기 트랜잭션
  (`db.transaction()`) 안에서 처리한다. better-sqlite3는 완전히 동기적으로 동작하고
  Node.js는 단일 스레드이므로, 트랜잭션 콜백이 실행되는 동안에는 다른 요청이 중간에
  끼어들 수 없다 — 이것이 이중 송금(경합 조건)을 막는 핵심 장치다. 실제로 동시 요청
  10건을 보내는 부하 테스트로 검증했다 (`testing.md` 참고).

### 관리자 페이지

- `users.role` 컬럼(user/admin)으로 권한을 구분하고, `requireAdmin` 미들웨어가 매 요청마다
  세션의 사용자 role을 서버측에서 재조회해 검증한다 (프론트에서 메뉴를 숨기는 방식이 아님).
- 관리 대상을 유저/상품/신고 세 축으로 나눴다: 유저는 휴면처리·해제·삭제, 상품은
  차단·해제·삭제, 신고는 목록 조회와 처리완료 표시.
- 유저 삭제는 그 유저가 등록한 상품/거래내역/메시지/신고가 있으면 FK 제약으로 실패한다.
  이를 그대로 서버 에러(500)로 노출하지 않고, "휴면 처리를 이용하라"는 안내로 바꿔
  관리자 페이지가 깨지지 않게 했다.

## 화면 구성

기본 페이지, 회원가입/로그인, 마이페이지, 상품 목록(검색)/상세/등록/수정/내 상품 관리,
전체채팅/1:1채팅, 신고, 송금, 관리자(대시보드/유저/상품/신고) — 총 4개 그룹, 20여개 뷰.
