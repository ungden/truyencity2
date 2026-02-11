/**
 * QiDian Scraper - Scrapes top novels from qidian.com
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper } from './base-scraper';
import type { ScrapedNovel, ScraperResult, GENRE_MAPPING } from '../types';
import { GENRE_MAPPING as genreMap } from '../types';

export class QiDianScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.qidian.com';
  
  // QiDian genre IDs
  private readonly genreUrls: Record<string, string> = {
    'tien-hiep': '/rank/yuepiao?chn=21', // 仙侠
    'huyen-huyen': '/rank/yuepiao?chn=1', // 玄幻
    'system-litrpg': '/rank/yuepiao?chn=12', // 游戏
    'urban-modern': '/rank/yuepiao?chn=4', // 都市
    'historical': '/rank/yuepiao?chn=5', // 历史
    'sci-fi-apocalypse': '/rank/yuepiao?chn=9', // 科幻
    'horror-mystery': '/rank/yuepiao?chn=15', // 悬疑灵异
  };

  async scrape(): Promise<ScraperResult> {
    this.log('Starting QiDian scraper...');

    for (const [ourGenre, urlPath] of Object.entries(this.genreUrls)) {
      try {
        this.log(`Scraping genre: ${ourGenre}`);
        await this.scrapeGenre(ourGenre, urlPath);
        await this.randomDelay(2000, 5000); // Polite delay between genres
      } catch (error) {
        this.log(`Failed to scrape genre ${ourGenre}: ${error}`, 'error');
      }
    }

    this.log(`Scraping completed. Total novels: ${this.novels.length}, Errors: ${this.errors.length}`);
    return this.saveResults();
  }

  private async scrapeGenre(genre: string, urlPath: string): Promise<void> {
    const maxNovels = this.config.maxNovelsPerGenre;
    let scraped = 0;

    // QiDian shows ~100 novels per page in ranking
    for (let page = 1; page <= Math.ceil(maxNovels / 30) && scraped < maxNovels; page++) {
      try {
        const url = `${this.baseUrl}${urlPath}&page=${page}`;
        this.log(`Fetching page ${page}: ${url}`);

        const response = await axios.get(url, {
          headers: {
            'User-Agent': this.getUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          },
          timeout: this.config.timeout,
        });

        const $ = cheerio.load(response.data);
        
        // QiDian ranking list structure
        const novelItems = $('.rank-list .book-img-text li');
        
        if (novelItems.length === 0) {
          this.log(`No novels found on page ${page}`, 'warn');
          break;
        }

        for (let i = 0; i < novelItems.length && scraped < maxNovels; i++) {
          const item = novelItems.eq(i);
          
          try {
            const novel = await this.parseNovelItem($, item, genre, scraped + 1);
            if (novel) {
              this.novels.push(novel);
              scraped++;
              this.log(`Scraped: ${novel.title_chinese} (${scraped}/${maxNovels})`);
            }
          } catch (error) {
            const title = item.find('.book-mid-info h4 a').text().trim();
            this.recordError(title || 'unknown', String(error));
          }

          // Small delay between novels
          if (i < novelItems.length - 1) {
            await this.delay(500);
          }
        }

        await this.randomDelay(2000, 4000);
      } catch (error) {
        this.log(`Error scraping page ${page}: ${error}`, 'error');
        break;
      }
    }
  }

  private async parseNovelItem(
    $: ReturnType<typeof cheerio.load>,
    item: cheerio.Cheerio,
    genre: string,
    rank: number
  ): Promise<ScrapedNovel | null> {
    try {
      const titleEl = item.find('.book-mid-info h4 a');
      const title = titleEl.text().trim();
      const novelUrl = titleEl.attr('href');
      
      if (!title || !novelUrl) {
        return null;
      }

      const fullUrl = novelUrl.startsWith('http') ? novelUrl : `${this.baseUrl}${novelUrl}`;
      const author = item.find('.book-mid-info .author .name').text().trim();
      const introText = item.find('.book-mid-info .intro').text().trim();
      
      // Get tags
      const tags: string[] = [];
      item.find('.book-mid-info .tag a').each((_: number, el: cheerio.Element) => {
        const tag = $(el).text().trim();
        if (tag) tags.push(tag);
      });

      // Get stats
      const statsText = item.find('.book-right-info .total').text();
      const views = this.parseNumberWithUnit(statsText);

      // Fetch detailed info
      const detailedInfo = await this.fetchNovelDetails(fullUrl);

      const novel: ScrapedNovel = {
        platform: 'qidian',
        title_chinese: title,
        title_hanviet: this.toHanViet(title),
        url: fullUrl,
        author: author || 'Unknown',
        genre,
        tags,
        synopsis: detailedInfo?.synopsis || introText || '',
        stats: {
          views,
          rating: detailedInfo?.rating,
          chapters: detailedInfo?.chapters,
          status: detailedInfo?.status || 'ongoing',
          rank,
        },
        scraped_at: new Date().toISOString(),
      };

      return novel;
    } catch (error) {
      throw new Error(`Failed to parse novel item: ${error}`);
    }
  }

  private async fetchNovelDetails(url: string): Promise<{
    synopsis: string;
    rating?: number;
    chapters?: number;
    status: 'ongoing' | 'completed' | 'hiatus';
  } | null> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getUserAgent(),
        },
        timeout: this.config.timeout,
      });

      const $ = cheerio.load(response.data);
      
      const synopsis = $('.book-intro p').text().trim();
      const ratingText = $('.rating-score').text().trim();
      const rating = ratingText ? parseFloat(ratingText) : undefined;
      
      const chaptersText = $('.book-info em').first().text().trim();
      const chapters = chaptersText ? parseInt(chaptersText.replace(/[^\d]/g, '')) : undefined;
      
      // Detect status from page
      let status: 'ongoing' | 'completed' | 'hiatus' = 'ongoing';
      const statusText = $('.book-info .tag').text().toLowerCase();
      if (statusText.includes('完本') || statusText.includes('完结')) {
        status = 'completed';
      } else if (statusText.includes('断更') || statusText.includes('停更')) {
        status = 'hiatus';
      }

      return { synopsis, rating, chapters, status };
    } catch (error) {
      this.log(`Failed to fetch details for ${url}: ${error}`, 'warn');
      return null;
    }
  }
}
