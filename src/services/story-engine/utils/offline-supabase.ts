import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

type JsonRecord = Record<string, unknown>;

type SelectOptions = { count?: 'exact'; head?: boolean };
type OrderOptions = { ascending?: boolean };

type Filter =
  | { op: 'eq'; column: string; value: unknown }
  | { op: 'in'; column: string; value: unknown[] }
  | { op: 'contains'; column: string; value: JsonRecord }
  | { op: 'gte' | 'lte' | 'gt' | 'lt'; column: string; value: unknown };

type Action =
  | { kind: 'select'; columns: string; options?: SelectOptions }
  | { kind: 'insert'; payload: unknown }
  | { kind: 'update'; payload: JsonRecord }
  | { kind: 'upsert'; payload: unknown; options?: { onConflict?: string } }
  | { kind: 'delete' };

type OfflineDbFile = {
  version: 1;
  tables: Record<string, JsonRecord[]>;
};

function truthyFlag(value: string | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'true' || value?.toLowerCase() === 'yes';
}

function resolveOfflineDbPath(rootDir: string): string {
  const explicit = process.env.CODEX_AUTOMATION_OFFLINE_DB_PATH;
  if (explicit) return path.isAbsolute(explicit) ? explicit : path.resolve(rootDir, explicit);
  return path.resolve(rootDir, '.automation/offline/db.json');
}

function ensureDir(filePath: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function deepContains(value: unknown, subset: JsonRecord): boolean {
  if (!value || typeof value !== 'object') return false;
  const obj = value as JsonRecord;
  for (const [key, expected] of Object.entries(subset)) {
    const actual = obj[key];
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if (!deepContains(actual, expected as JsonRecord)) return false;
      continue;
    }
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) return false;
      for (const item of expected) {
        if (!actual.some((a) => a === item)) return false;
      }
      continue;
    }
    if (actual !== expected) return false;
  }
  return true;
}

function normalizeRow(row: JsonRecord): JsonRecord {
  const now = new Date().toISOString();
  return {
    id: typeof row.id === 'string' && row.id ? row.id : randomUUID(),
    created_at: typeof row.created_at === 'string' ? row.created_at : now,
    ...row,
  };
}

class OfflineStore {
  private readonly filePath: string;
  private loaded = false;
  private data: OfflineDbFile = { version: 1, tables: {} };

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  load(): OfflineDbFile {
    if (this.loaded) return this.data;
    this.loaded = true;
    if (existsSync(this.filePath)) {
      const parsed = JSON.parse(readFileSync(this.filePath, 'utf-8')) as OfflineDbFile;
      this.data = parsed?.version === 1 && parsed.tables ? parsed : { version: 1, tables: {} };
    }
    if (!this.data.tables.profiles || this.data.tables.profiles.length === 0) {
      this.data.tables.profiles = [normalizeRow({ id: randomUUID() })];
      this.flush();
    }
    return this.data;
  }

  flush(): void {
    ensureDir(this.filePath);
    writeFileSync(this.filePath, `${JSON.stringify(this.data, null, 2)}\n`, 'utf-8');
  }

  table(name: string): JsonRecord[] {
    const db = this.load();
    if (!db.tables[name]) db.tables[name] = [];
    return db.tables[name];
  }
}

class OfflineQueryBuilder {
  private readonly store: OfflineStore;
  private readonly tableName: string;
  private action: Action = { kind: 'select', columns: '*', options: undefined };
  private filters: Filter[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private limitN: number | null = null;
  private singleMode: 'maybe' | 'single' | null = null;

  constructor(store: OfflineStore, tableName: string) {
    this.store = store;
    this.tableName = tableName;
  }

  select(columns: string, options?: SelectOptions): this {
    this.action = { kind: 'select', columns, options };
    return this;
  }

  insert(payload: unknown): this {
    this.action = { kind: 'insert', payload };
    return this;
  }

  update(payload: JsonRecord): this {
    this.action = { kind: 'update', payload };
    return this;
  }

  upsert(payload: unknown, options?: { onConflict?: string }): this {
    this.action = { kind: 'upsert', payload, options };
    return this;
  }

  delete(): this {
    this.action = { kind: 'delete' };
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ op: 'eq', column, value });
    return this;
  }

  in(column: string, value: unknown[]): this {
    this.filters.push({ op: 'in', column, value });
    return this;
  }

  contains(column: string, value: JsonRecord): this {
    this.filters.push({ op: 'contains', column, value });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.filters.push({ op: 'gte', column, value });
    return this;
  }

  lte(column: string, value: unknown): this {
    this.filters.push({ op: 'lte', column, value });
    return this;
  }

  gt(column: string, value: unknown): this {
    this.filters.push({ op: 'gt', column, value });
    return this;
  }

  lt(column: string, value: unknown): this {
    this.filters.push({ op: 'lt', column, value });
    return this;
  }

  order(column: string, options?: OrderOptions): this {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(count: number): this {
    this.limitN = Number.isFinite(count) && count >= 0 ? count : null;
    return this;
  }

  maybeSingle(): this {
    this.singleMode = 'maybe';
    return this;
  }

  single(): this {
    this.singleMode = 'single';
    return this;
  }

  private applyFilters(rows: JsonRecord[]): JsonRecord[] {
    return rows.filter((row) => {
      for (const filter of this.filters) {
        const value = row[filter.column];
        if (filter.op === 'eq') {
          if (value !== filter.value) return false;
          continue;
        }
        if (filter.op === 'in') {
          if (!filter.value.includes(value)) return false;
          continue;
        }
        if (filter.op === 'contains') {
          if (!deepContains(value, filter.value)) return false;
          continue;
        }
        if (filter.op === 'gte') {
          if (typeof value === 'number' && typeof filter.value === 'number') {
            if (value < filter.value) return false;
          } else if (typeof value === 'string' && typeof filter.value === 'string') {
            if (value < filter.value) return false;
          } else {
            if ((value as never) < (filter.value as never)) return false;
          }
          continue;
        }
        if (filter.op === 'lte') {
          if (typeof value === 'number' && typeof filter.value === 'number') {
            if (value > filter.value) return false;
          } else if (typeof value === 'string' && typeof filter.value === 'string') {
            if (value > filter.value) return false;
          } else {
            if ((value as never) > (filter.value as never)) return false;
          }
          continue;
        }
        if (filter.op === 'gt') {
          if ((value as never) <= (filter.value as never)) return false;
          continue;
        }
        if (filter.op === 'lt') {
          if ((value as never) >= (filter.value as never)) return false;
          continue;
        }
      }
      return true;
    });
  }

  private attachJoins(rows: JsonRecord[], columns: string): JsonRecord[] {
    if (!columns.includes('novels!ai_story_projects_novel_id_fkey')) return rows;
    const novels = this.store.table('novels');
    return rows.map((row) => {
      const novel = novels.find((n) => n.id === row.novel_id) || null;
      return { ...row, novels: novel ? [novel] : [] };
    });
  }

  private execute(): Promise<{ data: any; error: any; count?: number | null }> {
    try {
      const table = this.store.table(this.tableName);
      const now = new Date().toISOString();

      if (this.action.kind === 'select') {
        let rows = this.applyFilters(table);
        rows = this.attachJoins(rows, this.action.columns);
        if (this.orderBy) {
          const { column, ascending } = this.orderBy;
          rows = [...rows].sort((a, b) => {
            const av = a[column] as any;
            const bv = b[column] as any;
            if (av === bv) return 0;
            if (av === undefined || av === null) return ascending ? 1 : -1;
            if (bv === undefined || bv === null) return ascending ? -1 : 1;
            return (av < bv ? -1 : 1) * (ascending ? 1 : -1);
          });
        }
        if (this.limitN !== null) rows = rows.slice(0, this.limitN);

        const count = this.action.options?.count === 'exact' ? rows.length : null;
        const head = this.action.options?.head === true;
        let data: any = head ? null : rows;

        if (this.singleMode === 'maybe') data = (rows[0] as any) ?? null;
        if (this.singleMode === 'single') {
          if (rows.length !== 1) {
            return Promise.resolve({ data: null, error: new Error(`Expected single row, got ${rows.length}`), count });
          }
          data = rows[0] as any;
        }

        return Promise.resolve({ data, error: null, count });
      }

      if (this.action.kind === 'insert') {
        const payload = Array.isArray(this.action.payload) ? this.action.payload : [this.action.payload];
        const inserted: JsonRecord[] = [];
        for (const raw of payload) {
          if (!raw || typeof raw !== 'object') continue;
          const row = normalizeRow({ ...(raw as JsonRecord), created_at: (raw as JsonRecord).created_at as string | undefined ?? now });
          table.push(row);
          inserted.push(row);
        }
        this.store.flush();
        return Promise.resolve({ data: inserted, error: null });
      }

      if (this.action.kind === 'update') {
        const rows = this.applyFilters(table);
        for (const row of rows) Object.assign(row, this.action.payload);
        this.store.flush();
        return Promise.resolve({ data: rows, error: null });
      }

      if (this.action.kind === 'delete') {
        const remaining = table.filter((row) => !this.applyFilters([row]).length);
        const deletedCount = table.length - remaining.length;
        table.splice(0, table.length, ...remaining);
        this.store.flush();
        return Promise.resolve({ data: { deleted: deletedCount }, error: null });
      }

      if (this.action.kind === 'upsert') {
        const onConflict = (this.action.options?.onConflict || 'id').split(',').map((k) => k.trim()).filter(Boolean);
        const payload = Array.isArray(this.action.payload) ? this.action.payload : [this.action.payload];
        const upserted: JsonRecord[] = [];
        for (const raw of payload) {
          if (!raw || typeof raw !== 'object') continue;
          const row = raw as JsonRecord;
          const match = table.find((existing) => onConflict.every((k) => existing[k] === row[k]));
          if (match) {
            Object.assign(match, row);
            upserted.push(match);
          } else {
            const inserted = normalizeRow({ ...row, created_at: (row.created_at as string | undefined) ?? now });
            table.push(inserted);
            upserted.push(inserted);
          }
        }
        this.store.flush();
        return Promise.resolve({ data: upserted, error: null });
      }

      return Promise.resolve({ data: null, error: new Error(`Unsupported action: ${(this.action as any).kind}`) });
    } catch (e) {
      return Promise.resolve({ data: null, error: e });
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected as any);
  }
}

class OfflineStorageBucket {
  private readonly rootDir: string;
  private readonly bucket: string;

  constructor(rootDir: string, bucket: string) {
    this.rootDir = rootDir;
    this.bucket = bucket;
  }

  async upload(fileName: string, buffer: Buffer, _options?: { contentType?: string; cacheControl?: string; upsert?: boolean }): Promise<{ data: any; error: any }> {
    try {
      const destDir = path.resolve(this.rootDir, 'public', this.bucket);
      mkdirSync(destDir, { recursive: true });
      const dest = path.join(destDir, fileName);
      writeFileSync(dest, buffer);
      return { data: { path: `${this.bucket}/${fileName}` }, error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  }

  getPublicUrl(fileName: string): { data: { publicUrl: string } } {
    return { data: { publicUrl: `/${this.bucket}/${fileName}` } };
  }
}

export interface OfflineSupabaseClient {
  from(table: string): any;
  storage: { from(bucket: string): OfflineStorageBucket };
  __offline: { dbPath: string };
}

export function createOfflineSupabaseClient(options?: { rootDir?: string }): OfflineSupabaseClient {
  const rootDir = options?.rootDir ? path.resolve(options.rootDir) : process.cwd();
  const dbPath = resolveOfflineDbPath(rootDir);
  const store = new OfflineStore(dbPath);

  return {
    from(table: string) {
      return new OfflineQueryBuilder(store, table);
    },
    storage: {
      from(bucket: string) {
        return new OfflineStorageBucket(rootDir, bucket);
      },
    },
    __offline: { dbPath },
  };
}

export function shouldUseOfflineSupabase(): boolean {
  return truthyFlag(process.env.CODEX_AUTOMATION_OFFLINE) || truthyFlag(process.env.STORY_ENGINE_OFFLINE);
}
