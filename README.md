# 레슨 예약 관리 시스템

## 프로젝트 소개

코치와 학생을 연결하는 레슨 예약 관리 플랫폼입니다. 다양한 운동 종목의 레슨 예약, 회원권 관리, 코치 스케줄 관리 등의 기능을 제공합니다.

## 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **State Management**: TanStack Query, Zustand
- **UI Components**: Radix UI, shadcn/ui

## 주요 기능

### 사용자 기능
- 회원가입 및 로그인
- 레슨 검색 (레슨명, 코치명, 지점별)
- 레슨 상세 정보 조회
- 실시간 예약 가능 시간 확인
- 레슨 예약 및 취소
- 회원권 잔여 시간 확인
- 예약 내역 조회

### 관리자 기능
- 지점 관리 (CRUD)
- 코치 관리 (프로필, 스케줄 설정)
- 레슨 관리 (생성, 수정, 삭제)
- 회원 관리 및 회원권 발급
- 예약 현황 관리
- 코치별 가용 시간 설정

## 설치 및 실행

### 1. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 입력합니다:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/lesson_booking_db?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-min-32-characters"
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 데이터베이스 설정

PostgreSQL 데이터베이스를 생성하고 마이그레이션을 실행합니다:

```bash
# 데이터베이스 생성 (PostgreSQL이 설치되어 있어야 함)
createdb lesson_booking_db

# Prisma 마이그레이션 실행
npx prisma migrate dev

# 시드 데이터 생성
npm run prisma:seed
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 테스트 계정

시드 데이터를 실행하면 다음 테스트 계정이 생성됩니다:

- **관리자**: username: `admin`, password: `admin123`
- **사용자1**: username: `user1`, password: `user123`
- **사용자2**: username: `user2`, password: `user123`
- **사용자3**: username: `user3`, password: `user123`

## 데이터베이스 스키마

주요 테이블:
- `users`: 사용자 정보
- `branches`: 지점 정보
- `coaches`: 코치 정보
- `lessons`: 레슨 정보
- `reservations`: 예약 정보
- `memberships`: 회원권 정보
- `coach_avail_rules`: 코치별 가용 시간 규칙
- `membership_ledger`: 회원권 사용 내역

## API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인 (NextAuth)

### 레슨
- `GET /api/lessons` - 레슨 목록 조회
- `GET /api/lessons/[id]` - 레슨 상세 조회
- `GET /api/lessons/[id]/availability` - 예약 가능 시간 조회

### 예약
- `POST /api/reservations` - 예약 생성
- `GET /api/reservations` - 내 예약 목록
- `PATCH /api/reservations/[id]/cancel` - 예약 취소

### 회원권
- `GET /api/me/memberships` - 내 회원권 목록
- `GET /api/memberships/[id]/ledger` - 회원권 사용 내역

## 개발 도구

```bash
# Prisma Studio (데이터베이스 GUI)
npm run prisma:studio

# 타입 생성
npm run prisma:generate

# 린트 실행
npm run lint

# 빌드
npm run build
```

## 프로젝트 구조

```
lesson-booking-app/
├── app/                    # Next.js 앱 라우터
│   ├── api/               # API 라우트
│   ├── auth/              # 인증 페이지
│   ├── admin/             # 관리자 페이지
│   └── lessons/           # 레슨 관련 페이지
├── components/            # React 컴포넌트
│   └── ui/               # UI 컴포넌트
├── lib/                   # 유틸리티 함수
├── prisma/                # Prisma 스키마 및 마이그레이션
├── types/                 # TypeScript 타입 정의
└── hooks/                 # React 커스텀 훅
```

## 주요 기능 설명

### 예약 시스템
- 30분 단위로 예약 가능
- 코치별 중복 예약 방지 (PostgreSQL Exclusion Constraint)
- 회원권 잔여 시간 자동 차감
- 취소 시 회원권 시간 자동 복원

### 가용 시간 계산
- 운영 시간: 09:00 ~ 22:00
- 코치별 주간 반복 규칙 설정
- 특정 기간 휴무 설정 가능
- 실시간 예약 가능 시간 계산

### 회원권 관리
- 코치별 회원권 발급
- 사용 내역 추적 (Ledger 패턴)
- 만료일 관리
- 잔여 시간 실시간 확인

## 라이선스

MIT