import type { Itinerary, Day, Activity } from "./schema";

function serializeActivity(activity: Activity): string {
  const parts: string[] = ["-"];

  if (activity.time) parts.push(`**${activity.time}**`);

  let title = activity.title;
  if (activity.emoji) title += ` ${activity.emoji}`;
  parts.push(title);

  if (activity.location) parts.push(`@${activity.location}`);

  if (activity.url) parts.push(`[지도](${activity.url})`);

  const line = parts.join(" ");

  const subLines: string[] = [];
  if (activity.duration) subLines.push(`  - ⏱ ${activity.duration}`);
  if (activity.price) subLines.push(`  - 💰 ${activity.price}`);
  if (activity.notes) subLines.push(...activity.notes.map((n) => `  - ${n}`));
  if (activity.tips) subLines.push(...activity.tips.map((t) => `  - 💡 ${t}`));

  return subLines.length > 0 ? `${line}\n${subLines.join("\n")}` : line;
}

function serializeDay(day: Day): string {
  const header = `## ${day.label}`;
  const items = day.items.map(serializeActivity).join("\n");
  return items ? `${header}\n\n${items}` : header;
}

export function serializeItinerary(itinerary: Itinerary): string {
  const { meta, days } = itinerary;

  const frontmatterLines = [
    "---",
    `title: ${meta.title}`,
  ];

  if (meta.start_date && meta.end_date) {
    frontmatterLines.push(`dates: ${meta.start_date} ~ ${meta.end_date}`);
  }

  frontmatterLines.push(`travelers: ${meta.travelers}`);

  if (meta.theme) {
    frontmatterLines.push(`theme: ${meta.theme}`);
  }

  frontmatterLines.push("---");

  const frontmatter = frontmatterLines.join("\n");
  const dayBlocks = days.map(serializeDay).join("\n\n");

  return `${frontmatter}\n\n${dayBlocks}\n`;
}
