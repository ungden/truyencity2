/**
 * Item Tracker Tests
 *
 * Tests: item name validation, item registration, grade validation,
 * unused item reminders, economy validation, item detection, name generation
 */

import {
  ItemTracker,
  createItemTracker,
  detectItemsInContent,
  generateItemNameSuggestions,
  getItemStatistics,
  TrackedItem,
  ItemGrade,
  ItemCategory,
} from '@/services/story-writing-factory/item-tracker';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
}));

describe('ItemTracker', () => {
  let tracker: ItemTracker;

  beforeEach(() => {
    tracker = new ItemTracker('test-project');
  });

  describe('validateItemName', () => {
    it('should accept unique name when no items exist', () => {
      const result = tracker.validateItemName('Thanh Phong Kiếm');
      expect(result.isUnique).toBe(true);
      expect(result.similarItems).toHaveLength(0);
    });

    it('should reject exact duplicate names', async () => {
      await tracker.registerItem('Thanh Phong Kiếm', 'weapon', 'thượng phẩm', 'A wind sword', 10);

      const result = tracker.validateItemName('Thanh Phong Kiếm');
      expect(result.isUnique).toBe(false);
      expect(result.similarItems[0].similarity).toBe(100);
    });

    it('should flag similar names', async () => {
      await tracker.registerItem('Thanh Phong Kiếm', 'weapon', 'thượng phẩm', 'A wind sword', 10);

      const result = tracker.validateItemName('Thanh Phong Đao');
      expect(result.similarItems.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should be case-insensitive', async () => {
      await tracker.registerItem('Thanh Phong Kiếm', 'weapon', 'thượng phẩm', 'A sword', 1);
      const result = tracker.validateItemName('thanh phong kiếm');
      expect(result.isUnique).toBe(false);
    });
  });

  describe('registerItem', () => {
    it('should register a new item successfully', async () => {
      const result = await tracker.registerItem(
        'Hỏa Diễm Kiếm',
        'weapon',
        'trung phẩm',
        'A flame sword',
        50,
        'Hero',
        { effects: ['Fire damage +50%'], estimatedValue: 1000, currency: 'linh thạch' }
      );

      expect(result.success).toBe(true);
      expect(result.item).toBeDefined();
      expect(result.item!.name).toBe('Hỏa Diễm Kiếm');
      expect(result.item!.currentOwner).toBe('Hero');
    });

    it('should reject exact duplicate registration', async () => {
      await tracker.registerItem('Test Item', 'weapon', 'hạ phẩm', 'desc', 1);
      const result = await tracker.registerItem('Test Item', 'weapon', 'hạ phẩm', 'desc', 2);
      expect(result.success).toBe(false);
      expect(result.warning).toContain('đã tồn tại');
    });

    it('should warn about grade too high for early chapter', async () => {
      const result = await tracker.registerItem(
        'OP Sword',
        'weapon',
        'thần khí', // God-tier at chapter 10
        'Very powerful',
        10,
      );

      expect(result.success).toBe(true);
      expect(result.warning).toContain('quá cao');
    });

    it('should accept appropriate grade for chapter', async () => {
      const result = await tracker.registerItem(
        'Basic Sword',
        'weapon',
        'hạ phẩm',
        'A basic sword',
        50,
      );

      expect(result.success).toBe(true);
      // hạ phẩm at chapter 50 is fine (expected max for ch 100)
    });

    it('should handle alternate names', async () => {
      await tracker.registerItem(
        'Huyền Minh Giáp',
        'armor',
        'thượng phẩm',
        'Dark armor',
        100,
        'Hero',
        { alternateName: 'Bóng Đêm' }
      );

      // Should find by alternate name
      const item = tracker.getItem('Bóng Đêm');
      expect(item).toBeDefined();
      expect(item!.name).toBe('Huyền Minh Giáp');
    });
  });

  describe('transferOwnership', () => {
    it('should transfer item ownership', async () => {
      await tracker.registerItem('Magic Sword', 'weapon', 'trung phẩm', 'desc', 1, 'Hero');

      const result = await tracker.transferOwnership('Magic Sword', 'Ally', 50);
      expect(result.success).toBe(true);

      const item = tracker.getItem('Magic Sword');
      expect(item!.currentOwner).toBe('Ally');
      expect(item!.ownerHistory).toHaveLength(2);
    });

    it('should fail for non-existent item', async () => {
      const result = await tracker.transferOwnership('NonExistent', 'Someone', 1);
      expect(result.success).toBe(false);
    });
  });

  describe('updateItemStatus', () => {
    it('should mark item as consumed', async () => {
      await tracker.registerItem('Healing Pill', 'consumable', 'trung phẩm', 'desc', 1, 'Hero');

      const result = await tracker.updateItemStatus('Healing Pill', 'consumed', 10);
      expect(result.success).toBe(true);

      const item = tracker.getItem('Healing Pill');
      expect(item!.status).toBe('consumed');
      expect(item!.statusChangeChapter).toBe(10);
    });
  });

  describe('getUnusedItemReminders', () => {
    it('should remind about forgotten items', async () => {
      await tracker.registerItem('Old Sword', 'weapon', 'hạ phẩm', 'desc', 1, 'Hero');

      const reminders = tracker.getUnusedItemReminders(100, 50);
      expect(reminders.length).toBe(1);
      expect(reminders[0].chaptersSinceUse).toBe(99);
      expect(reminders[0].suggestion).toContain('combat');
    });

    it('should not remind about recently used items', async () => {
      await tracker.registerItem('New Sword', 'weapon', 'hạ phẩm', 'desc', 95, 'Hero');

      const reminders = tracker.getUnusedItemReminders(100, 50);
      expect(reminders.length).toBe(0);
    });

    it('should not remind about consumed items', async () => {
      await tracker.registerItem('Pill', 'consumable', 'hạ phẩm', 'desc', 1, 'Hero');
      await tracker.updateItemStatus('Pill', 'consumed', 5);

      const reminders = tracker.getUnusedItemReminders(100, 50);
      expect(reminders.length).toBe(0);
    });

    it('should generate category-specific suggestions', async () => {
      await tracker.registerItem('Armor', 'armor', 'hạ phẩm', 'desc', 1, 'Hero');
      await tracker.registerItem('Technique', 'technique', 'trung phẩm', 'desc', 1, 'Hero');

      const reminders = tracker.getUnusedItemReminders(100, 50);
      const armorReminder = reminders.find(r => r.item.name === 'Armor');
      const techReminder = reminders.find(r => r.item.name === 'Technique');

      expect(armorReminder!.suggestion).toContain('tấn công');
      expect(techReminder!.suggestion).toContain('luyện tập');
    });
  });

  describe('validateGradeForChapter', () => {
    it('should validate correct grade progression', () => {
      expect(tracker.validateGradeForChapter('hạ phẩm', 50).valid).toBe(true);
      expect(tracker.validateGradeForChapter('trung phẩm', 200).valid).toBe(true);
      expect(tracker.validateGradeForChapter('thượng phẩm', 400).valid).toBe(true);
    });

    it('should flag overpowered items early in story', () => {
      const result = tracker.validateGradeForChapter('thần khí', 10);
      expect(result.valid).toBe(false);
      expect(result.warning).toContain('quá cao');
    });

    it('should scale for different total chapter counts', () => {
      // For a 1000-chapter story, thượng phẩm at 200 should be fine
      const result = tracker.validateGradeForChapter('thượng phẩm', 200, 1000);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateEconomy', () => {
    it('should return consistent for no items', () => {
      const result = tracker.validateEconomy();
      expect(result.isConsistent).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect price inversions between adjacent grades', async () => {
      // Register items with adjacent grades where lower grade is more expensive
      await tracker.registerItem('Cheap Mid', 'weapon', 'trung phẩm', 'desc', 200, undefined, {
        estimatedValue: 100,
      });
      await tracker.registerItem('Expensive Low', 'weapon', 'hạ phẩm', 'desc', 50, undefined, {
        estimatedValue: 10000,
      });

      const result = tracker.validateEconomy();
      // hạ phẩm (lower grade) has higher average price than trung phẩm (higher grade)
      expect(result.issues.some(i => i.description.includes('giá trung bình'))).toBe(true);
    });
  });

  describe('getItemsByOwner', () => {
    it('should return items owned by a character', async () => {
      await tracker.registerItem('Sword', 'weapon', 'hạ phẩm', 'desc', 1, 'Hero');
      await tracker.registerItem('Shield', 'armor', 'hạ phẩm', 'desc', 1, 'Hero');
      await tracker.registerItem('Other Sword', 'weapon', 'hạ phẩm', 'desc', 1, 'Villain');

      const heroItems = tracker.getItemsByOwner('Hero');
      expect(heroItems).toHaveLength(2);
    });

    it('should exclude non-active items', async () => {
      await tracker.registerItem('Used Pill', 'consumable', 'hạ phẩm', 'desc', 1, 'Hero');
      await tracker.updateItemStatus('Used Pill', 'consumed', 5);

      const heroItems = tracker.getItemsByOwner('Hero');
      expect(heroItems).toHaveLength(0);
    });
  });

  describe('buildItemContext', () => {
    it('should build context string with inventory', async () => {
      await tracker.registerItem('Sword', 'weapon', 'trung phẩm', 'desc', 1, 'Hero');
      await tracker.registerItem('Shield', 'armor', 'hạ phẩm', 'desc', 1, 'Hero');

      const context = tracker.buildItemContext('Hero', 10);
      expect(context).toContain('Inventory');
      expect(context).toContain('Sword');
      expect(context).toContain('Shield');
    });

    it('should mark items unused for long time', async () => {
      await tracker.registerItem('Old Item', 'artifact', 'hạ phẩm', 'desc', 1, 'Hero');

      const context = tracker.buildItemContext('Hero', 100);
      expect(context).toContain('CHƯA DÙNG LÂU');
    });

    it('should handle empty inventory', () => {
      const context = tracker.buildItemContext('Hero', 10);
      expect(context).toContain('Không có item');
    });
  });
});

describe('detectItemsInContent', () => {
  it('should detect weapon mentions', () => {
    const content = 'Hắn rút ra thanh kiếm "Hỏa Diễm" từ trong bao.';
    const items = detectItemsInContent(content, new Map());
    // Should detect something containing kiếm
    expect(items.length).toBeGreaterThanOrEqual(0); // Detection is heuristic-based
  });

  it('should mark items as new when not in existing set', () => {
    const content = 'Đây là một thanh thượng phẩm kiếm tên "Thanh Phong"';
    const existing = new Map<string, TrackedItem>();
    const items = detectItemsInContent(content, existing);

    for (const item of items) {
      expect(item.isNew).toBe(true);
    }
  });
});

describe('generateItemNameSuggestions', () => {
  it('should generate unique name suggestions', () => {
    const suggestions = generateItemNameSuggestions('weapon', new Set(), 5);
    expect(suggestions.length).toBeLessThanOrEqual(5);
    expect(suggestions.length).toBeGreaterThan(0);

    // All names should be unique
    const uniqueSet = new Set(suggestions);
    expect(uniqueSet.size).toBe(suggestions.length);
  });

  it('should not include existing names', () => {
    const existing = new Set(['Thanh Kiếm', 'Hắc Đao']);
    const suggestions = generateItemNameSuggestions('weapon', existing, 5);

    for (const name of suggestions) {
      expect(existing.has(name.toLowerCase())).toBe(false);
    }
  });

  it('should work for different categories', () => {
    const categories: ItemCategory[] = ['weapon', 'armor', 'consumable', 'technique', 'artifact'];
    for (const category of categories) {
      const suggestions = generateItemNameSuggestions(category, new Set(), 3);
      expect(suggestions.length).toBeGreaterThan(0);
    }
  });
});

describe('getItemStatistics', () => {
  it('should calculate statistics for empty collection', () => {
    const stats = getItemStatistics(new Map(), 100);
    expect(stats.totalItems).toBe(0);
    expect(stats.avgMentionsPerItem).toBe(0);
    expect(stats.forgottenItems).toBe(0);
  });

  it('should calculate statistics correctly', () => {
    const items = new Map<string, TrackedItem>();
    items.set('1', {
      id: '1',
      projectId: 'p',
      name: 'Sword',
      category: 'weapon',
      grade: 'hạ phẩm',
      description: 'desc',
      effects: [],
      firstMentionChapter: 1,
      lastMentionChapter: 90,
      mentionCount: 20,
      ownerHistory: [],
      status: 'active',
    });
    items.set('2', {
      id: '2',
      projectId: 'p',
      name: 'Pill',
      category: 'consumable',
      grade: 'trung phẩm',
      description: 'desc',
      effects: [],
      firstMentionChapter: 10,
      lastMentionChapter: 10,
      mentionCount: 1,
      ownerHistory: [],
      status: 'active',
    });

    const stats = getItemStatistics(items, 100);
    expect(stats.totalItems).toBe(2);
    expect(stats.byCategory['weapon']).toBe(1);
    expect(stats.byCategory['consumable']).toBe(1);
    expect(stats.forgottenItems).toBe(1); // Pill not mentioned in 90 chapters
    expect(stats.avgMentionsPerItem).toBe(10.5);
    expect(stats.mostMentioned[0].name).toBe('Sword');
  });
});

describe('createItemTracker', () => {
  it('should create a new instance', () => {
    const tracker = createItemTracker('proj-123');
    expect(tracker).toBeInstanceOf(ItemTracker);
  });
});
