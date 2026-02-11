import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseFromAuthHeader } from '@/integrations/supabase/auth-helpers';

// POST: Parse uploaded file and extract text
export async function POST(request: NextRequest) {
  try {
    const { client, token } = createSupabaseFromAuthHeader(request);
    if (!client || !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formData = await request.formData() as any;
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let extractedText = '';
    let detectedTitle = file.name.replace(/\.[^/.]+$/, ''); // Remove extension

    // Handle different file types
    if (fileName.endsWith('.txt')) {
      extractedText = fileBuffer.toString('utf-8');
    } else if (fileName.endsWith('.pdf')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(fileBuffer);
        extractedText = pdfData.text;
        // Try to get title from PDF metadata
        if (pdfData.info?.Title) {
          detectedTitle = pdfData.info.Title;
        }
      } catch (err) {
        console.error('PDF parse error:', err);
        return NextResponse.json(
          {
            error: 'Không thể đọc file PDF. Vui lòng thử file khác.',
          },
          { status: 400 }
        );
      }
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      try {
        const mammoth = (await import('mammoth')) as typeof import('mammoth');
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = result.value;
      } catch (err) {
        console.error('DOCX parse error:', err);
        return NextResponse.json(
          {
            error: 'Không thể đọc file Word. Vui lòng thử file .docx thay vì .doc',
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error: 'Định dạng file không được hỗ trợ. Vui lòng sử dụng TXT, PDF hoặc DOCX.',
        },
        { status: 400 }
      );
    }

    // Clean up the text
    extractedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!extractedText || extractedText.length < 100) {
      return NextResponse.json(
        {
          error: 'File không chứa đủ nội dung văn bản (cần ít nhất 100 ký tự).',
        },
        { status: 400 }
      );
    }

    // Estimate chapter count (rough estimate based on common patterns)
    const chapterPatterns = [/chương\s+\d+/gi, /chapter\s+\d+/gi, /hồi\s+\d+/gi, /phần\s+\d+/gi];
    let chapterCount = 1;
    for (const pattern of chapterPatterns) {
      const matches = extractedText.match(pattern);
      if (matches && matches.length > chapterCount) {
        chapterCount = matches.length;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        title: detectedTitle,
        content: extractedText,
        characterCount: extractedText.length,
        estimatedChapters: chapterCount,
        fileType: fileName.split('.').pop()?.toUpperCase(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse file';
    console.error('[PARSE FILE API] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Set max file size to 10MB
export const config = {
  api: {
    bodyParser: false,
  },
};