import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import { visit } from "unist-util-visit";
import { parse as parseYaml } from "yaml";
import type { Root, Heading, List, ListItem, Paragraph, Strong, Text, Node } from "mdast";
import type { Itinerary, Day, Activity, ItineraryMeta } from "./schema";

function generateId(dayIndex: number, position: number, title: string): string {
  const hash = title
    .split("")
    .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 0)
    .toString(16)
    .slice(0, 8);
  return `day-${dayIndex}-${position}-${hash}`;
}

function inferActivityType(title: string, location?: string): Activity["type"] {
  const t = title.toLowerCase();
  if (/호텔|체크인|숙소|숙박/.test(t)) return "accommodation";
  if (/식사|점심|저녁|아침|조식|레스토랑|카페|맛집|스시|라멘|먹/.test(t)) return "meal";
  if (/공항|비행|기차|지하철|버스|택시|이동|출발|도착/.test(t)) return "transit";
  if (/산책|쇼핑|관람|투어|박물관|미술관|공원|사원|신사/.test(t)) return "sightseeing";
  return "activity";
}

function extractTextFromNode(node: Node): string {
  if (node.type === "text") return (node as Text).value;
  if ("children" in node && Array.isArray((node as { children: Node[] }).children)) {
    return (node as { children: Node[] }).children.map(extractTextFromNode).join("");
  }
  return "";
}

function parseActivityLine(raw: string, dayIndex: number, position: number): Activity {
  // Pattern: **HH:MM** 제목 [@장소] [[텍스트](url)] [이모지]
  const timeMatch = raw.match(/^\*\*(\d{1,2}:\d{2})\*\*\s*/);
  let rest = raw;
  let time: string | undefined;

  if (timeMatch) {
    time = timeMatch[1];
    rest = raw.slice(timeMatch[0].length);
  }

  // [텍스트](url) 링크 추출
  const urlMatch = rest.match(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/);
  let url: string | undefined;
  if (urlMatch) {
    url = urlMatch[2];
    rest = rest.replace(urlMatch[0], "").trim();
  }

  const locationMatch = rest.match(/@([^\s@]+(?:\s+[^\s@]+)*?)(?:\s|$)/);
  let location: string | undefined;
  if (locationMatch) {
    location = locationMatch[1];
    rest = rest.replace(locationMatch[0], " ").trim();
    if (!url) {
      url = `https://www.google.com/maps/search/${encodeURIComponent(location)}`;
    }
  }

  const emojiMatch = rest.match(/([\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}])/u);
  let emoji: string | undefined;
  if (emojiMatch) {
    emoji = emojiMatch[0];
    rest = rest.replace(emojiMatch[0], "").trim();
  }

  // Remove dash and em-dash separators
  const title = rest.replace(/\s*[—–-]\s*/, " ").trim() || raw;
  const id = generateId(dayIndex, position, title);

  return {
    id,
    time,
    title,
    location,
    emoji,
    url,
    type: inferActivityType(title, location),
  };
}

function parseDayLabel(label: string): string {
  // Try to extract ISO date from patterns like "Day 1 (5/1 목)" with a base year
  const match = label.match(/\((\d{1,2})\/(\d{1,2})/);
  if (match) {
    const month = match[1].padStart(2, "0");
    const day = match[2].padStart(2, "0");
    return `2026-${month}-${day}`;
  }
  return "";
}

export function parseMarkdown(markdown: string): Itinerary {
  const processor = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]);
  const tree = processor.parse(markdown) as Root;

  let meta: ItineraryMeta = {
    title: "여행 일정",
    start_date: "",
    end_date: "",
    travelers: 1,
  };

  // Parse frontmatter
  visit(tree, "yaml", (node: { value: string }) => {
    try {
      const fm = parseYaml(node.value) as Record<string, unknown>;
      if (typeof fm.title === "string") meta.title = fm.title;
      if (typeof fm.travelers === "number") meta.travelers = fm.travelers;
      if (typeof fm.theme === "string") meta.theme = fm.theme;
      if (typeof fm.dates === "string") {
        const [start, end] = fm.dates.split("~").map((s: string) => s.trim());
        meta.start_date = start ?? "";
        meta.end_date = end ?? start ?? "";
      }
    } catch {
      // ignore parse errors
    }
  });

  const days: Day[] = [];
  let currentDay: Day | null = null;

  for (const node of tree.children) {
    if (node.type === "heading" && (node as Heading).depth === 2) {
      if (currentDay) days.push(currentDay);
      const label = extractTextFromNode(node);
      const dayIndex = days.length;
      currentDay = {
        index: dayIndex,
        date: parseDayLabel(label),
        label,
        items: [],
      };
    } else if (node.type === "list" && currentDay) {
      const list = node as List;
      list.children.forEach((listItem: ListItem, pos: number) => {
        const firstChild = listItem.children[0];
        if (!firstChild) return;

        let rawText = extractTextFromNode(firstChild);

        // Handle **time** bold pattern via AST
        if (firstChild.type === "paragraph") {
          const para = firstChild as Paragraph;
          rawText = para.children
            .map((c) => {
              if (c.type === "strong") return `**${extractTextFromNode(c as Node)}**`;
              return extractTextFromNode(c as Node);
            })
            .join("");
        }

        const activity = parseActivityLine(rawText, currentDay!.index, pos);

        // Sub-bullets 분류: ⏱ duration, 💰 price, 💡 tips, 나머지 notes
        if (listItem.children.length > 1) {
          const subList = listItem.children.find((c) => c.type === "list") as List | undefined;
          if (subList) {
            const notes: string[] = [];
            const tips: string[] = [];
            for (const sub of subList.children) {
              const text = extractTextFromNode(sub).trim();
              if (text.startsWith("⏱")) {
                activity.duration = text.replace(/^⏱\s*/, "");
              } else if (text.startsWith("💰")) {
                activity.price = text.replace(/^💰\s*/, "");
              } else if (text.startsWith("💡")) {
                tips.push(text.replace(/^💡\s*/, ""));
              } else {
                notes.push(text);
              }
            }
            if (notes.length > 0) activity.notes = notes;
            if (tips.length > 0) activity.tips = tips;
          }
        }

        currentDay!.items.push(activity);
      });
    }
  }

  if (currentDay) days.push(currentDay);

  // 각 day의 items를 시간순 정렬 (time 없는 항목은 뒤로)
  for (const day of days) {
    day.items.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  }

  // Infer dates from days if not in frontmatter
  if (!meta.start_date && days.length > 0) {
    meta.start_date = days[0].date;
    meta.end_date = days[days.length - 1].date;
  }

  return { meta, days, raw_markdown: markdown };
}
