# Travel Planner — Spec

마크다운 기반 여행 일정 편집 플랫폼. Cursor의 워크플로우(파일 = 진실의 원천, 채팅으로 편집, 직접 편집도 가능)를 여행 일정 도메인에 적용한 웹앱.

## 1. 핵심 컨셉

**"마크다운이 진실"** — 모든 일정은 마크다운 파일이 원본이다. 시각화는 그 파일의 다른 표현일 뿐이며, 어떤 편집 방식을 쓰든 결국 마크다운이 수정된다.

세 가지 편집 방식이 같은 파일을 만진다:
1. **마크다운 직접 편집** (에디터에서 텍스트로)
2. **시각화 인터랙션** (타임라인/카드/지도 위에서 드래그·클릭)
3. **AI 채팅** (자연어로 요청 → AI가 마크다운을 직접 수정)

## 2. 사용자 가치

- 일반 여행 앱: 폼 입력 → DB 저장 → 갇힌 데이터
- 이 앱: 사용자가 자신의 마크다운 파일을 소유. 어디든 가져갈 수 있음 (블로그, 노션, 메모장)
- Claude Code가 없어도, Claude Code 워크플로우의 즐거움을 누릴 수 있음

## 3. 데이터 형식

### 3.1 마크다운 스키마

```markdown
---
title: 도쿄 4박 5일
dates: 2026-05-01 ~ 2026-05-05
travelers: 2
theme: timeline-default
---

## Day 1 (5/1 목)

- **09:00** 나리타 도착 ✈️
- **11:30** 호텔 체크인 @시부야 호텔
- **14:00** 시부야 산책
  - 스크램블 교차로
  - 시부야 스카이
- **19:00** 저녁 — 우오베이 스시 @시부야

## Day 2 (5/2 금)

- **09:00** 호텔 조식
- **11:00** 센소지 @아사쿠사
...
```

**규칙:**
- YAML frontmatter: `title`, `dates`, `travelers`, `theme` (선택)
- `## Day N` 으로 날짜 구분 (괄호 안 부가설명 자유)
- 항목은 `- **HH:MM** 제목 [@장소] [이모지]`
- 하위 불릿은 해당 항목의 세부 사항
- 완전히 자유롭게 쓴 마크다운도 허용 (파서가 best-effort로 해석)

### 3.2 내부 JSON 표현

```typescript
type Itinerary = {
  meta: {
    title: string;
    start_date: string;  // ISO
    end_date: string;
    travelers: number;
    theme?: string;
  };
  days: Day[];
  raw_markdown: string;  // 항상 원본 보존
};

type Day = {
  index: number;        // 0-based
  date: string;         // ISO
  label: string;        // "Day 1 (5/1 목)"
  items: Activity[];
};

type Activity = {
  id: string;           // 안정적 ID (재생성 시 보존)
  time?: string;        // "09:00"
  title: string;
  location?: string;    // @ 다음에 오는 것
  emoji?: string;
  notes?: string[];     // 하위 불릿
  type?: ActivityType;  // 추론됨
};

type ActivityType = "meal" | "sightseeing" | "transit" | "accommodation" | "activity";
```

**중요:** 마크다운 ↔ JSON 변환은 **양방향 무손실**이어야 함. 사용자가 손으로 쓴 코멘트, 빈 줄, 이모지를 보존.

## 4. 화면 구조

### 4.1 데스크탑 (1024px+)

```
┌──────────────────────────────────────────────────────────┐
│  📁 도쿄여행.md  | [뷰: Timeline ▼] [테마 ▼]  [💾] [공유] │
├────────────────────┬─────────────────────────────────────┤
│                    │                                     │
│  Markdown Editor   │   Visualization (Timeline/Cards/Map)│
│  (CodeMirror)      │                                     │
│                    │                                     │
│                    │                                     │
├────────────────────┴─────────────────────────────────────┤
│  💬 Chat (collapsible)                                   │
└──────────────────────────────────────────────────────────┘
```

### 4.2 모바일 (< 768px)

세 영역을 탭으로 전환:
- **[일정]** — 시각화 (기본)
- **[편집]** — 마크다운 에디터
- **[💬]** — 채팅 (bottom sheet)

채팅은 어느 탭에서든 띄울 수 있음.

## 5. 기능 명세

### 5.1 마크다운 에디터
- CodeMirror 6 기반
- 실시간 파싱 → 우측 시각화 즉시 갱신 (debounce 200ms)
- 문법 하이라이팅 (커스텀: 시간, 장소, 이모지)
- 자동완성: 시간, 자주 쓰는 장소
- 파싱 실패 시: 시각화는 마지막 성공 상태 유지, 에디터에 경고 표시

### 5.2 시각화 뷰

**Timeline 뷰** (기본)
- 세로 시간축, Day마다 섹션
- 항목 클릭 → 에디터 해당 줄로 점프 + 하이라이트
- 드래그로 시간 변경 → 마크다운 수정
- 드래그로 Day 이동 가능

**Card 뷰**
- Day마다 카드 그리드
- 인스타그램 피드 느낌
- 항목 클릭 → 모달 (수정 가능)

**Map 뷰**
- `@장소` 가 있는 항목들을 지도에 점으로
- Day별로 다른 색
- 클릭 → 항목 정보 + 에디터 점프

### 5.3 테마 시스템
- 각 뷰는 `themes/{view}/{theme-name}.css` 로드
- 사용자가 드롭다운으로 선택
- frontmatter `theme:` 으로 파일별 기본값 지정 가능
- 기본 제공: `default`, `minimal`, `notebook`, `magazine`
- 향후: 사용자가 자기 CSS 업로드

### 5.4 AI 채팅 (Edit 모드)

**도구 정의:**
```typescript
const tools = [
  {
    name: "update_markdown",
    description: "전체 또는 부분 마크다운을 수정. 사용자 의도가 명확한 변경에만 사용.",
    input_schema: {
      type: "replace_section" | "replace_all" | "insert_after" | "delete",
      target: string,    // section header or activity id
      content: string,   // 새 마크다운
      reason: string     // 사용자에게 보여줄 변경 이유
    }
  },
  {
    name: "suggest_only",
    description: "일정을 변경하지 않고 텍스트로만 답변.",
    input_schema: { content: string }
  }
];
```

**컨텍스트:**
시스템 프롬프트에 포함:
- 현재 마크다운 전체
- 사용자가 보고 있는 Day (있으면)
- 선택된 항목 (있으면)
- 사용자 선호 (메모리, 추후)

**워크플로우:**
1. 사용자 요청 → 서버 라우트 `/api/chat`
2. Anthropic API tool use 호출
3. `update_markdown` 호출 시: 클라이언트가 변경사항 미리보기 → 사용자 승인 → 적용
4. 적용 후 자동 저장 (Supabase)

**제약:**
- AI는 `raw_markdown`만 수정. JSON 직접 조작 금지.
- 모든 변경은 diff로 표시 (사용자가 거부 가능)
- 한 번에 너무 큰 변경(> 50% 마크다운 변경)은 사용자에게 확인 요청

### 5.5 저장 / 동기화 (Supabase)

**테이블:**
```sql
-- 사용자
auth.users (Supabase 기본)

-- 여행 일정
trips (
  id uuid primary key,
  user_id uuid references auth.users,
  title text,
  markdown text,           -- 원본 마크다운 전체
  meta jsonb,              -- frontmatter 캐시 (검색용)
  theme text,
  created_at timestamptz,
  updated_at timestamptz
)

-- 채팅 히스토리 (선택)
chat_messages (
  id uuid primary key,
  trip_id uuid references trips,
  role text,               -- user | assistant
  content text,
  tool_calls jsonb,
  created_at timestamptz
)
```

**RLS:**
- `trips`: 자기 것만 read/write
- 공유 링크용 별도 `shared_trips` 테이블 (read-only public)

**동기화 전략:**
- 로컬 편집 → debounce 1초 후 Supabase 저장
- 저장 실패 시 재시도 + localStorage 백업
- 멀티 디바이스 동시 편집은 v1에선 last-write-wins (CRDT는 v2)

### 5.6 공유 / 임베드
- "공유 링크 생성" → read-only URL
- `?view=timeline&theme=minimal` 쿼리로 뷰/테마 강제 가능
- iframe 임베드 코드 제공 (블로그용)

## 6. 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 15 (App Router) | 서버 라우트 + 채팅 SSR + 파일 기반 라우팅 |
| 언어 | TypeScript (strict) | 타입 안전성 |
| 스타일 | Tailwind CSS + CSS Modules | Tailwind는 코어, Modules는 테마 |
| 에디터 | CodeMirror 6 | 가볍고 모바일에서도 동작 |
| 마크다운 파싱 | `unified` + `remark-parse` + `remark-frontmatter` | AST 기반, 무손실 |
| 검증 | Zod | LLM 응답 검증 필수 |
| LLM | Anthropic API (Claude Sonnet) | tool use 지원 |
| DB / Auth | Supabase (Postgres + Auth) | RLS로 멀티유저 안전 |
| 상태 관리 | Zustand | 가볍고 서버 상태와 분리 쉬움 |
| 지도 | Leaflet + OpenStreetMap | 무료, API 키 불필요 |
| 배포 | Vercel | Next.js 친화 |

## 7. 폴더 구조

```
travel-planner/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── trips/
│   │   ├── page.tsx              # 내 일정 목록
│   │   └── [id]/
│   │       ├── page.tsx          # 메인 편집 화면
│   │       └── share/page.tsx    # read-only 공유 뷰
│   ├── api/
│   │   ├── chat/route.ts         # LLM 프록시 (스트리밍)
│   │   └── trips/route.ts        # 일정 CRUD (Supabase 래퍼)
│   └── layout.tsx
│
├── components/
│   ├── editor/
│   │   ├── MarkdownEditor.tsx    # CodeMirror 래퍼
│   │   └── extensions.ts         # 커스텀 하이라이팅
│   ├── views/
│   │   ├── TimelineView.tsx
│   │   ├── CardView.tsx
│   │   └── MapView.tsx
│   ├── chat/
│   │   ├── ChatPanel.tsx
│   │   ├── MessageList.tsx
│   │   └── DiffPreview.tsx       # AI 변경사항 미리보기
│   └── shared/
│       ├── ViewSwitcher.tsx
│       └── ThemeSwitcher.tsx
│
├── lib/
│   ├── markdown/
│   │   ├── parse.ts              # md → Itinerary
│   │   ├── serialize.ts          # Itinerary → md
│   │   └── schema.ts             # Zod 스키마
│   ├── llm/
│   │   ├── client.ts             # Anthropic SDK 래퍼
│   │   ├── tools.ts              # tool 정의
│   │   └── system-prompt.ts      # 동적 프롬프트 빌더
│   ├── supabase/
│   │   ├── client.ts             # 브라우저 클라이언트
│   │   ├── server.ts             # 서버 클라이언트
│   │   └── trips.ts              # 일정 쿼리
│   ├── store/
│   │   └── trip-store.ts         # Zustand
│   └── utils/
│       ├── debounce.ts
│       └── diff.ts
│
├── themes/
│   ├── timeline/
│   │   ├── default.css
│   │   ├── minimal.css
│   │   └── notebook.css
│   ├── card/
│   └── map/
│
├── prompts/
│   └── system.md                 # AI 시스템 프롬프트 (수정 쉽게)
│
├── public/
│   └── presets/                  # 예시 일정 .md 파일들
│       ├── tokyo-3days.md
│       └── paris-5days.md
│
├── CLAUDE.md
├── AGENTS.md
└── spec.md                       # 이 문서
```

## 8. 마일스톤

**M1 — 코어 (1주)**
- 마크다운 에디터 + Timeline 뷰만
- 양방향 동기화 (md ↔ JSON ↔ 시각화)
- localStorage 저장
- 모바일 반응형

**M2 — 인증 + 클라우드 (3일)**
- Supabase Auth
- 일정 CRUD
- 자동 저장

**M3 — AI 채팅 (1주)**
- `/api/chat` 라우트
- Tool use + diff 미리보기
- 스트리밍 응답

**M4 — 멀티 뷰 (4일)**
- Card 뷰
- Map 뷰 (Leaflet)
- 뷰 간 항목 클릭 ↔ 에디터 점프

**M5 — 테마 시스템 (3일)**
- 테마 CSS 분리
- 테마 스위처
- 4개 기본 테마

**M6 — 공유 / 임베드 (3일)**
- 공유 링크
- iframe 임베드
- read-only 뷰

## 9. 비목표 (v1에서 안 함)

- 협업 편집 (멀티 유저 동시 편집)
- 항공편/호텔 자동 검색
- 결제 / 예약 연동
- 모바일 네이티브 앱
- 오프라인 모드 (PWA는 추후)
- 다국어 (한국어만 우선, i18n 구조는 잡아둠)
- 사용자 커스텀 CSS 업로드 (v2)

## 10. 성공 기준

- 사용자가 마크다운 파일 하나만 가지고 모든 작업 가능
- Claude Code 사용자가 만든 .md 파일을 그대로 import 해서 시각화 가능
- 모바일에서 한 손으로 일정 편집 가능
- 채팅 한 줄로 "둘째 날 비 오면 갈 곳 추가해줘" 같은 요청이 실제 일정에 반영됨
