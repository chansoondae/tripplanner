import OpenAI from "openai";
import { NextRequest } from "next/server";
import { z } from "zod";

const client = new OpenAI();

const RequestSchema = z.object({
  markdown: z.string(),
  recentMessages: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
  hasPendingEdit: z.boolean().optional(),
});

const ResponseSchema = z.object({
  suggestions: z.array(z.string()).length(3),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { markdown, recentMessages = [], hasPendingEdit = false } = parsed.data;

  // 일정이 비어있는지 판단: 활동 항목(- **HH:MM**)이 2개 미만이면 빈 일정
  const activityCount = (markdown.match(/- \*\*\d{2}:\d{2}\*\*/g) ?? []).length;
  const isEmpty = activityCount < 2;

  const hasConversation = recentMessages.length > 0;
  // pendingEdit(diff 대기)가 실제로 있을 때만 "제안대로 수정해줘" 표시
  const hasModificationSuggestion = hasPendingEdit;

  // 마지막 사용자 메시지는 제외 — 방금 실행한 것과 동일한 추천 반복 방지
  const messagesForContext = recentMessages.at(-1)?.role === "user"
    ? recentMessages.slice(0, -1)
    : recentMessages;

  const contextBlock = hasConversation
    ? `\n\n최근 대화:\n${messagesForContext.map((m) => `${m.role === "user" ? "사용자" : "AI"}: ${m.content.slice(0, 200)}`).join("\n")}`
    : "";

  const systemPrompt = hasConversation
    ? `당신은 여행 일정 AI 어시스턴트입니다.
여행 일정과 최근 대화를 읽고, 사용자가 다음에 바로 요청할 수 있는 액션 문구 3개를 한국어로 생성하세요.

규칙:
- 반드시 최근 대화 맥락을 이어받아 자연스러운 다음 요청을 만들 것
${hasModificationSuggestion ? '- AI가 수정안을 제안했으므로 첫 번째 항목은 반드시 "제안대로 수정해줘"로 할 것\n' : ""}- AI가 정보(시간, 장소 등)를 되물었다면 구체적인 답변 형태로 만들 것 (예: "14:00에 추가해줘", "카펠교 근처로 해줘")
- 이미 일정에 반영된 내용이나 방금 실행한 요청과 동일한 내용은 절대 추천하지 말 것
- 각 문구는 40자 이내의 구체적인 요청문

반드시 아래 JSON 형식으로만 응답하세요:
{"suggestions": ["문구1", "문구2", "문구3"]}`
    : isEmpty
    ? `당신은 여행 일정 AI 어시스턴트입니다.
여행 일정이 거의 비어있습니다. 사용자가 여행 계획을 시작할 때 AI에게 할 수 있는 포괄적인 요청 문구 3개를 한국어로 생성하세요.

규칙:
- 여행지, 날짜, 인원, 테마 등 여행 전체를 설정하는 큰 요청을 만들 것
- 예시 유형:
  - 여행지 + 기간으로 전체 일정 생성 ("스위스 5박 6일 일정 짜줘")
  - 여행 스타일/테마 설정 ("자연 위주 힐링 여행으로 짜줘")
  - 여행지 추천 요청 ("유럽 2주 여행지 추천해줘")
- 각 문구는 30자 이내
- 지엽적인 특정 시간/장소 언급 금지

반드시 아래 JSON 형식으로만 응답하세요:
{"suggestions": ["문구1", "문구2", "문구3"]}`
    : `당신은 여행 일정 AI 어시스턴트입니다.
주어진 여행 일정을 읽고, 사용자가 AI에게 바로 요청할 수 있는 구체적인 액션 문구 3개를 한국어로 생성하세요.

규칙:
- 실제 일정의 Day, 시간, 장소, 활동을 언급해서 구체적으로 작성
- 다음 중 다양한 유형을 섞을 것:
  - 특정 날짜/시간에 활동 추가
  - 빈 시간대 채우기
  - 장소/활동 교체
  - 여행지 정보 질문
- 각 문구는 40자 이내

반드시 아래 JSON 형식으로만 응답하세요:
{"suggestions": ["문구1", "문구2", "문구3"]}`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 200,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `여행 일정:\n${markdown}${contextBlock}` },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "";

  try {
    const data = ResponseSchema.parse(JSON.parse(content));
    return Response.json(data);
  } catch {
    return Response.json(
      { suggestions: ["일정 요약해줘", "이동 동선 확인해줘", "식사 장소 추천해줘"] }
    );
  }
}
