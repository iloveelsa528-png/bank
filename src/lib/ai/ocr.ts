import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

const client = new Anthropic();

const SUPPORTED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type SupportedMedia = (typeof SUPPORTED_MEDIA)[number];

function mediaTypeFromPath(filePath: string): SupportedMedia {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

export interface OcrOutput {
  text: string;
}

export interface OcrUsage {
  model: string;
  input_tokens: number;
  output_tokens: number;
}

export interface OcrResult {
  output: OcrOutput;
  usage: OcrUsage;
}

export async function runOcrChunk(localImagePath: string): Promise<OcrResult> {
  const absPath = path.isAbsolute(localImagePath)
    ? localImagePath
    : path.join(process.cwd(), localImagePath);

  const buffer = await fs.readFile(absPath);
  const base64 = buffer.toString('base64');
  const mediaType = mediaTypeFromPath(absPath);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: `당신은 한국어 시험지 이미지 전문 OCR 엔진입니다.
현대 한국어뿐 아니라 고어·옛표기(ㆍ아래아, ㆎ, ㅸ순경음비읍, ㆁ옛이응, ㅿ반치음 등)도 정확히 인식합니다.
어떠한 설명·거절 없이 전사 텍스트만 출력합니다.`,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        {
          type: 'text',
          text: `이 한국어 시험지 이미지의 모든 텍스트를 빠짐없이 전사하세요.

레이아웃 처리:
- 2단(좌·우 컬럼) 구성이면 왼쪽 컬럼 전체를 위→아래로 다 읽은 뒤, 오른쪽 컬럼을 위→아래로 읽습니다
- 절대로 좌·우 컬럼의 내용을 같은 줄에 섞지 마세요 (예: "왼쪽내용   오른쪽내용" ← 금지)
- 각 단 안에서는 위에서 아래 순서로 읽습니다

포함해야 할 요소:
- 지시문 (예: [11~14] 다음 글을 읽고 물음에 답하시오.)
- 지문 본문 전체 (한 문장도 빠뜨리지 마세요)
- 보기 박스 내용
- 문제 번호와 발문
- 선택지 ①②③④⑤ 전체

텍스트 처리:
- 공백(스페이스)으로 시각적 정렬이나 들여쓰기를 하지 마세요 — 줄바꿈(\\n)만 사용합니다
- 선택지(①②③④⑤)는 각각 새 줄에 출력합니다
- 글자가 흐리거나 작아도 한국어 맥락으로 가장 가능성 높은 단어로 전사합니다
- 고어·옛표기 문자(ㆍ ㆎ ㅸ ㆁ ㅿ 등)는 현대어로 바꾸지 말고 원문 그대로 전사합니다
- 고어 지문이 있는 경우 현대어 번역이나 주석 없이 원문만 적습니다
- 완전히 잘려 읽을 수 없는 부분만 [잘림]으로 표시합니다
- ① ② ③ ④ ⑤ 기호는 그대로 유지합니다
- 전사 텍스트만 반환하고 설명은 절대 덧붙이지 않습니다`,
        },
      ],
    }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  const text = textBlock?.type === 'text' ? textBlock.text : '';

  return {
    output: { text },
    usage: {
      model: 'claude-sonnet-4-6',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}
