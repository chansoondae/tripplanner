export type DiffLine = {
  type: "added" | "removed" | "unchanged";
  content: string;
};

export function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];

  // 간단한 LCS 기반 diff (줄 단위)
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        oldLines[i - 1] === newLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // 역추적
  const trace: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      trace.push({ type: "unchanged", content: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      trace.push({ type: "added", content: newLines[j - 1] });
      j--;
    } else {
      trace.push({ type: "removed", content: oldLines[i - 1] });
      i--;
    }
  }

  return trace.reverse().filter((line, idx, arr) => {
    // unchanged 줄은 변경 줄 주변 3줄만 표시
    if (line.type !== "unchanged") return true;
    const prev = arr[idx - 1];
    const next = arr[idx + 1];
    const prevChanged = prev && prev.type !== "unchanged";
    const nextChanged = next && next.type !== "unchanged";
    return prevChanged || nextChanged;
  });

  return result;
}

// update_markdown tool 결과를 마크다운에 적용
export function applyToolEdit(
  original: string,
  edit: {
    type: "replace_section" | "replace_all" | "insert_after" | "delete";
    target: string;
    content: string;
  }
): string {
  if (edit.type === "replace_all") {
    return edit.content;
  }

  const lines = original.split("\n");

  if (edit.type === "replace_section") {
    // target이 "## " 없이 왔을 때도 매칭
    const normalizedTarget = edit.target.trim().replace(/^##\s*/, "");
    const startIdx = lines.findIndex((l) => {
      const normalized = l.trim().replace(/^##\s*/, "");
      // 완전 일치 또는 시작 부분 일치 (예: "Day 1" → "Day 1 (5/1 금)")
      return (
        normalized === normalizedTarget ||
        normalized.startsWith(normalizedTarget) ||
        l.trim() === edit.target.trim()
      );
    });
    if (startIdx === -1) return original;

    // 다음 ## 헤더까지가 섹션 범위
    let endIdx = lines.findIndex(
      (l, i) => i > startIdx && l.startsWith("## ")
    );
    if (endIdx === -1) endIdx = lines.length;

    // content에 헤더가 없으면 원본 헤더를 보존
    const contentHasHeader = edit.content.trimStart().startsWith("## ");
    const preserved = contentHasHeader
      ? edit.content
      : `${lines[startIdx]}\n\n${edit.content}`;

    return [
      ...lines.slice(0, startIdx),
      preserved,
      ...lines.slice(endIdx),
    ].join("\n");
  }

  if (edit.type === "insert_after") {
    const normalizedTarget = edit.target.trim().replace(/^##\s*/, "");
    const idx = lines.findIndex((l) => {
      const normalized = l.trim().replace(/^##\s*/, "");
      return (
        normalized === normalizedTarget ||
        normalized.startsWith(normalizedTarget) ||
        l.trim() === edit.target.trim()
      );
    });
    if (idx === -1) return original;

    // 해당 섹션 끝 (다음 ## 전) 또는 헤더 바로 다음에 삽입
    let insertAt = idx + 1;
    // 빈 줄 스킵
    while (insertAt < lines.length && lines[insertAt].trim() === "") insertAt++;

    // 섹션 끝 찾기
    let sectionEnd = lines.findIndex(
      (l, i) => i > idx && l.startsWith("## ")
    );
    if (sectionEnd === -1) sectionEnd = lines.length;

    return [
      ...lines.slice(0, sectionEnd),
      "",
      edit.content,
      ...lines.slice(sectionEnd),
    ].join("\n");
  }

  if (edit.type === "delete") {
    return lines
      .filter((l) => l.trim() !== edit.target.trim())
      .join("\n");
  }

  return original;
}
