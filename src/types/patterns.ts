// ── 7단계: 기출 패턴 재구성 ────────────────────────────────────────────────

export interface ExamPattern {
  id?: string;
  pattern_set_id?: string;
  question_number: number;
  question_type: string;       // 내용이해, 추론, 비판적사고, 표현분석, 어휘문법, 적용, 기타
  prompt_style: string;        // 발문 방식 (예: "적절한 것은?")
  choice_style: string;        // 선택지 구성 방식
  answer_basis_type: string;   // 정답 근거 방식
  wrong_choice_pattern: string;// 오답 선택지 패턴
  difficulty: string;          // 기본, 응용, 고난도
  intent: string;              // 출제 의도
  uses_reference_box: boolean; // <보기> 활용 여부
  pattern_summary: string;     // 패턴 한 줄 요약
  created_at?: string;
}

export interface ExamPatternSet {
  id: string;
  user_id: string;
  school_name: string;
  grade: string;
  semester: string;
  exam_name: string;
  area: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  exam_patterns?: ExamPattern[];
}

export interface ExamPatternSetMeta {
  title: string;
  school_name: string;
  grade: string;
  semester: string;
  exam_name: string;
  area: string;
  description: string;
}
