// ── 7-2단계: 새 지문 등록 ────────────────────────────────────────────────────

export interface CandidateQuestionPoint {
  element: string;       // 출제 가능 요소명
  description: string;   // 설명
  question_type: string; // 예상 문항 유형 (내용이해, 추론 등)
}

// 지문 내 그림 자리표시([그림A] 등)와 실제 이미지 URL의 매핑
export interface ImageSlot {
  id: string;   // "A" | "B" | … — passage_text 안의 [그림A] 중 A 부분
  url: string;  // "/uploads/passage-images/{uuid}/{id}.{ext}"
}

export interface SourcePassage {
  id: string;
  user_id: string;
  title: string;
  area: string;          // 문학, 독서, 문법, 화작
  source_type: string;   // 교과서, 문학작품, 독서지문, 학교자료, 직접입력
  passage_text: string;
  ocr_raw_text: string;
  analysis_summary: string;
  key_points: string;
  candidate_question_points: CandidateQuestionPoint[];
  image_urls: (string | ImageSlot)[];  // 구 형식(string[])과 신 형식(ImageSlot[]) 모두 허용
  created_at: string;
  updated_at: string;
}

export interface SourcePassageMeta {
  title: string;
  area: string;
  source_type: string;
}
