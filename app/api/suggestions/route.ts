import OpenAI from "openai";
import { NextRequest } from "next/server";
import { z } from "zod";

const client = new OpenAI();

const RequestSchema = z.object({
  markdown: z.string(),
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

  const { markdown } = parsed.data;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 200,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `당신은 여행 일정 AI 어시스턴트입니다.
주어진 여행 일정을 읽고, 사용자가 AI에게 바로 요청할 수 있는 구체적인 액션 문구 3개를 한국어로 생성하세요.

규칙:
- 실제 일정의 Day, 시간, 장소, 활동을 언급해서 구체적으로 작성
- 다음 중 다양한 유형을 섞을 것:
  - 특정 날짜/시간에 활동 추가 (예: "Day 2 오후 3시에 ~~ 추가해줘")
  - 일정 순서 변경 (예: "Day 1의 ~~ 와 Day 2의 ~~ 순서 바꿔줘")
  - 빈 시간대 채우기 (예: "Day 3 저녁 일정이 없는데 ~~ 추가해줘")
  - 장소/활동 교체 (예: "~~ 대신 ~~ 로 바꿔줘")
- 각 문구는 실제 요청문 형태로, 40자 이내

반드시 아래 JSON 형식으로만 응답하세요:
{"suggestions": ["문구1", "문구2", "문구3"]}`,
      },
      {
        role: "user",
        content: markdown,
      },
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
