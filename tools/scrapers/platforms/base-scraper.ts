/**
 * Base Scraper - Shared utilities for all platform scrapers
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ScrapedNovel, ScraperConfig, ScraperResult, Platform } from '../types';

export abstract class BaseScraper {
  protected config: ScraperConfig;
  protected novels: ScrapedNovel[] = [];
  protected errors: Array<{ url: string; error: string; timestamp: string }> = [];
  protected startTime: Date;

  constructor(config: ScraperConfig) {
    this.config = config;
    this.startTime = new Date();
  }

  abstract scrape(): Promise<ScraperResult>;

  protected log(message: string, level: 'info' | 'error' | 'warn' = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.config.platform}] [${level.toUpperCase()}] ${message}`;
    console.log(logMessage);
    
    // Also write to log file
    const logFile = path.join(__dirname, '../logs', `${this.config.platform}.log`);
    fs.appendFileSync(logFile, logMessage + '\n');
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.delay(delay);
  }

  protected recordError(url: string, error: string) {
    this.errors.push({
      url,
      error,
      timestamp: new Date().toISOString(),
    });
    this.log(`Error scraping ${url}: ${error}`, 'error');
  }

  protected saveResults(): ScraperResult {
    const endTime = new Date();
    const duration = (endTime.getTime() - this.startTime.getTime()) / 1000;

    const result: ScraperResult = {
      platform: this.config.platform,
      success: this.errors.length < this.novels.length / 2, // Success if < 50% errors
      novels_scraped: this.novels.length,
      errors: this.errors,
      duration_seconds: duration,
      started_at: this.startTime.toISOString(),
      finished_at: endTime.toISOString(),
    };

    // Save novels to JSON
    const dataDir = path.join(__dirname, '../data');
    const novelsFile = path.join(dataDir, `${this.config.platform}-novels.json`);
    fs.writeFileSync(novelsFile, JSON.stringify(this.novels, null, 2));
    this.log(`Saved ${this.novels.length} novels to ${novelsFile}`, 'info');

    // Save result summary
    const resultFile = path.join(dataDir, `${this.config.platform}-result.json`);
    fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
    this.log(`Saved result summary to ${resultFile}`, 'info');

    return result;
  }

  protected getUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  // Chinese to Han-Viet conversion (simplified version)
  protected toHanViet(chineseText: string): string {
    // This is a simplified mapping. For production, use a proper dictionary
    const hanVietMap: Record<string, string> = {
      '万古': 'Vạn Cổ',
      '神帝': 'Thần Đế',
      '仙尊': 'Tiên Tôn',
      '修罗': 'Tu La',
      '武神': 'Vũ Thần',
      '天道': 'Thiên Đạo',
      '至尊': 'Chí Tôn',
      '霸体': 'Bá Thể',
      '星空': 'Tinh Không',
      '逆天': 'Nghịch Thiên',
      '绝世': 'Tuyệt Thế',
      '无敌': 'Vô Địch',
      '签到': 'Ký Danh',
      '系统': 'Hệ Thống',
      '开局': 'Khai Cục',
      '都市': 'Đô Thị',
      '异能': 'Dị Năng',
      '重生': 'Trùng Sinh',
      '穿越': 'Xuyên Việt',
      '玄幻': 'Huyền Huyễn',
    };

    let result = chineseText;
    for (const [chinese, hanviet] of Object.entries(hanVietMap)) {
      result = result.replace(new RegExp(chinese, 'g'), hanviet);
    }
    return result;
  }

  // Extract numbers from text (for view counts, etc.)
  protected parseNumberWithUnit(text: string): number | undefined {
    const match = text.match(/([\d.]+)([万亿千百]?)/);
    if (!match) return undefined;

    const num = parseFloat(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      '亿': 100000000,
      '万': 10000,
      '千': 1000,
      '百': 100,
    };

    return num * (multipliers[unit] || 1);
  }
}
