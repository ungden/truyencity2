/**
 * Bounded, forward-only craft steering derived from already-paid Editor and
 * window-review verdicts. The prose and model-written instructions are never
 * forwarded: only allow-listed categories, source chapter numbers and
 * code-owned rules reach the next Planner/Writer call.
 */
export interface CraftGuidance {
  category: string;
  severity: 'major' | 'moderate';
  sourceChapters: number[];
  rule: string;
}

interface CraftRunLike {
  kind?: unknown;
  chapter_number?: unknown;
  editor_assessment?: unknown;
  output_artifact?: unknown;
}

const RULES: Record<string, string> = {
  narrative_repetition: 'Không dựng lại cùng bộ ba event + method + result của các chương nguồn, kể cả khi đổi giá, quy mô, địa điểm hoặc tên hợp đồng. Nếu cùng đối tác/cùng loại cảnh quay lại, phải có lựa chọn, phản lực và loại kết quả mới.',
  expository_prose: 'Không giải thích lại cơ chế hoặc quy trình độc giả đã thấy. Đưa kỹ thuật vào hành động có áp lực, chi phí hoặc hậu quả trực tiếp.',
  tool_character: 'Nhân vật phụ phải có agenda, lựa chọn và hệ quả riêng; không chỉ xuất hiện để hỏi cho main giải thích hoặc xác nhận main đúng.',
  unnatural_dialogue: 'Đối thoại phải phục vụ mục tiêu đang xung đột trong cảnh; cắt câu nói chỉ để tóm tắt canon, quy trình hoặc bài học.',
  unearned_outcome: 'Không trao phần thưởng, vị thế hay kết luận lớn trước khi hành động và chi phí trên trang tạo ra nó.',
  stock_reaction: 'Không lặp phản ứng cơ thể/cảm xúc đóng hộp; đổi thành quyết định hoặc hành động làm thay đổi thế cục.',
  ineffective_scene: 'Cắt hoặc gộp cảnh không tạo lựa chọn, phản lực, thông tin làm đổi hành động hay trạng thái mới.',
  repetition: 'Đổi cấu trúc chính của cửa sổ; không diễn lại cùng chuỗi giao dịch, đối đầu hoặc biểu diễn năng lực.',
  opposition_agency: 'Đối lực phải ra quyết định và gây hậu quả mới; không chỉ tới nhìn, tức giận, đe dọa rồi rút.',
  reward_loop: 'Không diễn lại nguyên vòng kiếm hàng - bán - nhận tiền - thanh toán. Tóm lược phần lặp và dành cảnh cho biến số mới.',
  progression: 'Tiến bộ phải đổi quyền lựa chọn, quan hệ, rủi ro hoặc năng lực; tăng con số hay đổi danh từ không đủ.',
  earned_progression: 'Không tuyên bố thắng lợi hoặc nâng bậc trước khi có chuẩn bị, phản lực và chi phí tương xứng trên trang.',
  voice_drift: 'Giữ voice, agenda và nhịp câu riêng của từng người; không để mọi nhân vật nói như người thuyết minh.',
  prose_pattern: 'Tránh lặp cụm diễn đạt, phản ứng hoặc nhịp câu đã thành khuôn trong các chương nguồn.',
  premature_certainty: 'Giữ kết luận ở mức thử nghiệm cho tới khi có quan sát lặp lại hoặc bằng chứng độc lập.',
};

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function chapterNumbers(value: unknown, fallback?: number): number[] {
  const item = object(value);
  const evidence = Array.isArray(item?.evidence) ? item.evidence : [];
  const numbers = evidence.flatMap(entry => {
    const chapterNumber = object(entry)?.chapterNumber;
    return typeof chapterNumber === 'number' && Number.isInteger(chapterNumber)
      ? [chapterNumber]
      : [];
  });
  if (typeof fallback === 'number' && Number.isInteger(fallback)) numbers.push(fallback);
  return [...new Set(numbers)].sort((a, b) => a - b);
}

function categoryOf(value: unknown): string | null {
  const category = object(value)?.category;
  return typeof category === 'string' && RULES[category] ? category : null;
}

function severityOf(value: unknown): CraftGuidance['severity'] {
  return object(value)?.severity === 'major' ? 'major' : 'moderate';
}

/**
 * Extract at most four live signals from the last six committed chapters.
 * Repeated categories are grouped so prompts remain stable and cheap.
 */
export function extractCraftGuidance(
  runs: CraftRunLike[],
  currentChapter: number,
  recentChapterWindow = 6,
): CraftGuidance[] {
  const minimumChapter = Math.max(1, currentChapter - recentChapterWindow + 1);
  const collected: Array<CraftGuidance & { latestChapter: number }> = [];

  for (const run of runs) {
    const fallback = typeof run.chapter_number === 'number' ? run.chapter_number : undefined;
    if (run.kind === 'chapter') {
      const assessment = object(run.editor_assessment);
      const advisories = Array.isArray(assessment?.readingAdvisories)
        ? assessment.readingAdvisories
        : [];
      for (const advisory of advisories) {
        const category = categoryOf(advisory);
        if (!category || fallback === undefined || fallback < minimumChapter || fallback > currentChapter) continue;
        collected.push({
          category,
          severity: severityOf(advisory),
          sourceChapters: [fallback],
          latestChapter: fallback,
          rule: RULES[category],
        });
      }
    }

    if (run.kind === 'window_review') {
      const review = object(run.output_artifact);
      const advisories = Array.isArray(review?.advisories) ? review.advisories : [];
      for (const advisory of advisories) {
        const category = categoryOf(advisory);
        if (!category) continue;
        const sources = chapterNumbers(advisory, fallback)
          .filter(chapter => chapter >= minimumChapter && chapter <= currentChapter);
        if (!sources.length) continue;
        collected.push({
          category,
          severity: severityOf(advisory),
          sourceChapters: sources,
          latestChapter: Math.max(...sources),
          rule: RULES[category],
        });
      }
    }
  }

  const grouped = new Map<string, CraftGuidance & { latestChapter: number }>();
  for (const item of collected) {
    const existing = grouped.get(item.category);
    if (!existing) {
      grouped.set(item.category, item);
      continue;
    }
    grouped.set(item.category, {
      ...existing,
      severity: existing.severity === 'major' || item.severity === 'major' ? 'major' : 'moderate',
      sourceChapters: [...new Set([...existing.sourceChapters, ...item.sourceChapters])]
        .sort((a, b) => a - b)
        .slice(-4),
      latestChapter: Math.max(existing.latestChapter, item.latestChapter),
    });
  }

  return [...grouped.values()]
    .sort((a, b) => b.latestChapter - a.latestChapter || a.category.localeCompare(b.category))
    .slice(0, 4)
    .map(({ latestChapter: _latestChapter, ...guidance }) => guidance);
}
