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
  db = new Database(path.join(DATA_DIR, "errors.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
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

  const columns = db.prepare("PRAGMA table_info(records)").all() as { name: string }[];
  const names = new Set(columns.map((column) => column.name));
  if (!names.has("question_images")) {
    db.exec("ALTER TABLE records ADD COLUMN question_images TEXT NOT NULL DEFAULT ''");
    if (names.has("image")) db.exec("UPDATE records SET question_images = image WHERE question_images = '' AND image <> ''");
  }
  if (!names.has("answer_images")) db.exec("ALTER TABLE records ADD COLUMN answer_images TEXT NOT NULL DEFAULT ''");

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
  image: string;
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

const recordColumns = `r.id, r.subject, r.category, r.tags, r.source, r.question,
  r.answer, r.my_mistake, r.image, r.question_images, r.answer_images, r.created_at`;

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
  image?: string;
  question_images?: string;
  answer_images?: string;
}

export function initialReviewDueDate(now: number): number {
  return now + 24 * 60 * 60 * 1000;
}

export function createRecord(input: RecordInput): RecordWithReview {
  const createdAt = Date.now();
  const info = getDb()
    .prepare(
      `INSERT INTO records (
        subject, category, tags, source, question, answer, my_mistake, image,
        question_images, answer_images, created_at
      ) VALUES (
        @subject, @category, @tags, @source, @question, @answer, @my_mistake, @image,
        @question_images, @answer_images, @created_at
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
      image: input.image ?? "",
      question_images: input.question_images ?? "",
      answer_images: input.answer_images ?? "",
      created_at: createdAt,
    });
  getDb().prepare(`INSERT INTO review_state (record_id, due_date) VALUES (?, ?)`).run(info.lastInsertRowid, initialReviewDueDate(createdAt));
  return getRecord(Number(info.lastInsertRowid))!;
}

export function updateRecord(id: number, patch: Partial<RecordInput>): RecordWithReview | undefined {
  const current = getRecord(id);
  if (!current) return undefined;
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  );
  const next = { ...current, ...clean };
  getDb().prepare(
    `UPDATE records SET subject=@subject, category=@category, tags=@tags, source=@source,
       question=@question, answer=@answer, my_mistake=@my_mistake, image=@image,
       question_images=@question_images, answer_images=@answer_images
     WHERE id=@id`
  ).run({ ...next, id });
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
