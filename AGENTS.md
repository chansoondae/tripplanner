# Agent reference

도메인 용어, 아키텍처, 흔한 작업 패턴, 알려진 함정. CLAUDE.md가 "어떻게 일할지"를 다룬다면 이 문서는 "이 코드베이스의 지형"을 다룬다.

---

## Domain glossary

- **Trip / Itinerary** — 한 번의 여행 전체. 하나의 마크다운 파일과 1:1 대응.
- **Day** — 하루치 일정. 마크다운에선 `## Day N` 헤더로 구분.
- **Activity / Item** — Day 안의 항목 한 개. `- **HH:MM** 제목 ...`
- **TimeSlot** — Activity의 시간대. morning/lunch/afternoon/dinner/evening (자동 분류용).
- **View** — 시각화 방식: timeline, card, map.
- **Theme** — View 안의 시각 스타일. CSS 파일 하나.
- **Frontmatter** — 마크다운 상단 YAML 블록. title, dates, theme 등 메타정보.
- **Raw markdown** — 사용자가 작성한 원본 텍스트. 절대 손실되지 않아야 함.

---

## Architecture map

### `app/`
라우팅과 페이지. 비즈니스 로직 최소화.
- `app/trips/[id]/page.tsx` — 메인 편집 화면 (에디터 + 뷰 + 채팅)
- `app/api/chat/route.ts` — Anthropic API 프록시. 스트리밍 응답.
- `app/api/trips/route.ts` — Supabase 래퍼. RLS에 의존하므로 추가 권한 검사 불필요.

### `components/`
- `editor/` — CodeMirror 6 래퍼. 마크다운 입력만 담당, 파싱은 `lib/markdown/`에 위임.
- `views/` — 시각화. props로 `Itinerary` 받고 사용자 인터랙션을 콜백으로 상위에 전달. 직접 스토어 수정 금지.
- `chat/` — 채팅 UI + diff 미리보기. API 호출은 훅(`useChat`)에 캡슐화.

### `lib/markdown/`
**가장 중요한 모듈.** 마크다운 ↔ JSON 변환의 단일 진실의 원천.
- `parse.ts` — `unified` AST로 파싱 후 `Itinerary` 객체로 변환
- `serialize.ts` — `Itinerary` → 마크다운 문자열
- `schema.ts` — Zod 스키마

### `lib/llm/`
Anthropic API 호출과 도구 정의.
- `tools.ts` — `update_markdown`, `suggest_only` 등 정의
- `system-prompt.ts` — 현재 마크다운·선택 항목·사용자 선호를 받아 시스템 프롬프트 생성
- `client.ts` — Anthropic SDK 얇은 래퍼. **서버 사이드만**.

### `lib/supabase/`
DB 접근 전부.
- `client.ts` — 브라우저용 (anon key)
- `server.ts` — 서버용 (cookies로 세션 복원)
- `trips.ts` — trip CRUD 쿼리

### `lib/store/trip-store.ts`
Zustand 스토어. 다음을 보유:
- 현재 일정 (`raw_markdown` + 파생된 `parsed: Itinerary`)
- 선택 상태 (active day, selected item)
- 저장 상태 (`saving | saved | error`)
- 메서드: `setMarkdown`, `selectItem`, `applyAIEdit` 등

### `prompts/system.md`
AI 시스템 프롬프트 본체. 코드 변경 없이 동작 튜닝 가능.

### `themes/`
시각화 테마 CSS. View별로 폴더 분리.

---

## Common workflows

### 새 사용자가 일정 생성
1. `/trips` → "새 일정" → `/trips/new`
2. 빈 마크다운 템플릿 또는 preset 선택 (`public/presets/*.md`)
3. `lib/supabase/trips.ts:create` 호출
4. `/trips/{id}`로 리다이렉트

### 마크다운 편집 → 시각화 갱신
1. 사용자가 에디터에 입력
2. `MarkdownEditor`의 `onChange` → `store.setMarkdown(text)`
3. 스토어 내부에서 `lib/markdown/parse.ts` 호출
4. 파생 상태 `parsed`를 구독하는 뷰들이 자동 리렌더
5. 1초 debounce 후 `lib/supabase/trips.ts:update` 호출

### 시각화에서 항목 드래그 → 마크다운 수정
1. View 컴포넌트가 드래그 종료를 감지 → 콜백 호출
2. 상위에서 `store.moveItem(id, newTime)` 호출
3. 스토어가 `parsed`를 수정 → `lib/markdown/serialize.ts`로 마크다운 재생성
4. 새 마크다운을 `setMarkdown`으로 적용 (에디터도 갱신됨)

**주의:** serialize → parse 라운드트립을 거치므로, 사용자가 손으로 쓴 코멘트가 있으면 보존되어야 함. 테스트 필수.

### AI 채팅 편집
1. 사용자 입력 → `useChat` 훅
2. POST `/api/chat` (현재 마크다운 + 메시지 히스토리 + 선택 컨텍스트)
3. 서버: `lib/llm/system-prompt.ts`로 프롬프트 생성 → Anthropic API 스트리밍 호출
4. 클라이언트: 스트리밍 텍스트 표시
5. `tool_use` 블록 도착 시: Zod 검증 → 변경사항 객체 생성
6. `<DiffPreview>` 컴포넌트가 적용 전/후 마크다운 diff 표시
7. 사용자 "적용" 클릭 → `store.applyAIEdit(diff)`
8. 일반 저장 흐름 따라감

### 새 시각화 뷰 추가
1. `components/views/NewView.tsx` 생성
2. props: `{ itinerary: Itinerary; onItemClick?: (id) => void; onItemMove?: (id, newTime) => void }`
3. `themes/new-view/default.css` 생성, CSS 변수 사용
4. `ViewSwitcher`에 등록
5. 모바일에서 동작 확인

---

## Markdown parsing rules

`unified` + `remark-parse` + `remark-frontmatter` 조합.

### 파싱 우선순위
1. Frontmatter (`---`)는 항상 파일 최상단
2. `## Day N` 헤더가 day 경계. 텍스트는 자유롭게 (`## Day 1 (5/1 목)` OK)
3. Day 안의 최상위 불릿(`-`)이 Activity
4. Activity 패턴: `**HH:MM** 제목 [@장소] [이모지]`
5. Activity 아래 들여쓴 불릿은 `notes`

### 견고함 원칙
- 패턴에 맞지 않는 항목도 버리지 말고 `title`로만 가진 Activity로 보존
- 시간이 없으면 `time: undefined`, 위치는 day 안의 순서로 결정
- frontmatter가 없어도 동작 (`title`은 첫 H1 또는 파일명에서 추론)
- 파싱 실패 시 마지막 성공 상태 유지, 에디터에 경고만 표시

### Activity ID 안정성
편집할 때마다 ID가 바뀌면 시각화에서 선택 상태 등이 깨짐.
- ID 생성 규칙: `day-{dayIndex}-{positionInDay}-{titleHash8}` (이상적이진 않지만 견고)
- 더 좋은 방법은 마크다운 코멘트로 ID 임베드 (`<!-- id: abc123 -->`) — v1에선 생략

---

## LLM tool use patterns

### 좋은 도구 호출 예시
```json
{
  "name": "update_markdown",
  "input": {
    "type": "insert_after",
    "target": "## Day 2",
    "content": "- **15:00** 팀랩 보더리스 @오다이바\n  - 예약 필요\n  - 약 2시간 소요",
    "reason": "Day 2 오후에 비 와도 즐길 수 있는 실내 어트랙션 추가"
  }
}
```

### 나쁜 도구 호출 (거부할 것)
- `target`이 모호함 ("there", "the second day")
- `content`가 마크다운 형식 위반
- `reason`이 없거나 의미 없음
- 한 번에 너무 많은 변경 (full replace인데 사유가 작은 변경)

### 시스템 프롬프트 핵심
`prompts/system.md` 안에 다음 포함:
- 마크다운 형식 규약
- 사용 가능한 도구
- "사용자 의도가 불분명하면 `suggest_only`로 질문 먼저"
- "기존 사용자 텍스트 스타일 따르기 (이모지 사용 여부, 한국어/영어 등)"

---

## Known pitfalls

### 마크다운 ↔ JSON 라운드트립 손실
- AST → 객체 변환 시 빈 줄, 이상한 공백, HTML 코멘트 등이 사라지기 쉬움
- **해결:** `raw_markdown`을 항상 보존하고, 시각화에서의 편집은 가능한 작은 부분만 다시 직렬화하는 식으로 구현

### CodeMirror SSR 이슈
- CodeMirror 6은 SSR 미지원
- `dynamic(() => import('...'), { ssr: false })`로 동적 임포트 필수

### Supabase RLS 디버깅
- 정책 누락 시 그냥 빈 배열 반환 (에러 없음)
- 새 테이블 만들 때 RLS 정책 같이 작성 안 하면 영원히 빈 결과
- 디버깅 시 SQL Editor에서 service role로 직접 쿼리해 데이터 존재 여부 먼저 확인

### Anthropic 스트리밍 + tool use
- 텍스트와 tool_use가 섞여서 스트림됨
- 클라이언트에서 둘을 구분해 처리 (텍스트는 즉시 표시, tool_use는 완료 후 검증)
- `content_block_delta` 이벤트의 `type` 필드로 구분

### 한국어 시간 표기
- 사용자가 "오후 3시", "15:00", "3pm" 등 다양하게 쓸 수 있음
- 파서는 `HH:MM`만 인식. AI가 사용자 입력을 정규화해서 마크다운에 쓰도록 시스템 프롬프트에 명시.

### 모바일에서 키보드 올라올 때 레이아웃
- iOS Safari가 viewport를 줄이지 않음 → 채팅창이 키보드 뒤에 가려짐
- `visualViewport` API로 높이 조정 필요

### Zustand + React 18 hydration
- 초기 상태가 서버/클라이언트 다르면 hydration 에러
- 클라이언트 전용 상태는 `useEffect`로 초기화하거나 `'use client'` 컴포넌트로 격리

---

## Performance notes

- 마크다운 파싱은 큰 파일에서도 빠르지만(< 5ms for 5KB), 매 키스트로크 파싱은 낭비. debounce 200ms.
- 시각화 리렌더는 `parsed.days`를 useMemo로 안정화.
- LLM 응답은 항상 스트리밍으로. 첫 토큰까지 시간(TTFT)이 UX 좌우.
- Supabase 저장은 debounce 1초 + 사용자가 페이지 이탈 시 즉시 flush.

---

## Testing strategy

v1 기준 최소한:
- 마크다운 라운드트립 테스트 (`parse(serialize(parse(md))) === parse(md)`) — 필수
- LLM tool 응답 Zod 검증 테스트
- 핵심 시나리오 E2E 1개 (일정 생성 → 편집 → AI 수정 → 저장)

과한 테스트는 지양. 복잡한 도메인 로직(파서)에 집중.
