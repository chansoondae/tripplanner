import OpenAI from "openai";
import { NextRequest } from "next/server";
import { z } from "zod";

const client = new OpenAI();

const RequestSchema = z.object({
  action: z.enum(["suggest_spots", "generate_itinerary"]),
  country: z.string(),
  month: z.string(),
  duration: z.string(),
  companion: z.string(),
  selectedSpots: z.array(z.string()).optional(),
});

const SpotsResponseSchema = z.object({
  spots: z.array(z.object({ name: z.string(), description: z.string() })).length(9),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const { action, country, month, duration, companion, selectedSpots } = parsed.data;

  if (action === "suggest_spots") {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `한국인 여행자가 좋아하는 ${country}의 명소/활동 9가지를 추천하세요.
${month}에 가는 ${duration} 여행, 동행: ${companion}.
계절과 동행에 맞는 곳으로 선정하세요.

반드시 아래 JSON 형식으로만 응답:
{"spots": [{"name": "명소명", "description": "한 줄 설명 (15자 이내)"}]}`,
        },
        { role: "user", content: "명소 9개 추천해줘" },
      ],
    });

    try {
      const data = SpotsResponseSchema.parse(JSON.parse(res.choices[0]?.message?.content ?? ""));
      return Response.json(data);
    } catch {
      return Response.json({ error: "Parse error" }, { status: 500 });
    }
  }

  if (action === "generate_itinerary") {
    const res = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: `당신은 여행 일정 전문가입니다. 현재 연도는 ${new Date().getFullYear()}년입니다. 아래 형식의 마크다운 여행 일정을 생성하세요.

형식 (코드블록 없이 그대로 출력):
---
title: 여행 제목
dates: YYYY-MM-DD ~ YYYY-MM-DD
travelers: 동행 정보
---

## Day 1 (MM/DD 요일)

- **HH:MM** 활동명 @장소명 이모지
  - ⏱ 소요시간
  - 💰 비용 (CHF 또는 현지 통화)
  - 💡 팁

규칙:
- 선택된 명소를 자연스러운 동선으로 배치
- 식사 포함 (실제 레스토랑명 @장소명)
- 이동 시간 고려
- 코드블록(\`\`\`) 절대 사용 금지, 마크다운 텍스트만 출력`,
        },
        {
          role: "user",
          content: `${country} ${duration} 여행 일정 생성해줘.
여행 연도: ${new Date().getFullYear()}년
여행 월: ${month}
동행: ${companion}
반드시 포함할 명소: ${selectedSpots?.join(", ")}

마크다운만 출력해줘.`,
        },
      ],
    });

    const raw = res.choices[0]?.message?.content ?? "";
    const markdown = raw.replace(/^```(?:markdown)?\n?/m, "").replace(/\n?```$/m, "").trim();
    return Response.json({ markdown });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
