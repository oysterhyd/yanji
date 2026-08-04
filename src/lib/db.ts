import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = path.join(process.cwd(), "data");
export const IMAGES_DIR = path.join(DATA_DIR, "images");
export const TEMP_IMAGES_DIR = path.join(DATA_DIR, "tmp-images");

let db: Database.Database | undefined;

function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  fs.mkdirSync(TEMP_IMAGES_DIR, { recursive: true });
  db = new Database(process.env.DB_PATH || path.join(DATA_DIR, "errors.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = undefined;
  }
}

function migrate(db: Database.Database) {
  const version = Number(db.pragma("user_version", { simple: true }));

  if (version < 1) {
    db.exec(`
CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  question TEXT NOT NULL DEFAULT '',
  answer TEXT NOT NULL DEFAULT '',
  my_mistake TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  question_images TEXT NOT NULL DEFAULT '',
  answer_images TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS review_state (
  record_id INTEGER PRIMARY KEY REFERENCES records(id) ON DELETE CASCADE,
  ease REAL NOT NULL DEFAULT 2.5,
  interval INTEGER NOT NULL DEFAULT 0,
  due_date INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0
);
`);
    db.pragma("user_version = 1");
  }

  if (version < 2) {
    const names = new Set(
      (db.prepare("PRAGMA table_info(records)").all() as { name: string }[]).map((column) => column.name)
    );
    if (!names.has("question_images")) {
      db.exec("ALTER TABLE records ADD COLUMN question_images TEXT NOT NULL DEFAULT ''");
      if (names.has("image")) db.exec("UPDATE records SET question_images = image WHERE question_images = '' AND image <> ''");
    }
    if (!names.has("answer_images")) db.exec("ALTER TABLE records ADD COLUMN answer_images TEXT NOT NULL DEFAULT ''");

    db.exec(`
CREATE TABLE IF NOT EXISTS record_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('question', 'answer')),
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_record_images_record ON record_images(record_id, kind, position);

CREATE TABLE IF NOT EXISTS review_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  grade INTEGER NOT NULL,
  reviewed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_review_log_at ON review_log(reviewed_at);
`);

    const rows = db
      .prepare(`SELECT id, image, question_images, answer_images FROM records`)
      .all() as { id: number; image: string; question_images: string; answer_images: string }[];
    const insertImage = db.prepare(
      `INSERT INTO record_images (record_id, kind, name, position) VALUES (?, ?, ?, ?)`
    );
    db.transaction(() => {
      for (const row of rows) {
        const question = row.question_images || row.image || "";
        splitNames(question).forEach((name, position) => insertImage.run(row.id, "question", name, position));
        splitNames(row.answer_images).forEach((name, position) => insertImage.run(row.id, "answer", name, position));
      }
    })();

    const after = new Set(
      (db.prepare("PRAGMA table_info(records)").all() as { name: string }[]).map((column) => column.name)
    );
    for (const column of ["image", "question_images", "answer_images"]) {
      if (after.has(column)) db.exec(`ALTER TABLE records DROP COLUMN ${column}`);
    }

    db.pragma("user_version = 2");
  }

  db.exec(`DELETE FROM review_state WHERE record_id NOT IN (SELECT id FROM records)`);
}

function splitNames(value: string | undefined): string[] {
  return String(value ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

export type Subject = "math" | "cs408";
export interface Record {
  id: number;
  subject: Subject;
  category: string;
  tags: string;
  source: string;
  question: string;
  answer: string;
  my_mistake: string;
  question_images: string;
  answer_images: string;
  created_at: number;
}

export interface ReviewState {
  ease: number;
  interval: number;
  due_date: number;
  reps: number;
  lapses: number;
}

export interface RecordWithReview extends Record, ReviewState {}

const imageSubquery = (kind: "question" | "answer") =>
  `(SELECT COALESCE(group_concat(name, ','), '') FROM (SELECT name FROM record_images WHERE record_id = r.id AND kind = '${kind}' ORDER BY position))`;

const recordColumns = `r.id, r.subject, r.category, r.tags, r.source, r.question,
  r.answer, r.my_mistake, ${imageSubquery("question")} AS question_images,
  ${imageSubquery("answer")} AS answer_images, r.created_at`;

export function listRecords(): RecordWithReview[] {
  return getDb()
    .prepare(
      `SELECT ${recordColumns}, COALESCE(s.ease,2.5) AS ease, COALESCE(s.interval,0) AS interval,
        COALESCE(s.due_date,0) AS due_date, COALESCE(s.reps,0) AS reps, COALESCE(s.lapses,0) AS lapses
       FROM records r LEFT JOIN review_state s ON s.record_id = r.id
       ORDER BY r.created_at DESC`
    )
    .all() as RecordWithReview[];
}

export function getRecord(id: number): RecordWithReview | undefined {
  return getDb()
    .prepare(
      `SELECT ${recordColumns}, COALESCE(s.ease,2.5) AS ease, COALESCE(s.interval,0) AS interval,
        COALESCE(s.due_date,0) AS due_date, COALESCE(s.reps,0) AS reps, COALESCE(s.lapses,0) AS lapses
       FROM records r LEFT JOIN review_state s ON s.record_id = r.id
       WHERE r.id = ?`
    )
    .get(id) as RecordWithReview | undefined;
}

export function dueRecords(now = Date.now()): RecordWithReview[] {
  return getDb()
    .prepare(
      `SELECT ${recordColumns}, s.ease, s.interval, s.due_date, s.reps, s.lapses
       FROM records r JOIN review_state s ON s.record_id = r.id
       WHERE s.due_date <= ?
       ORDER BY s.due_date ASC`
    )
    .all(now) as RecordWithReview[];
}

export interface RecordInput {
  subject: Subject;
  category?: string;
  tags?: string;
  source?: string;
  question: string;
  answer?: string;
  my_mistake?: string;
  question_images?: string;
  answer_images?: string;
}

export function initialReviewDueDate(now: number): number {
  return now + 24 * 60 * 60 * 1000;
}

export function createRecord(input: RecordInput): RecordWithReview {
  const createdAt = Date.now();
  const db = getDb();
  const insertImage = db.prepare(
    `INSERT INTO record_images (record_id, kind, name, position) VALUES (?, ?, ?, ?)`
  );
  const recordId = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO records (
          subject, category, tags, source, question, answer, my_mistake, created_at
        ) VALUES (
          @subject, @category, @tags, @source, @question, @answer, @my_mistake, @created_at
        )`
      )
      .run({
        subject: input.subject,
        category: input.category ?? "",
        tags: input.tags ?? "",
        source: input.source ?? "",
        question: input.question,
        answer: input.answer ?? "",
        my_mistake: input.my_mistake ?? "",
        created_at: createdAt,
      });
    const id = Number(info.lastInsertRowid);
    splitNames(input.question_images).forEach((name, position) => insertImage.run(id, "question", name, position));
    splitNames(input.answer_images).forEach((name, position) => insertImage.run(id, "answer", name, position));
    db.prepare(`INSERT INTO review_state (record_id, due_date) VALUES (?, ?)`).run(id, initialReviewDueDate(createdAt));
    return id;
  })();
  return getRecord(recordId)!;
}

export function updateRecord(id: number, patch: Partial<RecordInput>): RecordWithReview | undefined {
  const current = getRecord(id);
  if (!current) return undefined;
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  const next = { ...current, ...clean };
  const db = getDb();
  db.transaction(() => {
    db.prepare(
      `UPDATE records SET subject=@subject, category=@category, tags=@tags, source=@source,
         question=@question, answer=@answer, my_mistake=@my_mistake
       WHERE id=@id`
    ).run({ ...next, id });
    const replaceImages = (kind: "question" | "answer", value: string | undefined) => {
      if (value === undefined) return;
      db.prepare(`DELETE FROM record_images WHERE record_id = ? AND kind = ?`).run(id, kind);
      splitNames(value).forEach((name, position) =>
        db.prepare(`INSERT INTO record_images (record_id, kind, name, position) VALUES (?, ?, ?, ?)`).run(id, kind, name, position)
      );
    };
    replaceImages("question", clean.question_images as string | undefined);
    replaceImages("answer", clean.answer_images as string | undefined);
  })();
  return getRecord(id)!;
}

export function deleteRecord(id: number): void {
  getDb().prepare(`DELETE FROM records WHERE id = ?`).run(id);
}

export function saveReviewState(recordId: number, state: ReviewState): void {
  getDb().prepare(
    `INSERT INTO review_state (record_id, ease, interval, due_date, reps, lapses)
     VALUES (@record_id, @ease, @interval, @due_date, @reps, @lapses)
     ON CONFLICT(record_id) DO UPDATE SET
       ease=excluded.ease, interval=excluded.interval, due_date=excluded.due_date,
       reps=excluded.reps, lapses=excluded.lapses`
  ).run({ record_id: recordId, ...state });
}

export function recordReview(recordId: number, grade: number, reviewedAt = Date.now()): void {
  getDb().prepare(`INSERT INTO review_log (record_id, grade, reviewed_at) VALUES (?, ?, ?)`).run(recordId, grade, reviewedAt);
}

export interface RecordFilter {
  subject?: string;
  category?: string;
  tag?: string;
  kw?: string;
}

export interface RecordSummary {
  id: number;
  subject: Subject;
  category: string;
  tags: string;
  source: string;
  question: string;
  created_at: number;
  due_date: number;
  interval: number;
}

export function listRecordSummaries(
  filter: RecordFilter,
  limit: number,
  offset: number
): { items: RecordSummary[]; total: number } {
  const conditions: string[] = [];
  const params: { [key: string]: unknown } = {};
  if (filter.subject) {
    conditions.push("r.subject = @subject");
    params.subject = filter.subject;
  }
  if (filter.category) {
    conditions.push("r.category = @category");
    params.category = filter.category;
  }
  if (filter.tag) {
    conditions.push("(',' || r.tags || ',') LIKE @tag");
    params.tag = `%,${filter.tag},%`;
  }
  if (filter.kw?.trim()) {
    conditions.push(
      "(r.question LIKE @kw OR r.answer LIKE @kw OR r.source LIKE @kw OR r.tags LIKE @kw OR r.my_mistake LIKE @kw)"
    );
    params.kw = `%${filter.kw.trim()}%`;
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const db = getDb();
  const total = (db.prepare(`SELECT COUNT(*) AS count FROM records r ${where}`).get(params) as { count: number }).count;
  const items = db
    .prepare(
      `SELECT r.id, r.subject, r.category, r.tags, r.source, r.question, r.created_at,
         COALESCE(s.due_date, 0) AS due_date, COALESCE(s.interval, 0) AS interval
       FROM records r LEFT JOIN review_state s ON s.record_id = r.id
       ${where}
       ORDER BY r.created_at DESC LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit, offset }) as RecordSummary[];
  return { items, total };
}

export function listTags(): string[] {
  const rows = getDb().prepare(`SELECT DISTINCT tags FROM records`).all() as { tags: string }[];
  const tags = new Set<string>();
  for (const row of rows) {
    for (const tag of row.tags.split(",").map((item) => item.trim()).filter(Boolean)) tags.add(tag);
  }
  return Array.from(tags).sort();
}

export function countDue(now = Date.now()): number {
  return (getDb().prepare(`SELECT COUNT(*) AS count FROM review_state WHERE due_date <= ?`).get(now) as { count: number }).count;
}

export function countMastered(): number {
  return (getDb().prepare(`SELECT COUNT(*) AS count FROM review_state WHERE interval >= 21`).get() as { count: number }).count;
}

export interface SubjectStats {
  subject: Subject;
  category: string;
  total: number;
  mastered: number;
  due: number;
  avgEase: number;
  totalReps: number;
  totalLapses: number;
}

export function recordStats(now = Date.now()): SubjectStats[] {
  return getDb()
    .prepare(
      `SELECT r.subject, r.category, COUNT(*) AS total,
         COALESCE(SUM(CASE WHEN s.interval >= 21 THEN 1 ELSE 0 END), 0) AS mastered,
         COALESCE(SUM(CASE WHEN s.due_date <= ? THEN 1 ELSE 0 END), 0) AS due,
         COALESCE(AVG(s.ease), 0) AS avgEase,
         COALESCE(SUM(s.reps), 0) AS totalReps,
         COALESCE(SUM(s.lapses), 0) AS totalLapses
       FROM records r LEFT JOIN review_state s ON s.record_id = r.id
       GROUP BY r.subject, r.category
       ORDER BY r.subject, r.category`
    )
    .all(now) as SubjectStats[];
}

export interface TrendPoint {
  day: string;
  reviews: number;
  forgotten: number;
}

export function reviewTrend(days = 30, now = Date.now()): TrendPoint[] {
  const since = now - days * 86400000;
  return getDb()
    .prepare(
      `SELECT date(reviewed_at / 1000, 'unixepoch', 'localtime') AS day,
         COUNT(*) AS reviews,
         COALESCE(SUM(CASE WHEN grade < 3 THEN 1 ELSE 0 END), 0) AS forgotten
       FROM review_log
       WHERE reviewed_at >= ?
       GROUP BY day ORDER BY day`
    )
    .all(since) as TrendPoint[];
}

export interface BackupData {
  version: number;
  exported_at: number;
  records: RecordWithReview[];
}

export function exportAll(): BackupData {
  return { version: 1, exported_at: Date.now(), records: listRecords() };
}

export function importAll(data: BackupData): void {
  const db = getDb();
  db.transaction(() => {
    db.exec(`DELETE FROM records`);
    const insertRecord = db.prepare(
      `INSERT INTO records (id, subject, category, tags, source, question, answer, my_mistake, created_at)
       VALUES (@id, @subject, @category, @tags, @source, @question, @answer, @my_mistake, @created_at)`
    );
    const insertImage = db.prepare(
      `INSERT INTO record_images (record_id, kind, name, position) VALUES (?, ?, ?, ?)`
    );
    const insertState = db.prepare(
      `INSERT INTO review_state (record_id, ease, interval, due_date, reps, lapses) VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const record of data.records) {
      insertRecord.run({
        id: record.id,
        subject: record.subject,
        category: record.category ?? "",
        tags: record.tags ?? "",
        source: record.source ?? "",
        question: record.question,
        answer: record.answer ?? "",
        my_mistake: record.my_mistake ?? "",
        created_at: record.created_at,
      });
      splitNames(record.question_images).forEach((name, position) => insertImage.run(record.id, "question", name, position));
      splitNames(record.answer_images).forEach((name, position) => insertImage.run(record.id, "answer", name, position));
      insertState.run(
        record.id,
        record.ease ?? 2.5,
        record.interval ?? 0,
        record.due_date ?? 0,
        record.reps ?? 0,
        record.lapses ?? 0
      );
    }
  })();
}
