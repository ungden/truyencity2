/**
 * Story Engine v2 — Style Bible
 *
 * Ported from v1 style-bible.ts
 * Provides rich style context, vocabulary, and pacing rules.
 */

import type { GenreType } from '../types';

export type SceneType = 'action' | 'cultivation' | 'revelation' | 'romance' | 'dialogue' | 'tension' | 'comedy';

export interface PacingRule {
  sentenceLength: { min: number; max: number };
  dialogueRatio: { min: number; max: number };
  paceSpeed: 'fast' | 'medium' | 'slow';
}

export interface VocabularyGuide {
  emotions: {
    anger: string[];
    shock: string[];
    contempt: string[];
    determination: string[];
  };
  powerExpressions: {
    techniques: string[];
    weakToStrong: string[];
    breakthrough: string[];
  };
  atmosphere: {
    tense: string[];
    mysterious: string[];
    dangerous: string[];
  };
  honorifics: {
    superior: string[];
    peer: string[];
    enemy: string[];
  };
}

export interface StyleExemplar {
  content: string;
  notes: string[];
}

export interface EnhancedStyleBible {
  vocabulary: VocabularyGuide;
  pacingRules: Record<SceneType, PacingRule>;
  exemplars: StyleExemplar[];
  cliffhangerTechniques: Array<{ name: string; example: string }>;
}

export const CLIFFHANGER_TECHNIQUES = [
  { name: 'Revelation', example: 'MC phát hiện bí mật động trờii' },
  { name: 'Threat', example: 'Kẻ thù mạnh xuất hiện đột ngột' },
  { name: 'Choice', example: 'MC phải chọn giữa hai điều quan trọng' },
  { name: 'Discovery', example: 'Tìm thấy vật phẩm/cổ vật bí ẩn' },
  { name: 'Promise', example: 'Lờii hứa/hẹn gặp lại đầy nguy hiểm' },
];

const DEFAULT_VOCABULARY: VocabularyGuide = {
  emotions: {
    anger: ['phẫn nộ', 'giận dữ', 'tức giận', 'căm phẫn', 'thịnh nộ'],
    shock: ['bàng hoàng', 'sửng sốt', 'kinh ngạc', 'choáng váng', 'ngỡ ngàng'],
    contempt: ['khinh bỉ', 'coi thường', 'xem thường', 'khinh thường', 'dè bỉu'],
    determination: ['quyết tâm', 'kiên quyết', 'quyết chí', 'bền bỉ', 'bất khuất'],
  },
  powerExpressions: {
    techniques: ['chiêu thức', 'tuyệt kỹ', 'bí pháp', 'thần thông', 'pháp thuật'],
    weakToStrong: ['nhược đến cường', 'yếu thắng mạnh', 'lấy nhu thắng cương', 'phản bại vi thắng'],
    breakthrough: ['đột phá', 'tiến giai', 'bước vào', 'đạt đến', 'vượt qua bình cảnh'],
  },
  atmosphere: {
    tense: ['căng thẳng', 'nghẹt thở', 'kịch tính', 'gay cấn', 'hồi hộp'],
    mysterious: ['bí ẩn', 'thần bí', 'huyền bí', 'khó lường', 'bí hiểm'],
    dangerous: ['nguy hiểm', 'hiểm trở', 'trùng trùng hiểm nguy', 'tử địa', 'tuyệt cảnh'],
  },
  honorifics: {
    superior: ['lão gia', 'tiền bối', 'sư tôn', 'tông chủ', 'đại nhân'],
    peer: ['sư huynh', 'sư đệ', 'sư tỷ', 'sư muội', 'huynh đệ'],
    enemy: ['tiểu tử', 'tên kia', 'kẻ này', 'hạng người', 'vật'],
  },
};

const DEFAULT_PACING_RULES: Record<SceneType, PacingRule> = {
  action: {
    sentenceLength: { min: 5, max: 15 },
    dialogueRatio: { min: 0.1, max: 0.3 },
    paceSpeed: 'fast',
  },
  cultivation: {
    sentenceLength: { min: 10, max: 25 },
    dialogueRatio: { min: 0.1, max: 0.2 },
    paceSpeed: 'slow',
  },
  revelation: {
    sentenceLength: { min: 8, max: 20 },
    dialogueRatio: { min: 0.2, max: 0.4 },
    paceSpeed: 'medium',
  },
  romance: {
    sentenceLength: { min: 10, max: 25 },
    dialogueRatio: { min: 0.3, max: 0.5 },
    paceSpeed: 'slow',
  },
  dialogue: {
    sentenceLength: { min: 5, max: 15 },
    dialogueRatio: { min: 0.5, max: 0.7 },
    paceSpeed: 'medium',
  },
  tension: {
    sentenceLength: { min: 5, max: 12 },
    dialogueRatio: { min: 0.1, max: 0.25 },
    paceSpeed: 'fast',
  },
  comedy: {
    sentenceLength: { min: 5, max: 15 },
    dialogueRatio: { min: 0.4, max: 0.6 },
    paceSpeed: 'medium',
  },
};

export function getEnhancedStyleBible(_genre: GenreType): EnhancedStyleBible {
  // For now, return default. Could be extended per genre.
  return {
    vocabulary: DEFAULT_VOCABULARY,
    pacingRules: DEFAULT_PACING_RULES,
    exemplars: [],
    cliffhangerTechniques: CLIFFHANGER_TECHNIQUES,
  };
}

export function buildStyleContext(_genre: GenreType, _dominantSceneType: string): string {
  // Returns style context for Writer
  return `PHONG CÁCH VIẾT:
- Câu ngắn gọn, súc tích cho action; câu dài, miêu tả chi tiết cho cultivation
- Đối thoại tự nhiên, mỗi nhân vật có giọng riêng
- Show don't tell: miêu tả biểu cảm, hành động, cảm giác cơ thể
- Dùng thành ngữ Việt Nam và thuật ngữ Hán-Việt phù hợp thể loại`;
}
