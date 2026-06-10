// ── 7-3단계: 기출 패턴 기반 문제 생성 ───────────────────────────────────────

export interface PatternBasedChoice {
  number: number;
  text: string;
  is_correct: boolean;
  reason: string; // 정답 근거 or 오답 이유
}

export interface PatternBasedQuestion {
  question_number: number;
  question_type: string;   // 내용이해, 추론, 표현분석 등
  difficulty: string;      // 기본, 응용, 고난도
  question_text: string;   // 발문
  choices: PatternBasedChoice[];
  answer: number;          // 정답 번호 (서술형=0)
  explanation: string;     // 해설
  descriptive_answer: string; // 서술형 모범 답안
  pattern_reference: string;  // 어떤 패턴을 적용했는지
}

export interface PatternBasedQuestionSet {
  id: string;
  user_id: string;
  pattern_set_id: string;
  source_passage_id: string;
  title: string;
  generated_questions: PatternBasedQuestion[];
  difficulty: string;
  area: string;
  created_at: string;
  updated_at: string;
  visibility: 'private' | 'link_only' | 'neighbors' | 'public';
  share_token: string;
  // joins
  exam_pattern_sets?: { title: string; school_name: string; grade: string };
  source_passages?: { title: string; area: string; passage_text?: string; key_points?: string; image_urls?: string[] };
}
