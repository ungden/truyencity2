/**
 * Item & Treasure Tracker - Track items, ensure name uniqueness, prevent duplicates
 *
 * Solves:
 * 1. Treasure/item names too similar
 * 2. Items forgotten after acquisition
 * 3. Economy inconsistency (price tracking)
 * 4. Item power scaling
 */

import { randomUUID } from 'crypto';
import { getSupabase } from './supabase-helper';
import { logger } from '@/lib/security/logger';

// ============================================================================
// TYPES
// ============================================================================

export type ItemGrade = 
  | 'phàm phẩm' | 'hạ phẩm' | 'trung phẩm' | 'thượng phẩm' 
  | 'cực phẩm' | 'linh khí' | 'bảo khí' | 'thần khí' | 'tiên khí';

export type ItemCategory = 
  | 'weapon' | 'armor' | 'accessory' | 'consumable' 
  | 'material' | 'technique' | 'artifact' | 'currency';

export interface TrackedItem {
  id: string;
  projectId: string;
  name: string;
  alternateName?: string; // Nickname or title
  category: ItemCategory;
  grade: ItemGrade;
  description: string;
  effects: string[];
  restrictions?: string; // Requirements to use
  
  // Tracking
  firstMentionChapter: number;
  lastMentionChapter: number;
  mentionCount: number;
  ownerHistory: Array<{ owner: string; fromChapter: number; toChapter?: number }>;
  currentOwner?: string;
  
  // Economy
  estimatedValue?: number;
  currency?: string;
  priceHistory?: Array<{ chapter: number; price: number; context: string }>;
  
  // Status
  status: 'active' | 'consumed' | 'destroyed' | 'lost' | 'given_away';
  statusChangeChapter?: number;
}

export interface ItemNameValidation {
  isUnique: boolean;
  similarItems: Array<{ name: string; similarity: number }>;
  suggestions: string[];
}

export interface ItemUsageReminder {
  item: TrackedItem;
  lastUsed: number;
  chaptersSinceUse: number;
  suggestion: string;
}

export interface EconomyValidation {
  isConsistent: boolean;
  issues: Array<{ description: string; severity: 'minor' | 'moderate' | 'major' }>;
}

// ============================================================================
// ITEM GRADE VALUES (for power scaling)
// ============================================================================

const GRADE_VALUES: Record<ItemGrade, number> = {
  'phàm phẩm': 1,
  'hạ phẩm': 2,
  'trung phẩm': 3,
  'thượng phẩm': 4,
  'cực phẩm': 5,
  'linh khí': 6,
  'bảo khí': 7,
  'thần khí': 8,
  'tiên khí': 9,
};

// Expected grade by chapter range (for 2000 chapter story)
const EXPECTED_GRADE_BY_CHAPTER: Array<{ maxChapter: number; maxGrade: ItemGrade }> = [
  { maxChapter: 100, maxGrade: 'hạ phẩm' },
  { maxChapter: 300, maxGrade: 'trung phẩm' },
  { maxChapter: 500, maxGrade: 'thượng phẩm' },
  { maxChapter: 800, maxGrade: 'cực phẩm' },
  { maxChapter: 1200, maxGrade: 'linh khí' },
  { maxChapter: 1600, maxGrade: 'bảo khí' },
  { maxChapter: 1900, maxGrade: 'thần khí' },
  { maxChapter: 2000, maxGrade: 'tiên khí' },
];

// ============================================================================
// ITEM TRACKER CLASS
// ============================================================================

export class ItemTracker {
  private projectId: string;
  private items: Map<string, TrackedItem> = new Map();
  private nameIndex: Map<string, string> = new Map(); // lowercase name -> item id
  
  constructor(projectId: string) {
    this.projectId = projectId;
  }
  
  private get supabase() {
    return getSupabase();
  }
  
  /**
   * Initialize from database
   */
  async initialize(): Promise<void> {
    const { data: items, error: itemsError } = await this.supabase
      .from('tracked_items')
      .select('*')
      .eq('project_id', this.projectId);
    
    if (itemsError) {
      logger.debug('ItemTracker tracked_items load failed (non-fatal)', {
        projectId: this.projectId,
        error: itemsError.message,
      });
    }
    if (items) {
      for (const item of items) {
        const tracked: TrackedItem = {
          id: item.id,
          projectId: item.project_id,
          name: item.name,
          alternateName: item.alternate_name,
          category: item.category,
          grade: item.grade,
          description: item.description,
          effects: item.effects || [],
          restrictions: item.restrictions,
          firstMentionChapter: item.first_mention_chapter,
          lastMentionChapter: item.last_mention_chapter,
          mentionCount: item.mention_count,
          ownerHistory: item.owner_history || [],
          currentOwner: item.current_owner,
          estimatedValue: item.estimated_value,
          currency: item.currency,
          priceHistory: item.price_history,
          status: item.status,
          statusChangeChapter: item.status_change_chapter,
        };
        
        this.items.set(item.id, tracked);
        this.nameIndex.set(item.name.toLowerCase(), item.id);
        if (item.alternate_name) {
          this.nameIndex.set(item.alternate_name.toLowerCase(), item.id);
        }
      }
    }
  }
  
  /**
   * Validate item name uniqueness
   */
  validateItemName(name: string): ItemNameValidation {
    const lowerName = name.toLowerCase();
    const similarItems: Array<{ name: string; similarity: number }> = [];
    const suggestions: string[] = [];
    
    // Exact match check
    if (this.nameIndex.has(lowerName)) {
      return {
        isUnique: false,
        similarItems: [{ name: this.items.get(this.nameIndex.get(lowerName)!)!.name, similarity: 100 }],
        suggestions: ['Item này đã tồn tại. Sử dụng tên khác hoặc reference item đã có.'],
      };
    }
    
    // Similarity check
    for (const [existingName, itemId] of this.nameIndex) {
      const similarity = this.calculateSimilarity(lowerName, existingName);
      if (similarity > 60) {
        const item = this.items.get(itemId)!;
        similarItems.push({ name: item.name, similarity });
      }
    }
    
    // Sort by similarity
    similarItems.sort((a, b) => b.similarity - a.similarity);
    
    if (similarItems.length > 0) {
      suggestions.push(`Tên "${name}" tương tự với: ${similarItems.map(i => i.name).join(', ')}`);
      suggestions.push('Cân nhắc đổi tên để tránh nhầm lẫn cho độc giả');
    }
    
    return {
      isUnique: similarItems.length === 0 || similarItems[0].similarity < 80,
      similarItems: similarItems.slice(0, 5),
      suggestions,
    };
  }
  
  /**
   * Calculate string similarity (Levenshtein-based)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 100 : 0;
    if (len2 === 0) return 0;
    
    // Quick check for contained strings
    if (str1.includes(str2) || str2.includes(str1)) {
      return 80 + Math.min(len1, len2) / Math.max(len1, len2) * 20;
    }
    
    // Levenshtein distance
    const matrix: number[][] = [];
    
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return Math.round((1 - distance / maxLen) * 100);
  }
  
  /**
   * Register a new item
   */
  async registerItem(
    name: string,
    category: ItemCategory,
    grade: ItemGrade,
    description: string,
    chapterNumber: number,
    owner?: string,
    options?: {
      alternateName?: string;
      effects?: string[];
      restrictions?: string;
      estimatedValue?: number;
      currency?: string;
    }
  ): Promise<{ success: boolean; item?: TrackedItem; warning?: string }> {
    // Validate name
    const validation = this.validateItemName(name);
    let warning: string | undefined;
    
    if (!validation.isUnique && validation.similarItems[0]?.similarity === 100) {
      return {
        success: false,
        warning: `Item "${name}" đã tồn tại`,
      };
    }
    
    if (validation.similarItems.length > 0) {
      warning = `Cảnh báo: Tên tương tự với ${validation.similarItems[0].name}`;
    }
    
    // Validate grade for chapter
    const gradeValidation = this.validateGradeForChapter(grade, chapterNumber);
    if (!gradeValidation.valid) {
      warning = (warning ? warning + '. ' : '') + gradeValidation.warning;
    }
    
    // Create item
    const id = randomUUID();
    const item: TrackedItem = {
      id,
      projectId: this.projectId,
      name,
      alternateName: options?.alternateName,
      category,
      grade,
      description,
      effects: options?.effects || [],
      restrictions: options?.restrictions,
      firstMentionChapter: chapterNumber,
      lastMentionChapter: chapterNumber,
      mentionCount: 1,
      ownerHistory: owner ? [{ owner, fromChapter: chapterNumber }] : [],
      currentOwner: owner,
      estimatedValue: options?.estimatedValue,
      currency: options?.currency,
      status: 'active',
    };
    
    // Save
    this.items.set(id, item);
    this.nameIndex.set(name.toLowerCase(), id);
    if (options?.alternateName) {
      this.nameIndex.set(options.alternateName.toLowerCase(), id);
    }
    
    await this.saveItem(item);
    
    return { success: true, item, warning };
  }
  
  /**
   * Record item mention
   */
  async recordMention(name: string, chapterNumber: number): Promise<void> {
    const itemId = this.nameIndex.get(name.toLowerCase());
    if (!itemId) return;
    
    const item = this.items.get(itemId);
    if (!item) return; // Guard against stale nameIndex
    
    item.lastMentionChapter = chapterNumber;
    item.mentionCount++;
    
    const { error } = await this.supabase
      .from('tracked_items')
      .update({
        last_mention_chapter: chapterNumber,
        mention_count: item.mentionCount,
      })
      .eq('id', itemId);
    if (error) {
      logger.debug('tracked_items update failed (non-fatal)', {
        projectId: this.projectId,
        itemName: name,
        chapterNumber,
        operation: 'recordMention',
        error: error.message,
      });
    }
  }
  
  /**
   * Transfer item ownership
   */
  async transferOwnership(
    name: string,
    newOwner: string,
    chapterNumber: number
  ): Promise<{ success: boolean }> {
    const itemId = this.nameIndex.get(name.toLowerCase());
    if (!itemId) return { success: false };
    
    const item = this.items.get(itemId)!;
    
    // Close previous ownership
    if (item.ownerHistory.length > 0) {
      const lastOwnership = item.ownerHistory[item.ownerHistory.length - 1];
      if (!lastOwnership.toChapter) {
        lastOwnership.toChapter = chapterNumber;
      }
    }
    
    // Add new ownership
    item.ownerHistory.push({ owner: newOwner, fromChapter: chapterNumber });
    item.currentOwner = newOwner;
    item.lastMentionChapter = chapterNumber;
    item.mentionCount++;
    
    await this.saveItem(item);
    return { success: true };
  }
  
  /**
   * Mark item as consumed/destroyed/lost
   */
  async updateItemStatus(
    name: string,
    status: 'consumed' | 'destroyed' | 'lost' | 'given_away',
    chapterNumber: number
  ): Promise<{ success: boolean }> {
    const itemId = this.nameIndex.get(name.toLowerCase());
    if (!itemId) return { success: false };
    
    const item = this.items.get(itemId)!;
    item.status = status;
    item.statusChangeChapter = chapterNumber;
    item.lastMentionChapter = chapterNumber;
    
    await this.saveItem(item);
    return { success: true };
  }
  
  /**
   * Get reminders for unused items
   */
  getUnusedItemReminders(currentChapter: number, thresholdChapters: number = 50): ItemUsageReminder[] {
    const reminders: ItemUsageReminder[] = [];
    
    for (const item of this.items.values()) {
      if (item.status !== 'active') continue;
      
      const chaptersSinceUse = currentChapter - item.lastMentionChapter;
      
      if (chaptersSinceUse >= thresholdChapters) {
        reminders.push({
          item,
          lastUsed: item.lastMentionChapter,
          chaptersSinceUse,
          suggestion: this.generateUsageSuggestion(item),
        });
      }
    }
    
    // Sort by longest unused
    reminders.sort((a, b) => b.chaptersSinceUse - a.chaptersSinceUse);
    
    return reminders;
  }
  
  /**
   * Generate suggestion for how to use an item
   */
  private generateUsageSuggestion(item: TrackedItem): string {
    switch (item.category) {
      case 'weapon':
        return `${item.name} có thể dùng trong combat scene sắp tới`;
      case 'armor':
        return `${item.name} nên được đề cập khi MC bị tấn công`;
      case 'consumable':
        return `${item.name} có thể dùng trong tình huống khẩn cấp`;
      case 'technique':
        return `MC có thể luyện tập hoặc sử dụng ${item.name}`;
      case 'artifact':
        return `${item.name} có thể reveal thêm bí mật hoặc công dụng mới`;
      default:
        return `Cần đề cập lại ${item.name} để độc giả không quên`;
    }
  }
  
  /**
   * Validate grade is appropriate for chapter
   */
  validateGradeForChapter(
    grade: ItemGrade,
    chapterNumber: number,
    totalChapters: number = 2000
  ): { valid: boolean; warning?: string } {
    const gradeValue = GRADE_VALUES[grade];
    
    // Scale expected grade ranges
    const scaleFactor = totalChapters / 2000;
    
    for (const range of EXPECTED_GRADE_BY_CHAPTER) {
      const scaledMaxChapter = Math.round(range.maxChapter * scaleFactor);
      
      if (chapterNumber <= scaledMaxChapter) {
        const maxGradeValue = GRADE_VALUES[range.maxGrade];
        
        if (gradeValue > maxGradeValue + 1) {
          return {
            valid: false,
            warning: `Grade "${grade}" quá cao cho chương ${chapterNumber}. Nên dùng tối đa "${range.maxGrade}"`,
          };
        }
        return { valid: true };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Validate economy consistency
   */
  validateEconomy(): EconomyValidation {
    const issues: Array<{ description: string; severity: 'minor' | 'moderate' | 'major' }> = [];
    
    // Group items by grade and check price consistency
    const gradeGroups = new Map<ItemGrade, TrackedItem[]>();
    
    for (const item of this.items.values()) {
      if (!item.estimatedValue) continue;
      
      if (!gradeGroups.has(item.grade)) {
        gradeGroups.set(item.grade, []);
      }
      gradeGroups.get(item.grade)!.push(item);
    }
    
    // Check if higher grades have higher prices
    const grades = Object.keys(GRADE_VALUES) as ItemGrade[];
    for (let i = 0; i < grades.length - 1; i++) {
      const lowerGrade = grades[i];
      const higherGrade = grades[i + 1];
      
      const lowerItems = gradeGroups.get(lowerGrade) || [];
      const higherItems = gradeGroups.get(higherGrade) || [];
      
      if (lowerItems.length > 0 && higherItems.length > 0) {
        const avgLower = lowerItems.reduce((sum, item) => sum + (item.estimatedValue || 0), 0) / lowerItems.length;
        const avgHigher = higherItems.reduce((sum, item) => sum + (item.estimatedValue || 0), 0) / higherItems.length;
        
        if (avgLower >= avgHigher) {
          issues.push({
            description: `${lowerGrade} items có giá trung bình cao hơn ${higherGrade}`,
            severity: 'moderate',
          });
        }
      }
    }
    
    // Check for price inconsistencies within same grade
    for (const [grade, items] of gradeGroups) {
      if (items.length < 2) continue;
      
      const prices = items.filter(i => i.estimatedValue).map(i => i.estimatedValue!);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const maxDeviation = Math.max(...prices.map(p => Math.abs(p - avgPrice) / avgPrice));
      
      if (maxDeviation > 0.5) {
        issues.push({
          description: `Giá của ${grade} items không đồng đều (deviation ${Math.round(maxDeviation * 100)}%)`,
          severity: 'minor',
        });
      }
    }
    
    return {
      isConsistent: issues.filter(i => i.severity !== 'minor').length === 0,
      issues,
    };
  }
  
  /**
   * Get all items for an owner
   */
  getItemsByOwner(owner: string): TrackedItem[] {
    return Array.from(this.items.values()).filter(
      item => item.currentOwner?.toLowerCase() === owner.toLowerCase() && item.status === 'active'
    );
  }
  
  /**
   * Get item by name
   */
  getItem(name: string): TrackedItem | undefined {
    const itemId = this.nameIndex.get(name.toLowerCase());
    return itemId ? this.items.get(itemId) : undefined;
  }
  
  /**
   * Build context for writing
   */
  buildItemContext(owner: string, currentChapter: number): string {
    const lines = ['## Inventory:'];
    
    const items = this.getItemsByOwner(owner);
    if (items.length === 0) {
      lines.push('- Không có item đáng chú ý');
      return lines.join('\n');
    }
    
    // Group by category
    const byCategory = new Map<ItemCategory, TrackedItem[]>();
    for (const item of items) {
      if (!byCategory.has(item.category)) {
        byCategory.set(item.category, []);
      }
      byCategory.get(item.category)!.push(item);
    }
    
    for (const [category, categoryItems] of byCategory) {
      lines.push(`\n### ${category}:`);
      for (const item of categoryItems) {
        const unused = currentChapter - item.lastMentionChapter > 30 ? ' [CHƯA DÙNG LÂU]' : '';
        lines.push(`- ${item.name} (${item.grade})${unused}`);
      }
    }
    
    // Add reminders
    const reminders = this.getUnusedItemReminders(currentChapter, 30);
    if (reminders.length > 0) {
      lines.push('\n### Items cần sử dụng:');
      for (const reminder of reminders.slice(0, 3)) {
        lines.push(`- ${reminder.item.name}: ${reminder.suggestion}`);
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Save item to database
   */
  private async saveItem(item: TrackedItem): Promise<void> {
    const { error } = await this.supabase
      .from('tracked_items')
      .upsert({
        id: item.id,
        project_id: item.projectId,
        name: item.name,
        alternate_name: item.alternateName,
        category: item.category,
        grade: item.grade,
        description: item.description,
        effects: item.effects,
        restrictions: item.restrictions,
        first_mention_chapter: item.firstMentionChapter,
        last_mention_chapter: item.lastMentionChapter,
        mention_count: item.mentionCount,
        owner_history: item.ownerHistory,
        current_owner: item.currentOwner,
        estimated_value: item.estimatedValue,
        currency: item.currency,
        price_history: item.priceHistory,
        status: item.status,
        status_change_chapter: item.statusChangeChapter,
      }, { onConflict: 'id' });
    if (error) {
      logger.debug('tracked_items upsert failed (non-fatal)', {
        projectId: this.projectId,
        itemName: item.name,
        operation: 'saveItem',
        error: error.message,
      });
    }
  }
}

export function createItemTracker(projectId: string): ItemTracker {
  return new ItemTracker(projectId);
}

// ============================================================================
// ENHANCED: Item Detection in Content
// ============================================================================

/**
 * Common item-related keywords for detection
 */
const ITEM_KEYWORDS = {
  weapon: ['kiếm', 'đao', 'thương', 'cung', 'mâu', 'kích', 'chùy', 'côn', 'roi', 'tiêu'],
  armor: ['giáp', 'bào', 'khôi', 'thuẫn', 'khiên', 'áo'],
  accessory: ['nhẫn', 'vòng', 'trâm', 'ngọc bội', 'đai', 'túi'],
  consumable: ['đan', 'dược', 'thuốc', 'linh dược', 'tiên đan', 'huyết'],
  material: ['linh thạch', 'tinh hoa', 'tinh nguyên', 'linh mạch', 'nguyên liệu'],
  technique: ['công pháp', 'bí kíp', 'tâm pháp', 'quyết', 'thuật', 'đạo'],
  artifact: ['bảo vật', 'linh bảo', 'thần khí', 'pháp bảo', 'trấn phái', 'truyền thừa'],
  currency: ['linh thạch', 'tiên tệ', 'kim tệ', 'ngân lượng', 'nguyên thạch'],
};

const GRADE_KEYWORDS: Record<ItemGrade, string[]> = {
  'phàm phẩm': ['phàm phẩm', 'phàm cấp', 'thường'],
  'hạ phẩm': ['hạ phẩm', 'hạ cấp', 'tầm thường'],
  'trung phẩm': ['trung phẩm', 'trung cấp', 'khá'],
  'thượng phẩm': ['thượng phẩm', 'thượng cấp', 'cao cấp'],
  'cực phẩm': ['cực phẩm', 'đỉnh cấp', 'hoàn mỹ'],
  'linh khí': ['linh khí', 'linh cấp'],
  'bảo khí': ['bảo khí', 'bảo cấp'],
  'thần khí': ['thần khí', 'thần cấp', 'thần binh'],
  'tiên khí': ['tiên khí', 'tiên cấp', 'tiên binh'],
};

export interface DetectedItem {
  name: string;
  category: ItemCategory | 'unknown';
  grade: ItemGrade | 'unknown';
  context: string;
  position: number;
  isNew: boolean;
}

/**
 * Detect items mentioned in content
 */
export function detectItemsInContent(
  content: string,
  existingItems: Map<string, TrackedItem>
): DetectedItem[] {
  const detected: DetectedItem[] = [];
  const lowerContent = content.toLowerCase();

  // Pattern for item detection: [grade?] + [category-keyword] + [name pattern]
  // e.g., "thượng phẩm linh kiếm Thanh Phong"
  
  for (const [category, keywords] of Object.entries(ITEM_KEYWORDS)) {
    for (const keyword of keywords) {
      // Find all occurrences of keyword
      let index = lowerContent.indexOf(keyword);
      while (index !== -1) {
        const contextStart = Math.max(0, index - 30);
        const contextEnd = Math.min(content.length, index + keyword.length + 50);
        const context = content.substring(contextStart, contextEnd);

        // Try to extract item name (look for capitalized words or quoted text nearby)
        const nameMatch = context.match(/["「『]([^"」』]+)["」』]|([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]*)*)/);

        if (nameMatch) {
          const name = nameMatch[1] || nameMatch[2];
          if (name && name.length > 1 && name.length < 30) {
            // Check if this is a new item
            const isNew = !existingItems.has(name.toLowerCase());

            // Try to detect grade
            let detectedGrade: ItemGrade | 'unknown' = 'unknown';
            for (const [grade, gradeKeywords] of Object.entries(GRADE_KEYWORDS)) {
              if (gradeKeywords.some(gk => context.toLowerCase().includes(gk))) {
                detectedGrade = grade as ItemGrade;
                break;
              }
            }

            detected.push({
              name: name.trim(),
              category: category as ItemCategory,
              grade: detectedGrade,
              context: context.trim(),
              position: index,
              isNew,
            });
          }
        }

        // Find next occurrence
        index = lowerContent.indexOf(keyword, index + 1);
      }
    }
  }

  // Deduplicate by name
  const uniqueItems = new Map<string, DetectedItem>();
  for (const item of detected) {
    const key = item.name.toLowerCase();
    if (!uniqueItems.has(key)) {
      uniqueItems.set(key, item);
    }
  }

  return Array.from(uniqueItems.values());
}

// ============================================================================
// ENHANCED: Item Name Generator for Uniqueness
// ============================================================================

const NAME_PREFIXES = {
  weapon: ['Thanh', 'Hắc', 'Bạch', 'Huyền', 'Xích', 'Tử', 'Kim', 'Nguyệt', 'Nhật', 'Phong'],
  armor: ['Thiên', 'Địa', 'Long', 'Hổ', 'Quy', 'Phượng', 'Kỳ', 'Lân'],
  accessory: ['Ngọc', 'Trân', 'Bảo', 'Linh', 'Minh', 'Thần', 'Tiên'],
  consumable: ['Cửu', 'Bát', 'Thất', 'Lục', 'Ngũ', 'Tứ', 'Tam', 'Nhị', 'Nhất'],
  material: ['Thiên', 'Địa', 'Hỏa', 'Thủy', 'Mộc', 'Kim', 'Thổ', 'Lôi', 'Phong'],
  technique: ['Vô', 'Đại', 'Chân', 'Cực', 'Tuyệt', 'Thái', 'Huyền', 'Diệu'],
  artifact: ['Hồng', 'Hoàng', 'Cổ', 'Viễn', 'Tiên', 'Thần', 'Ma', 'Thánh'],
};

const NAME_SUFFIXES = {
  weapon: ['Kiếm', 'Đao', 'Thương', 'Kích', 'Côn', 'Cung', 'Mâu', 'Phủ'],
  armor: ['Giáp', 'Bào', 'Khôi', 'Thuẫn', 'Y', 'Áo'],
  accessory: ['Hoàn', 'Bội', 'Trâm', 'Đái', 'Liên', 'Châu'],
  consumable: ['Đan', 'Dược', 'Tán', 'Hoàn', 'Lộ', 'Tịch'],
  material: ['Thạch', 'Tinh', 'Hoa', 'Chi', 'Tủy', 'Hồn'],
  technique: ['Quyết', 'Công', 'Thuật', 'Pháp', 'Kinh', 'Tâm Pháp'],
  artifact: ['Bảo', 'Đài', 'Lâu', 'Đỉnh', 'Lô', 'Ngọc'],
};

/**
 * Generate unique item name suggestions
 */
export function generateItemNameSuggestions(
  category: ItemCategory,
  existingNames: Set<string>,
  count: number = 5
): string[] {
  const suggestions: string[] = [];
  const prefixes = NAME_PREFIXES[category as keyof typeof NAME_PREFIXES] || NAME_PREFIXES.artifact;
  const suffixes = NAME_SUFFIXES[category as keyof typeof NAME_SUFFIXES] || NAME_SUFFIXES.artifact;

  // Middle parts for variety
  const middles = ['Long', 'Phượng', 'Hồng', 'Vũ', 'Thiên', 'Vân', 'Nguyệt', 'Linh', 'Yêu', 'Ma'];

  let attempts = 0;
  while (suggestions.length < count && attempts < 100) {
    // Generate random combination
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const middle = Math.random() > 0.5 ? middles[Math.floor(Math.random() * middles.length)] : '';
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    const name = middle ? `${prefix} ${middle} ${suffix}` : `${prefix} ${suffix}`;

    // Check uniqueness
    if (!existingNames.has(name.toLowerCase()) && !suggestions.includes(name)) {
      suggestions.push(name);
    }

    attempts++;
  }

  return suggestions;
}

// ============================================================================
// ENHANCED: Item Statistics
// ============================================================================

export interface ItemStatistics {
  totalItems: number;
  byCategory: Record<string, number>;
  byGrade: Record<string, number>;
  byStatus: Record<string, number>;
  avgMentionsPerItem: number;
  forgottenItems: number; // Not mentioned in 50+ chapters
  mostMentioned: Array<{ name: string; count: number }>;
  recentAcquisitions: TrackedItem[];
}

/**
 * Get comprehensive item statistics
 */
export function getItemStatistics(
  items: Map<string, TrackedItem>,
  currentChapter: number
): ItemStatistics {
  const allItems = Array.from(items.values());

  // By category
  const byCategory: Record<string, number> = {};
  for (const item of allItems) {
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
  }

  // By grade
  const byGrade: Record<string, number> = {};
  for (const item of allItems) {
    byGrade[item.grade] = (byGrade[item.grade] || 0) + 1;
  }

  // By status
  const byStatus: Record<string, number> = {};
  for (const item of allItems) {
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
  }

  // Average mentions
  const totalMentions = allItems.reduce((sum, item) => sum + item.mentionCount, 0);
  const avgMentionsPerItem = allItems.length > 0 ? totalMentions / allItems.length : 0;

  // Forgotten items
  const forgottenItems = allItems.filter(
    item => item.status === 'active' && currentChapter - item.lastMentionChapter > 50
  ).length;

  // Most mentioned
  const mostMentioned = allItems
    .sort((a, b) => b.mentionCount - a.mentionCount)
    .slice(0, 5)
    .map(item => ({ name: item.name, count: item.mentionCount }));

  // Recent acquisitions
  const recentAcquisitions = allItems
    .filter(item => currentChapter - item.firstMentionChapter < 10)
    .sort((a, b) => b.firstMentionChapter - a.firstMentionChapter)
    .slice(0, 5);

  return {
    totalItems: allItems.length,
    byCategory,
    byGrade,
    byStatus,
    avgMentionsPerItem: Math.round(avgMentionsPerItem * 10) / 10,
    forgottenItems,
    mostMentioned,
    recentAcquisitions,
  };
}
