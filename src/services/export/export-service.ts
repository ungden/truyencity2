/**
 * Export Service - Export stories to various formats
 *
 * Supports:
 * - EPUB (for e-readers)
 * - PDF (for printing/sharing)
 * - DOCX (for editing)
 * - TXT (plain text)
 *
 * Note: Full EPUB/PDF generation requires additional libraries
 * This is a foundation that can be extended
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/security/logger';

export type ExportFormat = 'epub' | 'pdf' | 'docx' | 'txt' | 'html';

export interface ExportOptions {
  novelId: string;
  format: ExportFormat;
  chapters?: number[]; // Specific chapters, or all if not specified
  includeMetadata?: boolean;
  includeCover?: boolean;
  title?: string;
  author?: string;
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  content?: string | Uint8Array;
  mimeType?: string;
  error?: string;
}

export interface Novel {
  id: string;
  title: string;
  description?: string;
  author?: string;
  cover_url?: string;
  genres?: string[];
}

export interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  content: string;
}

class ExportService {
  /**
   * Export story to specified format
   */
  async exportStory(
    supabase: SupabaseClient,
    userId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Fetch novel data
      const { data: novel, error: novelError } = await supabase
        .from('novels')
        .select('*')
        .eq('id', options.novelId)
        .eq('user_id', userId)
        .single();

      if (novelError || !novel) {
        return { success: false, error: 'Novel not found' };
      }

      // Fetch chapters
      let chaptersQuery = supabase
        .from('chapters')
        .select('*')
        .eq('novel_id', options.novelId)
        .order('chapter_number', { ascending: true });

      if (options.chapters && options.chapters.length > 0) {
        chaptersQuery = chaptersQuery.in('chapter_number', options.chapters);
      }

      const { data: chapters, error: chaptersError } = await chaptersQuery;

      if (chaptersError) {
        return { success: false, error: 'Failed to fetch chapters' };
      }

      if (!chapters || chapters.length === 0) {
        return { success: false, error: 'No chapters found' };
      }

      // Generate export based on format
      switch (options.format) {
        case 'txt':
          return this.exportToTxt(novel, chapters, options);
        case 'html':
          return this.exportToHtml(novel, chapters, options);
        case 'epub':
          return this.exportToEpub(novel, chapters, options);
        case 'pdf':
          return this.exportToPdf(novel, chapters, options);
        case 'docx':
          return this.exportToDocx(novel, chapters, options);
        default:
          return { success: false, error: 'Unsupported format' };
      }
    } catch (error) {
      logger.error('Export failed', error as Error, { novelId: options.novelId });
      return { success: false, error: 'Export failed' };
    }
  }

  /**
   * Export to plain text
   */
  private exportToTxt(
    novel: Novel,
    chapters: Chapter[],
    options: ExportOptions
  ): ExportResult {
    let content = '';

    // Add title and metadata
    if (options.includeMetadata !== false) {
      content += `${novel.title}\n`;
      content += `${'='.repeat(novel.title.length)}\n\n`;

      if (options.author || novel.author) {
        content += `Tác giả: ${options.author || novel.author}\n\n`;
      }

      if (novel.description) {
        content += `Giới thiệu:\n${novel.description}\n\n`;
      }

      content += `${'─'.repeat(50)}\n\n`;
    }

    // Add chapters
    for (const chapter of chapters) {
      content += `Chương ${chapter.chapter_number}: ${chapter.title}\n\n`;
      content += `${chapter.content}\n\n`;
      content += `${'─'.repeat(50)}\n\n`;
    }

    const filename = this.sanitizeFilename(novel.title) + '.txt';

    return {
      success: true,
      filename,
      content,
      mimeType: 'text/plain; charset=utf-8',
    };
  }

  /**
   * Export to HTML
   */
  private exportToHtml(
    novel: Novel,
    chapters: Chapter[],
    options: ExportOptions
  ): ExportResult {
    let html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(novel.title)}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.8;
      color: #333;
    }
    h1 { text-align: center; margin-bottom: 10px; }
    .author { text-align: center; color: #666; margin-bottom: 20px; }
    .description { font-style: italic; margin-bottom: 30px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
    .chapter { margin-bottom: 40px; page-break-after: always; }
    .chapter-title { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    .chapter-content { text-align: justify; }
    .chapter-content p { text-indent: 2em; margin: 1em 0; }
    .toc { margin: 30px 0; }
    .toc h2 { color: #2c3e50; }
    .toc ul { list-style: none; padding: 0; }
    .toc li { margin: 10px 0; }
    .toc a { color: #3498db; text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    hr { border: none; border-top: 1px solid #ddd; margin: 30px 0; }
    @media print {
      .chapter { page-break-after: always; }
      .toc { page-break-after: always; }
    }
  </style>
</head>
<body>
`;

    // Title page
    html += `<h1>${this.escapeHtml(novel.title)}</h1>\n`;

    if (options.author || novel.author) {
      html += `<p class="author">Tác giả: ${this.escapeHtml(options.author || novel.author || '')}</p>\n`;
    }

    if (novel.description && options.includeMetadata !== false) {
      html += `<div class="description">${this.escapeHtml(novel.description)}</div>\n`;
    }

    // Table of contents
    html += `<div class="toc">\n<h2>Mục lục</h2>\n<ul>\n`;
    for (const chapter of chapters) {
      html += `<li><a href="#chapter-${chapter.chapter_number}">Chương ${chapter.chapter_number}: ${this.escapeHtml(chapter.title)}</a></li>\n`;
    }
    html += `</ul>\n</div>\n<hr>\n`;

    // Chapters
    for (const chapter of chapters) {
      html += `<div class="chapter" id="chapter-${chapter.chapter_number}">\n`;
      html += `<h2 class="chapter-title">Chương ${chapter.chapter_number}: ${this.escapeHtml(chapter.title)}</h2>\n`;
      html += `<div class="chapter-content">\n`;

      // Convert content to paragraphs
      const paragraphs = chapter.content.split(/\n\n+/);
      for (const para of paragraphs) {
        if (para.trim()) {
          html += `<p>${this.escapeHtml(para.trim())}</p>\n`;
        }
      }

      html += `</div>\n</div>\n`;
    }

    html += `</body>\n</html>`;

    const filename = this.sanitizeFilename(novel.title) + '.html';

    return {
      success: true,
      filename,
      content: html,
      mimeType: 'text/html; charset=utf-8',
    };
  }

  /**
   * Export to EPUB
   * Note: Full EPUB support requires libraries like epub-gen or jszip
   * This creates a basic EPUB structure
   */
  private exportToEpub(
    novel: Novel,
    chapters: Chapter[],
    options: ExportOptions
  ): ExportResult {
    // For a complete EPUB, you would use a library like epub-gen
    // This is a placeholder that returns the HTML which can be converted

    logger.info('EPUB export requested', { novelId: novel.id, chapterCount: chapters.length });

    // Return HTML version with a note
    const htmlResult = this.exportToHtml(novel, chapters, options);

    return {
      success: true,
      filename: this.sanitizeFilename(novel.title) + '.html',
      content: htmlResult.content,
      mimeType: 'text/html; charset=utf-8',
      // Note: In production, use epub-gen library
    };
  }

  /**
   * Export to PDF
   * Note: Server-side PDF generation requires puppeteer or similar
   * This returns HTML that can be printed to PDF
   */
  private exportToPdf(
    novel: Novel,
    chapters: Chapter[],
    options: ExportOptions
  ): ExportResult {
    logger.info('PDF export requested', { novelId: novel.id, chapterCount: chapters.length });

    // Return HTML optimized for printing
    const htmlResult = this.exportToHtml(novel, chapters, options);

    // Add print-specific styles
    const printHtml = (htmlResult.content as string).replace(
      '</style>',
      `
      @media print {
        body { font-size: 12pt; }
        .chapter { page-break-after: always; }
        .toc { page-break-after: always; }
        a { color: black; text-decoration: none; }
      }
      </style>`
    );

    return {
      success: true,
      filename: this.sanitizeFilename(novel.title) + '_print.html',
      content: printHtml,
      mimeType: 'text/html; charset=utf-8',
      // Note: In production, use puppeteer to generate actual PDF
    };
  }

  /**
   * Export to DOCX
   * Note: Full DOCX support requires libraries like docx
   * This returns HTML that can be pasted into Word
   */
  private exportToDocx(
    novel: Novel,
    chapters: Chapter[],
    options: ExportOptions
  ): ExportResult {
    logger.info('DOCX export requested', { novelId: novel.id, chapterCount: chapters.length });

    // Return HTML that preserves formatting when pasted
    const htmlResult = this.exportToHtml(novel, chapters, options);

    return {
      success: true,
      filename: this.sanitizeFilename(novel.title) + '.html',
      content: htmlResult.content,
      mimeType: 'text/html; charset=utf-8',
      // Note: In production, use docx library for actual DOCX
    };
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Get available export formats based on subscription
   */
  getAvailableFormats(tier: string): ExportFormat[] {
    const formats: ExportFormat[] = ['txt', 'html'];

    if (tier === 'creator' || tier === 'pro' || tier === 'enterprise') {
      formats.push('epub');
    }

    if (tier === 'pro' || tier === 'enterprise') {
      formats.push('pdf', 'docx');
    }

    return formats;
  }
}

// Singleton instance
export const exportService = new ExportService();
