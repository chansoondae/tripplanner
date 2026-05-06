# Trip Planner

마크다운으로 여행 일정을 작성하면 타임라인으로 시각화하고, AI 채팅으로 수정·질문할 수 있는 웹앱.

## 주요 기능

- **마크다운 에디터** — CodeMirror 6 기반. 직접 작성하거나 붙여넣기
- **타임라인 시각화** — Day별 시간 순 정렬, 장소·가격·소요시간·팁 표시
- **AI 채팅** — 일정 수정 요청 또는 여행 관련 질문. 변경 전 diff 미리보기 후 승인/거절
- **AI 되돌리기** — AI 편집 전 상태로 1단계 복원
- **동적 추천** — 현재 일정 기반으로 질문 예시 자동 생성
- **Google Maps 연동** — `@장소명` 형식으로 자동 지도 링크 생성
- **로컬 저장** — localStorage에 자동 저장 (debounce 1초)

## 마크다운 형식

```markdown
---
title: 도쿄 여행
dates: 2026-05-01 ~ 2026-05-05
travelers: 2
---

## Day 1 (5/1 금)

- **09:00** 신주쿠 출발 @신주쿠역
- **11:00** 센소지 관람 @浅草寺
  - ⏱ 약 1시간 30분
  - 💰 무료
  - 💡 오전 일찍 가면 한산함
- **13:00** 점심 @Ichiran Ramen Asakusa
  - 추천: 돈코츠 라멘
  - 💰 1인 ¥1,200
```

### 활동 항목 구문

| 요소 | 형식 | 예시 |
|------|------|------|
| 시간 | `**HH:MM**` | `**09:00**` |
| 장소 | `@장소명` | `@센소지` |
| 지도 링크 | `[텍스트](url)` | `[지도](https://...)` |
| 소요시간 | sub-bullet `⏱` | `- ⏱ 약 2시간` |
| 가격 | sub-bullet `💰` | `- 💰 무료` |
| 팁 | sub-bullet `💡` | `- 💡 예약 권장` |
| 메모 | sub-bullet (prefix 없음) | `- 추천: 돈코츠` |

`@장소명`만 입력하면 Google Maps 검색 링크가 자동으로 생성됩니다.

## 시작하기

### 환경 변수 설정

`.env.local` 파일을 생성하고 아래 값을 입력합니다:

```env
OPENAI_API_KEY=sk-...

# Supabase (선택)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 개발 서버 실행

```bash
pnpm install
pnpm dev
```

[http://localhost:3000](http://localhost:3000) 접속

## 프로젝트 구조

```
app/
  trips/
    page.tsx          # 여행 목록
    [id]/page.tsx     # 여행 상세 (에디터 + 타임라인 + 채팅)
  api/
    chat/route.ts     # OpenAI 스트리밍 프록시 (gpt-4o)
    suggestions/route.ts  # 동적 추천 생성 (gpt-4o-mini)

components/
  editor/
    MarkdownEditor.tsx  # CodeMirror 6 에디터
  views/
    TimelineView.tsx    # Day/Activity 타임라인
  chat/
    ChatPanel.tsx       # AI 채팅 + 추천 버튼
    DiffPreview.tsx     # 변경 diff 미리보기

lib/
  markdown/
    schema.ts     # Zod 타입 (Activity, Day, Itinerary)
    parse.ts      # 마크다운 → Itinerary 파서
    serialize.ts  # Itinerary → 마크다운 직렬화
  store/
    trip-store.ts # Zustand 상태 (마크다운 단일 원본)
  utils/
    diff.ts       # LCS diff + applyToolEdit
    trip-list.ts  # localStorage 여행 목록 관리
  llm/
    tools.ts      # OpenAI tool 정의
    system-prompt.ts  # 시스템 프롬프트 빌더

prompts/
  system.md       # AI 시스템 프롬프트 (형식 규약, 편집 규칙)
```

## 아키텍처

**마크다운이 단일 원본(source of truth)**입니다.

```
마크다운 편집
     │
     ▼
  parse.ts ──► Zustand store ──► TimelineView
                   │
                   ▼
             localStorage
                   │
              AI 채팅 요청
                   │
              OpenAI API (gpt-4o)
              tool_use: update_markdown
                   │
              diff 미리보기
                   │
            승인 → applyAIEdit
            거절 → 무시
```

- 에디터·시각화·채팅 모두 Zustand 스토어 하나를 구독
- AI는 `update_markdown` tool로만 마크다운 수정 (평문 파싱 금지)
- 모든 AI 변경은 diff 승인 후 적용
- DB 저장은 `markdown` 컬럼(string)만. JSON 파생물은 캐시로만 사용

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS 4 |
| 에디터 | CodeMirror 6 |
| 상태 관리 | Zustand |
| 마크다운 파싱 | unified / remark |
| AI | OpenAI gpt-4o / gpt-4o-mini |
| 스키마 검증 | Zod |
| DB | Supabase (선택) |
| 패키지 매니저 | pnpm |
