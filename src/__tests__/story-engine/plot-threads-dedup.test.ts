import {
  jaro,
  jaroWinkler,
  normalizeName,
  nameSimilarity,
  sharedTokenRatio,
} from '@/lib/utils/string-similarity';
import {
  clusterThreadsByName,
  findDuplicateThread,
  type PlotThread,
} from '@/services/story-engine/state/plot-threads';

function makeThread(id: string, name: string, importance = 50, priority: PlotThread['priority'] = 'main'): PlotThread {
  return {
    id,
    name,
    description: '',
    priority,
    status: 'open',
    startChapter: 1,
    lastActiveChapter: 1,
    relatedCharacters: [],
    foreshadowingHints: [],
    importance,
  };
}

describe('Jaro / Jaro-Winkler basics', () => {
  it('returns 1 for identical strings', () => {
    expect(jaro('abc', 'abc')).toBe(1);
    expect(jaroWinkler('abc', 'abc')).toBe(1);
  });

  it('returns 0 for empty input', () => {
    expect(jaro('', 'abc')).toBe(0);
    expect(jaro('abc', '')).toBe(0);
  });

  it('Jaro-Winkler boosts shared prefix above raw Jaro', () => {
    const j = jaro('martha', 'marhta');
    const jw = jaroWinkler('martha', 'marhta');
    expect(jw).toBeGreaterThan(j);
  });

  it('does not boost when base similarity is below 0.7', () => {
    const j = jaro('apple', 'banana');
    const jw = jaroWinkler('apple', 'banana');
    expect(jw).toBe(j);
  });
});

describe('normalizeName + sharedTokenRatio', () => {
  it('strips Vietnamese diacritics + special chars', () => {
    expect(normalizeName('Vương Khải đòi nợ')).toBe('vuong khai doi no');
  });

  it('shared token ratio detects strong overlap', () => {
    const r = sharedTokenRatio('Vương Khải đòi nợ', 'Vương Khải truy sát');
    expect(r).toBeGreaterThanOrEqual(0.5);
  });

  it('shared token ratio is 0 for disjoint phrases', () => {
    const r = sharedTokenRatio('Cứu Băng Tinh Yến', 'Đột nhập Thư Viện Cấm');
    expect(r).toBe(0);
  });
});

describe('findDuplicateThread', () => {
  const existing = [
    makeThread('t1', 'Vương Khải đòi nợ Lâm Uyên'),
    makeThread('t2', 'Sự truy sát của Vạn Thái'),
    makeThread('t3', 'Cứu Băng Tinh Yến cho Tô Mạt'),
  ];

  it('detects semantic duplicate via shared tokens', () => {
    const dup = findDuplicateThread('Vương Khải truy sát Lâm Uyên', existing);
    expect(dup).not.toBeNull();
    expect(dup?.name).toMatch(/Vương Khải/);
  });

  it('returns null for genuinely distinct thread name', () => {
    const dup = findDuplicateThread('Đột nhập Thư Viện Cấm Phượng Đô', existing);
    expect(dup).toBeNull();
  });

  it('returns null for empty / very short candidate', () => {
    expect(findDuplicateThread('', existing)).toBeNull();
    expect(findDuplicateThread('A', existing)).toBeNull();
  });

  it('catches diacritic-stripped variant', () => {
    const dup = findDuplicateThread('Vuong Khai doi no Lam Uyen', existing);
    expect(dup).not.toBeNull();
  });
});

describe('clusterThreadsByName', () => {
  it('groups semantic duplicates into single cluster', () => {
    const threads = [
      makeThread('t1', 'Vương Khải đòi nợ', 80),
      makeThread('t2', 'Vương Khải truy sát Lâm Uyên', 60),
      makeThread('t3', 'Cứu Băng Tinh Yến cho Tô Mạt', 90),
      makeThread('t4', 'Băng Tinh Yến tiến hóa', 70),
      makeThread('t5', 'Đột nhập Thư Viện Cấm Phượng Đô', 85),
    ];
    const clusters = clusterThreadsByName(threads);
    // Expect 3 clusters: Vương Khải (2), Băng Tinh Yến (2), Thư Viện (1)
    expect(clusters.length).toBe(3);
    const sizes = clusters.map(c => c.threads.length).sort();
    expect(sizes).toEqual([1, 2, 2]);
  });

  it('returns empty array on empty input', () => {
    expect(clusterThreadsByName([])).toEqual([]);
  });

  it('orders clusters by descending importance of head thread', () => {
    const threads = [
      makeThread('low', 'Background side quest', 20),
      makeThread('hi', 'Main confrontation Vương Khải', 95),
      makeThread('mid', 'Sub plot Tô Mạt', 60),
    ];
    const clusters = clusterThreadsByName(threads);
    expect(clusters[0].threads[0].importance).toBe(95);
    expect(clusters[clusters.length - 1].threads[0].importance).toBe(20);
  });
});

describe('nameSimilarity convenience', () => {
  it('reports high similarity on diacritic-only differences', () => {
    expect(nameSimilarity('Lâm Uyên', 'Lam Uyen')).toBeGreaterThan(0.95);
  });
});
