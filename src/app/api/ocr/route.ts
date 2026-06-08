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

  const imageFile = formData.get("image");

  if (!imageFile || !(imageFile instanceof File)) {
    return NextResponse.json(
      { error: "이미지 파일이 필요합니다" },
      { status: 400 }
    );
  }

  const mediaType = imageFile.type;
  if (!isSupportedMediaType(mediaType)) {
    return NextResponse.json(
      { error: "지원하지 않는 파일 형식입니다 (JPG, PNG, WEBP, GIF, PDF)" },
      { status: 400 }
    );
  }

  try {
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64ImageData = Buffer.from(arrayBuffer).toString("base64");

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64ImageData,
              },
            },
            {
              type: "text",
              text: `이 시험지 이미지에서 모든 텍스트를 정확하게 추출해주세요.

추출 규칙:
- 지문, 문제 번호, 발문, 선택지, 보기 등 모든 텍스트를 포함하세요
- 원본 텍스트의 줄바꿈과 번호 구조를 최대한 유지하세요
- 선택지는 "① ② ③ ④ ⑤" 형태를 그대로 유지하세요
- 표나 도표가 있으면 텍스트로 최대한 표현하세요
- 추출된 텍스트만 반환하고 설명은 덧붙이지 마세요`,
            },
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
