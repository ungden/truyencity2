/**
 * Types for Novel Title Scraper System
 */

export type Platform = 'qidian' | 'zongheng' | 'faloo';

export type NovelStatus = 'ongoing' | 'completed' | 'hiatus';

export interface ScrapedNovel {
  platform: Platform;
  title_chinese: string;
  title_hanviet?: string;
  url: string;
  author: string;
  genre: string;
  tags: string[];
  synopsis: string;
  stats: {
    views?: number;
    rating?: number;
    chapters?: number;
    status: NovelStatus;
    rank?: number;
  };
  scraped_at: string;
}

export interface TitlePattern {
  pattern_id: string;
  pattern_type: string;
  structure: string;
  examples: string[];
  frequency: number;
  avg_rating: number;
  genres: string[];
  description: string;
}

export interface SynopsisHook {
  hook_id: string;
  hook_type: string;
  pattern: string;
  examples: string[];
  effectiveness_score: number;
  genres: string[];
}

export interface ScraperConfig {
  platform: Platform;
  maxNovelsPerGenre: number;
  delayBetweenRequests: number; // milliseconds
  timeout: number;
  retries: number;
  headless: boolean;
}

export interface ScraperResult {
  platform: Platform;
  success: boolean;
  novels_scraped: number;
  errors: Array<{
    url: string;
    error: string;
    timestamp: string;
  }>;
  duration_seconds: number;
  started_at: string;
  finished_at: string;
}

// Genre mapping from Chinese platforms to our system
export const GENRE_MAPPING: Record<string, string> = {
  // Xianxia/Cultivation
  '仙侠': 'tien-hiep',
  '修真': 'tien-hiep',
  '东方玄幻': 'huyen-huyen',
  '玄幻': 'huyen-huyen',
  '异世大陆': 'huyen-huyen',
  
  // System/LitRPG
  '游戏': 'system-litrpg',
  '系统流': 'system-litrpg',
  '游戏异界': 'system-litrpg',
  
  // Urban/Modern
  '都市': 'urban-modern',
  '都市生活': 'urban-modern',
  '都市异能': 'urban-modern',
  
  // Romance
  '言情': 'romance',
  '现代言情': 'romance',
  '古代言情': 'romance',
  
  // Historical
  '历史': 'historical',
  '架空历史': 'historical',
  '穿越': 'historical',
  
  // Action/Adventure
  '武侠': 'action-adventure',
  '冒险': 'action-adventure',
  
  // Sci-fi/Apocalypse
  '科幻': 'sci-fi-apocalypse',
  '末世': 'sci-fi-apocalypse',
  '星际': 'sci-fi-apocalypse',
  
  // Horror/Mystery
  '悬疑': 'horror-mystery',
  '灵异': 'horror-mystery',
  '推理': 'horror-mystery',
};

// Title pattern keywords for analysis
export const TITLE_KEYWORDS = {
  numbers: ['万', '千', '百', '九', '十', '一', '亿', '兆'],
  realms: ['帝', '尊', '圣', '仙', '神', '王', '皇', '主', '宗', '师'],
  actions: ['吞噬', '修炼', '掠夺', '镇压', '横扫', '称霸', '逆袭', '崛起'],
  mystery: ['秘', '禁', '诡', '隐', '暗', '影', '谜', '封'],
  system: ['签到', '氪金', '开局', '绑定', '激活', '觉醒', '系统'],
  locations: ['界', '域', '天', '地', '星', '宇', '世', '府'],
  emotions: ['无敌', '最强', '至尊', '巅峰', '极品', '顶级', '超凡'],
};
