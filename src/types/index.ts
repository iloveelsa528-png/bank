export interface Choice {
  number: number; // 1~5
  text: string;
}

export interface Question {
  id: string; // crypto.randomUUID() 같은 고유값
  questionNumber: number; // 문제 번호
  questionText: string; // 발문
  boxText?: string; // 이 문제에만 딸린 <보기>
  choices: Choice[];
}

export interface StructuredResult {
  passageGroupLabel?: string; // 예: "[11~14]", "[1~3]"
  area: "문학" | "독서" | "문법" | "화작" | "기타";
  passageTitle?: string; // 작품명 또는 글 제목
  passageAuthor?: string; // 작가 또는 출처
  passageContent?: string; // 지문 본문 전체
  sharedBoxContent?: string; // 지문 전체에 공통으로 붙은 <보기>
  questions: Question[];
}

// ── 3단계: 문항 분석 ──────────────────────────────────────────────────────

export interface ChoiceAnalysis {
  number: number;
  isCorrect: boolean;
  reason: string; // 정답 근거 or 오답 이유
}

export interface QuestionAnalysis {
  questionNumber: number;
  intent: string; // 출제 의도
  answerNumber: number; // 정답 번호
  answerBasis: string; // 정답 근거 (지문 근거 포함)
  choiceAnalysis: ChoiceAnalysis[]; // 선택지별 정오 판단
  confusionPoints: string; // 학생이 헷갈릴 수 있는 지점
  variantElements: string; // 변형 문제로 만들 수 있는 요소
}

export interface AnalysisResult {
  passageKeyPoints: string; // 지문 핵심 내용
  questions: QuestionAnalysis[];
}

// ── 4단계: 유사·변형 문제 생성 ───────────────────────────────────────────

export type Difficulty = "기본" | "응용" | "고난도";
export type GeneratedQuestionType = "유사" | "변형" | "서술형";

export interface GeneratedChoice {
  number: number;
  text: string;
  isCorrect: boolean;
  reason: string; // 정답이면 근거, 오답이면 오답 이유
}

export interface GeneratedQuestion {
  type: GeneratedQuestionType;
  difficulty: Difficulty;
  questionText: string;
  choices: GeneratedChoice[]; // 서술형은 빈 배열
  answer: number; // 정답 번호 (서술형은 0)
  explanation: string; // 해설
  descriptiveAnswer: string; // 서술형 모범 답안 (객관식은 빈 문자열)
}

export interface GenerationResult {
  similarQuestions: GeneratedQuestion[]; // 유사 유형 3개
  variantQuestions: GeneratedQuestion[]; // 변형 유형 3개
  descriptiveQuestion: GeneratedQuestion; // 서술형 1개
}

// ── 5단계: 저장·검색 ──────────────────────────────────────────────────────

export interface ProblemMeta {
  title: string;
  schoolName: string;
  grade: string;
  subjectArea: string;
  unitName: string;
  difficulty: string;
}

export interface Problem {
  id: string;
  title: string;
  school_name: string;
  grade: string;
  subject_area: string;
  unit_name: string;
  difficulty: string;
  ocr_raw_text: string;
  ocr_edited_text: string;
  structured_data: StructuredResult | null;
  original_analysis: AnalysisResult | null;
  created_at: string;
  updated_at: string;
}

export interface ProblemWithQuestions extends Problem {
  generated_questions: {
    id: string;
    problem_id: string;
    question_type: string;
    difficulty: string;
    question_text: string;
    choices: GeneratedChoice[];
    answer: number;
    explanation: string;
    descriptive_answer: string;
  }[];
}
