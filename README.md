# Travel Planner

마크다운 기반 AI 여행 일정 편집 플랫폼. 마크다운 파일이 진실의 원천이고, AI 채팅·시각화·직접 편집이 동일한 파일을 수정하는 방식으로 동작합니다.

**Live:** https://tripplanner-nine-omega.vercel.app

---

## 핵심 컨셉: 마크다운이 진실

모든 일정 데이터의 원본은 마크다운 파일입니다. JSON은 파생물일 뿐이고, 세 가지 편집 방식이 모두 동일한 마크다운을 수정합니다.

```
┌─────────────────────────────────────┐
│         Markdown (진실의 원천)        │
└──────┬──────────────┬───────────────┘
       │              │               │
  직접 편집        AI 채팅         시각화 인터랙션
 (CodeMirror)   (GPT-4o)       (Timeline 드래그)
```

일정 데이터가 앱에 갇히지 않습니다. 마크다운 파일을 노션, 블로그, 메모장 어디에든 그대로 가져갈 수 있습니다.

---

## 주요 기능

### 1. 5단계 여행 위저드

새 일정 생성 시 단계별 모달로 안내합니다.

- **Step 1** 여행지 선택 (스위스·도쿄·오사카·다낭 또는 직접 입력)
- **Step 2** 여행 월 선택 (1~12월)
- **Step 3** 여행 기간 선택 (2~9일 또는 직접 입력)
- **Step 4** 동행 선택 (혼자·커플·아이·부모님 또는 직접 입력)
- **Step 5** 명소 선택 → AI 초안 자동 생성

스위스는 42개 명소 프리셋(융프라우, 체르마트, 루체른 등)을 버튼으로 선택할 수 있고, 직접 입력도 가능합니다. 각 단계는 건너뛰기 가능하며 빈 일정으로 바로 시작할 수도 있습니다.

### 2. AI 채팅 편집 (GPT-4o)

자연어로 일정을 수정하고 여행 정보를 질문합니다.

- **Tool Use 기반 수정**: AI가 평문 응답이 아닌 `update_markdown` 도구를 호출해 일정을 수정합니다. 정규식 파싱 없이 구조적으로 안전합니다.
- **Diff 미리보기**: 변경 내용을 적용하기 전에 diff로 확인하고 승인/거부할 수 있습니다.
- **Zod 검증**: LLM 응답은 항상 Zod 스키마로 검증 후 적용됩니다.
- **스트리밍**: SSE 스트리밍으로 첫 토큰부터 즉시 표시됩니다.
- **Pending Edit 컨텍스트**: diff 대기 중에 새 메시지를 보내면 원본이 아닌 변경된 마크다운을 기준으로 AI가 응답합니다.
- **마크다운 렌더링**: AI 응답은 `react-markdown`으로 렌더링됩니다. 굵은 글씨는 선분홍색으로 강조됩니다.

### 3. 스위스 교통 요금 참조 (조건부 주입)

"교통", "패스", "CHF", "융프라우" 등 키워드가 감지될 때만 `prompts/reference/2026_Switzerland_Transportation_Guide.md` 요금표를 시스템 프롬프트에 자동 추가합니다.

- AI 환각 없이 정확한 요금(Swiss Travel Pass, 구간권, 산악열차 할인율 등) 기반 추천
- 요금표 업데이트는 MD 파일만 수정하면 됩니다
- 키워드 미감지 시 파일을 읽지 않아 토큰 낭비 없음

### 4. AI 제안 버튼

채팅창 하단에 상황에 맞는 다음 행동 버튼 3개를 자동 생성합니다.

- 일정이 거의 비어있으면 포괄적 제안 ("스위스 5박 6일 일정 짜줘")
- 일정이 채워져 있으면 맥락 기반 구체적 제안 ("Day 2 저녁 식당 추천해줘")
- diff 대기 중이면 첫 번째 제안이 "제안대로 수정해줘"로 고정

### 5. 슬라이드 사이드바

- 헤더의 햄버거 메뉴 클릭 → 왼쪽에서 슬라이드 인
- 여행 목록, 현재 여행 하이라이트, 삭제, 새 일정 생성

### 6. Google OAuth 로그인 (Supabase Auth)

- 이메일/비밀번호 없이 Google 계정으로 로그인
- 미로그인 시 `/login`으로 자동 리다이렉트 (`proxy.ts`)
- 로그인한 사용자의 여행만 보이는 RLS 정책

### 7. 마크다운 에디터 (CodeMirror 6)

- 실시간 파싱 → 타임라인 즉시 갱신 (debounce 200ms)
- SSR 비활성화(`dynamic import`)로 브라우저 전용 실행

### 8. 타임라인 시각화

- Day별 섹션, 시간 순 정렬
- 항목 클릭 → 편집 탭 전환 + 에디터 해당 위치 하이라이트
- Google Maps 링크 자동 생성 (`@장소명` 형식)

---

## 데이터 정합성 보장

### 마크다운 ↔ JSON 무손실 라운드트립

마크다운을 JSON으로 파싱하고 다시 마크다운으로 직렬화할 때 사용자가 직접 쓴 자유 텍스트, 빈 줄, 이모지, 코멘트가 손실되지 않습니다.

```
마크다운 → (parse.ts) → Itinerary JSON → (serialize.ts) → 마크다운
                                                              ↓
                                                    원본과 동일해야 함
```

### AI는 마크다운만 수정

AI가 JSON을 직접 조작하는 경우는 없습니다. 모든 AI 변경은 마크다운 문자열을 수정하는 `update_markdown` tool_use를 통해서만 이루어지고, 이후 파서를 거쳐 JSON이 파생됩니다.

### 단일 Zustand 스토어

에디터·시각화·채팅이 모두 동일한 Zustand 스토어를 구독합니다. 상태 불일치가 발생할 수 없습니다.

```typescript
// 모든 편집이 이 하나의 경로를 통과
store.setMarkdown(md) → parse(md) → parsed (Itinerary) → 뷰 리렌더
                                  → debounce 1초 → Supabase 저장
```

### Supabase RLS

- 클라이언트에서 service role key 사용 금지, anon key + RLS만 사용
- `tp_trips` 테이블: `auth.uid() = user_id` 정책으로 타인의 여행 접근 불가
- DB에는 `markdown` 컬럼(string)만 저장. JSON은 캐시용 `meta` 컬럼에만 저장

### AI 변경 전 Diff 미리보기

AI가 일정을 자동으로 수정하지 않습니다. 모든 AI 수정은 diff로 먼저 보여주고 사용자가 승인해야 적용됩니다. 마크다운 50% 이상 교체 시 추가 확인을 요청합니다.

---

## 마크다운 형식

```markdown
---
title: 스위스 5박 6일 여행
dates: 2026-06-01 ~ 2026-06-06
travelers: 커플여행
---

## Day 1 (06/01 목)

- **09:00** 인천공항 출발 ✈️
- **14:00** 취리히 도착 후 인터라켄 이동 🚄
  - ⏱ 약 2시간
  - 💰 40 CHF
  - 💡 Swiss Travel Pass 이용 가능
- **18:30** 저녁식사 @Restaurant Laterne 🍖
  - 💰 1인 CHF 40~50
  - 💡 치즈 퐁듀 추천
```

| 요소 | 형식 | 예시 |
|------|------|------|
| 시간 | `**HH:MM**` | `**09:00**` |
| 장소 | `@장소명` | `@센소지` |
| 소요시간 | sub-bullet `⏱` | `- ⏱ 약 2시간` |
| 비용 | sub-bullet `💰` | `- 💰 CHF 40` |
| 팁 | sub-bullet `💡` | `- 💡 예약 권장` |
| 메모 | sub-bullet (prefix 없음) | `- 추천: 돈코츠` |

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript (strict) |
| 스타일 | Tailwind CSS 4 |
| 에디터 | CodeMirror 6 |
| 마크다운 파싱 | unified + remark-parse + remark-frontmatter |
| 스키마 검증 | Zod |
| LLM | OpenAI GPT-4o + GPT-4o-mini |
| DB / Auth | Supabase (Postgres + RLS + Google OAuth) |
| 상태 관리 | Zustand |
| 마크다운 렌더링 | react-markdown + @tailwindcss/typography |
| 배포 | Vercel |

---

## 프로젝트 구조

```
tripplanner/
├── app/
│   ├── login/page.tsx                   # Google OAuth 로그인
│   ├── trips/
│   │   ├── page.tsx                     # 여행 목록
│   │   └── [id]/page.tsx                # 메인 편집 화면
│   └── api/
│       ├── chat/route.ts                # LLM 스트리밍 프록시
│       ├── suggestions/route.ts         # 다음 행동 제안 생성
│       ├── trip-wizard/route.ts         # 위저드 AI 일정 생성
│       └── auth/callback/route.ts       # OAuth 콜백
│
├── components/
│   ├── editor/MarkdownEditor.tsx        # CodeMirror 6 (SSR 비활성화)
│   ├── views/TimelineView.tsx           # 타임라인 시각화
│   ├── chat/
│   │   ├── ChatPanel.tsx                # AI 채팅 (스트리밍 + tool_use)
│   │   ├── ChatBottomSheet.tsx          # 모바일 바텀시트
│   │   └── DiffPreview.tsx              # 변경 diff 미리보기
│   ├── NewTripModal.tsx                 # 5단계 여행 위저드 모달
│   └── TripSidebar.tsx                  # 슬라이드 사이드바
│
├── lib/
│   ├── markdown/
│   │   ├── parse.ts                     # md → Itinerary (무손실)
│   │   ├── serialize.ts                 # Itinerary → md
│   │   └── schema.ts                    # Zod 타입 정의
│   ├── llm/
│   │   ├── tools.ts                     # update_markdown 도구 정의
│   │   └── system-prompt.ts             # 컨텍스트 주입 + 교통 참조 조건부 추가
│   ├── supabase/
│   │   ├── client.ts                    # 브라우저 클라이언트 (anon key)
│   │   ├── server.ts                    # 서버 클라이언트 (쿠키 세션)
│   │   └── trips.ts                     # trip CRUD
│   └── store/trip-store.ts              # Zustand (단일 상태 원천)
│
├── prompts/
│   ├── system.md                        # AI 시스템 프롬프트
│   └── reference/
│       └── 2026_Switzerland_Transportation_Guide.md  # 스위스 교통 요금표
│
├── themes/timeline/                     # 타임라인 테마 CSS
├── proxy.ts                             # 인증 미들웨어 (Next.js 16)
└── public/presets/                      # 예시 일정 md 파일
```

---

## 환경변수 설정

`.env.local` 파일을 생성하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-...
```

---

## 로컬 실행

```bash
pnpm install
pnpm dev
# http://localhost:3000
```

---

## 알려진 설계 결정 및 트레이드오프

**교통 요금을 항상 주입하지 않는 이유**
스위스 교통 요금표(약 100줄)를 매 요청마다 포함하면 불필요한 토큰 비용이 발생합니다. 키워드 감지로 필요할 때만 주입합니다.

**GPT-4o-mini를 제안 버튼에 사용하는 이유**
제안 버튼 생성은 단순한 분류 작업이라 GPT-4o 대비 비용이 약 10배 저렴한 GPT-4o-mini로 충분합니다.

**CodeMirror를 dynamic import로 처리하는 이유**
CodeMirror 6은 브라우저 API에 의존해 SSR에서 동작하지 않습니다. `ssr: false`로 클라이언트에서만 로드합니다.

**Supabase RLS에만 의존하는 이유**
API 라우트에서 별도 권한 검사를 하지 않습니다. RLS 정책이 DB 레벨에서 강제하므로 중복 검사가 불필요합니다.
