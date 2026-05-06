import OpenAI from "openai";
import { NextRequest } from "next/server";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/llm/system-prompt";
import { llmTools } from "@/lib/llm/tools";

const client = new OpenAI();

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  markdown: z.string(),
  selectedDay: z.string().optional(),
  selectedItem: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
    });
  }

  const { messages, markdown, selectedDay, selectedItem } = parsed.data;
  const systemPrompt = buildSystemPrompt({ markdown, selectedDay, selectedItem });

  const stream = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    tools: llmTools,
    tool_choice: "auto",
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
