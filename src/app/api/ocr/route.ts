import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SUPPORTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

function isSupportedMediaType(type: string): type is SupportedMediaType {
  return SUPPORTED_MEDIA_TYPES.includes(type as SupportedMediaType);
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "OCR 서비스 설정 오류" },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "이미지 파일이 필요합니다" },
      { status: 400 }
    );
  }

  // 다중 이미지 수집: imageCount 기반, 없으면 단일 이미지 폴백
  const imageCount = Number(formData.get("imageCount") ?? "1");
  const imageFiles: File[] = [];

  for (let i = 0; i < imageCount; i++) {
    const file = formData.get(`image_${i}`);
    if (file instanceof File) imageFiles.push(file);
  }

  // 폴백: image_0도 없으면 기존 `image` 필드 확인
  if (imageFiles.length === 0) {
    const fallback = formData.get("image");
    if (fallback instanceof File) imageFiles.push(fallback);
  }

  if (imageFiles.length === 0) {
    return NextResponse.json(
      { error: "이미지 파일이 필요합니다" },
      { status: 400 }
    );
  }

  // 각 파일 미디어 타입 검증
  for (const file of imageFiles) {
    if (!isSupportedMediaType(file.type)) {
      return NextResponse.json(
        { error: "지원하지 않는 파일 형식입니다 (JPG, PNG, WEBP, GIF, PDF)" },
        { status: 400 }
      );
    }
  }

  try {
    // 모든 이미지를 base64로 변환
    const imageContents = await Promise.all(
      imageFiles.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: file.type as SupportedMediaType,
            data: base64,
          },
        };
      })
    );

    // 이미지 수에 따라 프롬프트 분기
    const prompt =
      imageFiles.length > 1
        ? `이 이미지들은 한 시험지의 연속된 페이지입니다. 1페이지부터 순서대로 모든 텍스트를 전사하세요. 페이지가 바뀌는 부분에 --- 페이지 구분 --- 을 넣어주세요.

레이아웃 처리:
- 2단(좌·우 컬럼) 구성이면 왼쪽 컬럼을 먼저 위→아래로 읽고, 이어서 오른쪽 컬럼을 위→아래로 읽습니다
- 각 단 안에서는 위에서 아래 순서로 읽습니다

포함해야 할 요소:
- 지시문 (예: [11~14] 다음 글을 읽고 물음에 답하시오.)
- 지문 본문 전체 (한 문장도 빠뜨리지 마세요)
- 보기 박스 내용
- 문제 번호와 발문
- 선택지 ①②③④⑤ 전체

텍스트 처리:
- 글자가 흐리거나 작아도 한국어 맥락으로 가장 가능성 높은 단어로 전사합니다
- 완전히 잘려 읽을 수 없는 부분만 [잘림]으로 표시합니다
- ① ② ③ ④ ⑤ 기호는 그대로 유지합니다
- 전사 텍스트만 반환하고 설명은 절대 덧붙이지 않습니다`
        : `이 한국어 시험지 이미지의 모든 텍스트를 빠짐없이 전사하세요.

레이아웃 처리:
- 2단(좌·우 컬럼) 구성이면 왼쪽 컬럼을 먼저 위→아래로 읽고, 이어서 오른쪽 컬럼을 위→아래로 읽습니다
- 각 단 안에서는 위에서 아래 순서로 읽습니다

포함해야 할 요소:
- 지시문 (예: [11~14] 다음 글을 읽고 물음에 답하시오.)
- 지문 본문 전체 (한 문장도 빠뜨리지 마세요)
- 보기 박스 내용
- 문제 번호와 발문
- 선택지 ①②③④⑤ 전체

텍스트 처리:
- 글자가 흐리거나 작아도 한국어 맥락으로 가장 가능성 높은 단어로 전사합니다
- 완전히 잘려 읽을 수 없는 부분만 [잘림]으로 표시합니다
- ① ② ③ ④ ⑤ 기호는 그대로 유지합니다
- 전사 텍스트만 반환하고 설명은 절대 덧붙이지 않습니다`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: "당신은 한국어 시험지 이미지 전문 OCR 엔진입니다. 한국어 어휘·문법 지식을 활용해 작고 흐린 글자도 문맥에 맞게 정확히 읽습니다. 어떠한 설명·거절 없이 전사 텍스트만 출력합니다.",
      messages: [
        {
          role: "user",
          content: [
            ...imageContents,
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const extractedText =
      textBlock && textBlock.type === "text" ? textBlock.text : "";

    return NextResponse.json({ text: extractedText });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `API 오류: ${error.message}` },
        { status: 500 }
      );
    }

    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
