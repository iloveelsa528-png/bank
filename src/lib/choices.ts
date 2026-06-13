export const CIRCLE = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

export function normCmp(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

// choices 모든 항목의 본문이 question_text 안에 이미 포함된 경우 true.
// 단, 10자 미만 텍스트(기호만 등)는 판정에서 제외해 오탐 방지.
export function isChoicesDuplicated(
  question_text: string,
  choices: Array<{ text: string }>,
): boolean {
  if (choices.length < 2) return false;
  const qtNorm = normCmp(question_text);
  return choices.every(c => {
    const t = normCmp(c.text);
    return t.length >= 10 && qtNorm.includes(t);
  });
}

// 중복이면 choices의 text를 기호만으로 교체해 반환. 나머지 필드(is_correct 등)는 보존.
// 중복이 아니면 원본 그대로 반환.
export function sanitizeChoices<T extends { text: string }>(
  question_text: string,
  choices: T[],
): T[] {
  if (!isChoicesDuplicated(question_text, choices)) return choices;
  return choices.map((c, i) => ({ ...c, text: CIRCLE[i] ?? `${i + 1}.` }));
}
