import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const PORT = Number(process.env.PORT || 3000);
const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const resolveWritableDataRoot = (): string => {
  const candidates = [
    process.env.RENDER_DISK_MOUNT_PATH,
    process.env.DATA_DIR,
    process.env.NODE_ENV === 'production' ? '/var/data' : undefined,
    PROJECT_ROOT,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      fs.accessSync(candidate, fs.constants.R_OK | fs.constants.W_OK);
      return candidate;
    } catch (error) {
      console.warn(`Data directory unavailable: ${candidate}`);
    }
  }

  return PROJECT_ROOT;
};

const DATA_ROOT = resolveWritableDataRoot();
const DB_PATH = path.join(DATA_ROOT, "todo_app.db");
const BACKUP_DIR = path.join(DATA_ROOT, "backups");

console.log("Using data root:", DATA_ROOT);
console.log("Using database:", DB_PATH);

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Initialize Database
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// Database Schema
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN affaire_id INTEGER REFERENCES affaires(id) ON DELETE SET NULL`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE subtasks ADD COLUMN time_spent INTEGER DEFAULT 0`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE subtasks ADD COLUMN completed_at DATETIME`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE subtasks ADD COLUMN parent_subtask_id INTEGER`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE subtasks ADD COLUMN focus_time_spent INTEGER DEFAULT 0`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE subtasks ADD COLUMN validation_time_spent INTEGER DEFAULT 0`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE subtasks ADD COLUMN order_index INTEGER DEFAULT 0`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN bg_color TEXT DEFAULT NULL`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN image_data TEXT DEFAULT NULL`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE affaires ADD COLUMN image_data TEXT DEFAULT NULL`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN start_date DATETIME`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN start_time TEXT`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN end_time TEXT`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE profiles ADD COLUMN app_background_theme TEXT DEFAULT 'theme-1'`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE profiles ADD COLUMN is_archived BOOLEAN DEFAULT 0`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE profiles ADD COLUMN logo TEXT`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN recurrence_type TEXT`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN recurrence_end_date DATETIME`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE profiles ADD COLUMN custom_background_image LONGTEXT`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE profiles ADD COLUMN font_family TEXT DEFAULT 'system'`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE profiles ADD COLUMN text_color TEXT DEFAULT '#000000'`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE profiles ADD COLUMN custom_labels TEXT`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE profiles ADD COLUMN logo LONGTEXT`);
} catch (e) {
  // Column might already exist
}

try {
  db.exec(`ALTER TABLE appointments ADD COLUMN image_data TEXT DEFAULT NULL`);
} catch (e) {
  // Column might already exist
}

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    avatar TEXT,
    color_theme TEXT DEFAULT 'blue',
    app_background_theme TEXT DEFAULT 'theme-1',
    is_archived BOOLEAN DEFAULT 0,
    logo LONGTEXT,
    custom_background_image LONGTEXT,
    font_family TEXT DEFAULT 'system',
    text_color TEXT DEFAULT '#000000',
    custom_labels TEXT,
    pin_hash TEXT,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#808080',
    FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS affaires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER,
    number TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#808080',
    status TEXT DEFAULT 'Active',
    image_data TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER,
    title TEXT NOT NULL,
    description_md TEXT,
    start_date DATETIME,
    due_date DATETIME,
    start_time TEXT,
    end_time TEXT,
    priority TEXT DEFAULT 'Medium',
    category_id INTEGER,
    affaire_id INTEGER,
    is_complete BOOLEAN DEFAULT 0,
    is_archived BOOLEAN DEFAULT 0,
    is_deleted BOOLEAN DEFAULT 0,
    bg_color TEXT DEFAULT NULL,
    image_data TEXT DEFAULT NULL,
    time_spent INTEGER DEFAULT 0,
    subtasks_time_spent INTEGER DEFAULT 0,
    focus_time_spent INTEGER DEFAULT 0,
    validation_time_spent INTEGER DEFAULT 0,
    recurrence TEXT,
    recurrence_type TEXT,
    recurrence_end_date DATETIME,
    order_index INTEGER DEFAULT 0,
    kanban_column TEXT DEFAULT 'To Do',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY(affaire_id) REFERENCES affaires(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    parent_subtask_id INTEGER,
    order_index INTEGER DEFAULT 0,
    title TEXT NOT NULL,
    is_complete BOOLEAN DEFAULT 0,
    time_spent INTEGER DEFAULT 0,
    focus_time_spent INTEGER DEFAULT 0,
    validation_time_spent INTEGER DEFAULT 0,
    completed_at DATETIME,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY(parent_subtask_id) REFERENCES subtasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS task_assignees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    assignee_name TEXT NOT NULL,
    assignee_avatar TEXT DEFAULT '👤',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pomodoro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER,
    task_id INTEGER,
    duration_min INTEGER NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS backup_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    exported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    profile_id INTEGER,
    task_count INTEGER,
    file_size_kb INTEGER,
    is_encrypted BOOLEAN DEFAULT 0,
    status TEXT DEFAULT 'success',
    FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    image_data TEXT DEFAULT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    affaire_id INTEGER,
    video_call_link TEXT,
    recurrence_type TEXT,
    recurrence_end_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY(affaire_id) REFERENCES affaires(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS appointment_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    company_entity TEXT,
    phone TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    data_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_profile_id INTEGER NOT NULL,
    recipient_profile_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY(recipient_profile_id) REFERENCES profiles(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_chat_sender_recipient_time ON chat_messages(sender_profile_id, recipient_profile_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_chat_recipient_read ON chat_messages(recipient_profile_id, is_read, created_at);
`);

// Backfill legacy time into validation bucket when new columns are still empty
try {
  db.exec(`
    UPDATE tasks
    SET validation_time_spent = COALESCE(time_spent, 0)
    WHERE COALESCE(validation_time_spent, 0) = 0 AND COALESCE(focus_time_spent, 0) = 0 AND COALESCE(time_spent, 0) > 0
  `);
} catch (e) {
  // Ignore backfill failures
}

try {
  db.exec(`
    UPDATE subtasks
    SET validation_time_spent = COALESCE(time_spent, 0)
    WHERE COALESCE(validation_time_spent, 0) = 0 AND COALESCE(focus_time_spent, 0) = 0 AND COALESCE(time_spent, 0) > 0
  `);
} catch (e) {
  // Ignore backfill failures
}

// Backfill legacy focus time for in-progress items created with older clients
try {
  db.exec(`
    UPDATE tasks
    SET focus_time_spent = COALESCE(time_spent, 0)
    WHERE COALESCE(is_complete, 0) = 0
      AND COALESCE(focus_time_spent, 0) = 0
      AND COALESCE(validation_time_spent, 0) = 0
      AND COALESCE(time_spent, 0) > 0
  `);
} catch (e) {
  // Ignore backfill failures
}

try {
  db.exec(`
    UPDATE subtasks
    SET focus_time_spent = COALESCE(time_spent, 0)
    WHERE COALESCE(is_complete, 0) = 0
      AND COALESCE(focus_time_spent, 0) = 0
      AND COALESCE(validation_time_spent, 0) = 0
      AND COALESCE(time_spent, 0) > 0
  `);
} catch (e) {
  // Ignore backfill failures
}

// Reclassify legacy mis-labeled validation time as focus for in-progress items
try {
  db.exec(`
    UPDATE tasks
    SET focus_time_spent = COALESCE(validation_time_spent, 0),
        validation_time_spent = 0
    WHERE COALESCE(is_complete, 0) = 0
      AND COALESCE(focus_time_spent, 0) = 0
      AND COALESCE(validation_time_spent, 0) > 0
      AND COALESCE(time_spent, 0) = COALESCE(validation_time_spent, 0)
  `);
} catch (e) {
  // Ignore backfill failures
}

try {
  db.exec(`
    UPDATE subtasks
    SET focus_time_spent = COALESCE(validation_time_spent, 0),
        validation_time_spent = 0
    WHERE COALESCE(is_complete, 0) = 0
      AND COALESCE(focus_time_spent, 0) = 0
      AND COALESCE(validation_time_spent, 0) > 0
      AND COALESCE(time_spent, 0) = COALESCE(validation_time_spent, 0)
  `);
} catch (e) {
  // Ignore backfill failures
}

const restoreSubtasksWithParents = (subtasks: any[], taskMap: Map<number, number>, mode: 'insert' | 'merge' = 'insert'): Map<number, number> => {
  const subtaskMap = new Map<number, number>();
  const pending = [...(subtasks || [])];

  while (pending.length > 0) {
    let progressed = false;

    for (let i = pending.length - 1; i >= 0; i--) {
      const subtask = pending[i];
      if (!taskMap.has(subtask.task_id)) {
        pending.splice(i, 1);
        progressed = true;
        continue;
      }

      const mappedTaskId = taskMap.get(subtask.task_id)!;
      const oldParentId = subtask.parent_subtask_id ?? null;
      if (oldParentId && !subtaskMap.has(oldParentId)) {
        continue;
      }

      const mappedParentId = oldParentId ? subtaskMap.get(oldParentId) ?? null : null;
      let finalId: number;

      if (mode === 'merge') {
        const existing = db.prepare(
          "SELECT id FROM subtasks WHERE task_id = ? AND title = ? AND COALESCE(parent_subtask_id, 0) = COALESCE(?, 0)"
        ).get(mappedTaskId, subtask.title, mappedParentId) as any;

        if (existing) {
          finalId = existing.id;
          db.prepare(
            "UPDATE subtasks SET is_complete = ?, time_spent = ?, focus_time_spent = ?, validation_time_spent = ?, completed_at = ?, order_index = ? WHERE id = ?"
          ).run(
            subtask.is_complete ? 1 : 0,
            Number.isFinite(subtask.time_spent) ? subtask.time_spent : 0,
            Number.isFinite(subtask.focus_time_spent) ? subtask.focus_time_spent : 0,
            Number.isFinite(subtask.validation_time_spent) ? subtask.validation_time_spent : 0,
            subtask.completed_at || null,
            Number.isFinite(subtask.order_index) ? subtask.order_index : 0,
            finalId
          );
        } else {
          const info = db.prepare(
            "INSERT INTO subtasks (task_id, parent_subtask_id, order_index, title, is_complete, time_spent, focus_time_spent, validation_time_spent, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
          ).run(
            mappedTaskId,
            mappedParentId,
            Number.isFinite(subtask.order_index) ? subtask.order_index : 0,
            subtask.title,
            subtask.is_complete ? 1 : 0,
            Number.isFinite(subtask.time_spent) ? subtask.time_spent : 0,
            Number.isFinite(subtask.focus_time_spent) ? subtask.focus_time_spent : 0,
            Number.isFinite(subtask.validation_time_spent) ? subtask.validation_time_spent : 0,
            subtask.completed_at || null
          );
          finalId = Number(info.lastInsertRowid);
        }
      } else {
        const info = db.prepare(
          "INSERT INTO subtasks (task_id, parent_subtask_id, order_index, title, is_complete, time_spent, focus_time_spent, validation_time_spent, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
          mappedTaskId,
          mappedParentId,
          Number.isFinite(subtask.order_index) ? subtask.order_index : 0,
          subtask.title,
          subtask.is_complete ? 1 : 0,
          Number.isFinite(subtask.time_spent) ? subtask.time_spent : 0,
          Number.isFinite(subtask.focus_time_spent) ? subtask.focus_time_spent : 0,
          Number.isFinite(subtask.validation_time_spent) ? subtask.validation_time_spent : 0,
          subtask.completed_at || null
        );
        finalId = Number(info.lastInsertRowid);
      }

      if (subtask.id != null) {
        subtaskMap.set(subtask.id, finalId);
      }
      pending.splice(i, 1);
      progressed = true;
    }

    if (!progressed) {
      for (const subtask of pending.splice(0)) {
        if (!taskMap.has(subtask.task_id)) continue;

        const mappedTaskId = taskMap.get(subtask.task_id)!;
        const info = db.prepare(
          "INSERT INTO subtasks (task_id, parent_subtask_id, order_index, title, is_complete, time_spent, focus_time_spent, validation_time_spent, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
          mappedTaskId,
          null,
          Number.isFinite(subtask.order_index) ? subtask.order_index : 0,
          subtask.title,
          subtask.is_complete ? 1 : 0,
          Number.isFinite(subtask.time_spent) ? subtask.time_spent : 0,
          Number.isFinite(subtask.focus_time_spent) ? subtask.focus_time_spent : 0,
          Number.isFinite(subtask.validation_time_spent) ? subtask.validation_time_spent : 0,
          subtask.completed_at || null
        );

        if (subtask.id != null) {
          subtaskMap.set(subtask.id, Number(info.lastInsertRowid));
        }
      }
    }
  }
  return subtaskMap;
};

// Intentionally no automatic seed data.
// A fresh database should stay empty so users can start from a blank state.

// ── Resilience helpers ────────────────────────────────────────────────────────

/** Path where we keep the "emergency" pre-shutdown snapshot. */
const EMERGENCY_BACKUP_PATH = path.join(DATA_ROOT, "emergency_backup.db");

/**
 * Checkpoint WAL and copy the live DB to `dest`.
 * We use the SQLite VACUUM INTO command (available in SQLite ≥3.27) so the
 * copy is made without ever closing the database.
 */
function snapshotDb(dest: string): void {
  try {
    db.pragma("wal_checkpoint(FULL)");
    // VACUUM INTO creates a clean, compacted copy atomically.
    db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
    console.log("[snapshot] DB saved to", dest);
  } catch (err) {
    // Fallback: plain file copy (less ideal but always available)
    try {
      fs.copyFileSync(DB_PATH, dest);
      console.log("[snapshot] DB copied (fallback) to", dest);
    } catch (e) {
      console.error("[snapshot] Failed to save DB:", e);
    }
  }
}

/**
 * On startup: if the profiles table is empty AND an emergency backup exists,
 * restore from it so we survive a redeploy with ephemeral local storage.
 */
function autoRestoreIfEmpty(): void {
  try {
    const count = (db.prepare("SELECT COUNT(*) as n FROM profiles").get() as any)?.n ?? 0;
    if (count > 0) return; // DB already has data, nothing to do

    if (fs.existsSync(EMERGENCY_BACKUP_PATH)) {
      console.log("[auto-restore] DB is empty – restoring from emergency backup…");
      // Close is not possible (we have a live handle), so we read ALL data
      // from the snapshot and re-insert it.
      const snap = new Database(EMERGENCY_BACKUP_PATH, { readonly: true });
      const allTables = [
        "profiles","categories","affaires","tasks","subtasks","documents",
        "task_assignees","pomodoro","appointments","appointment_participants",
        "backup_log","chat_messages",
      ];
      const snapTableNames = new Set(
        (snap.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[])
          .map((r: any) => String(r.name))
      );
      const insertRows = (table: string, rows: any[]) => {
        if (!rows.length) return;
        const destCols = (db.prepare(`PRAGMA table_info(${table})`).all() as any[]).map((c: any) => String(c.name));
        const destSet = new Set(destCols);
        const common = Object.keys(rows[0]).filter((c) => destSet.has(c));
        if (!common.length) return;
        const stmt = db.prepare(`INSERT OR IGNORE INTO ${table} (${common.join(",")}) VALUES (${common.map(() => "?").join(",")})`);
        for (const row of rows) stmt.run(...common.map((c) => (row[c] === undefined ? null : row[c])));
      };
      db.transaction(() => {
        for (const table of allTables) {
          if (!snapTableNames.has(table)) continue;
          const rows = snap.prepare(`SELECT * FROM ${table}`).all() as any[];
          insertRows(table, rows);
        }
      })();
      snap.close();
      const restored = (db.prepare("SELECT COUNT(*) as n FROM profiles").get() as any)?.n ?? 0;
      console.log(`[auto-restore] Restored ${restored} profile(s) from emergency backup.`);
    } else {
      console.log("[auto-restore] No emergency backup found. Starting with empty DB.");
    }
  } catch (err) {
    console.error("[auto-restore] Failed:", err);
  }
}

/** Graceful shutdown: checkpoint + emergency snapshot. */
function handleShutdown(signal: string): void {
  console.log(`[shutdown] Received ${signal} – saving emergency backup…`);
  snapshotDb(EMERGENCY_BACKUP_PATH);
  process.exit(0);
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT",  () => handleShutdown("SIGINT"));

// ─────────────────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();

  // ── Startup resilience ──────────────────────────────────────────────────────
  autoRestoreIfEmpty();

  // Periodic emergency snapshot every 30 minutes
  setInterval(() => {
    snapshotDb(EMERGENCY_BACKUP_PATH);
  }, 30 * 60 * 1000);
  // ────────────────────────────────────────────────────────────────────────────

  // Enable CORS for all origins
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
  
  // Increase payload size limit to 50MB to support large base64-encoded images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- API ROUTES ---

  app.get("/api/profiles", (req, res) => {
    const profiles = db.prepare("SELECT * FROM profiles").all();
    res.json(profiles);
  });

  app.post("/api/profiles", (req, res) => {
    const { name, avatar, color_theme, app_background_theme, logo } = req.body;
    const avatarValue = avatar || "👤";
    const themeValue = color_theme || "blue";
    const bgThemeValue = app_background_theme || "theme-1";
    const logoValue = logo || null;
    
    const stmt = db.prepare("INSERT INTO profiles (name, avatar, color_theme, app_background_theme, logo) VALUES (?, ?, ?, ?, ?)");
    const info = stmt.run(name, avatarValue, themeValue, bgThemeValue, logoValue);
    
    res.json({ 
      id: info.lastInsertRowid, 
      name: name, 
      avatar: avatarValue, 
      color_theme: themeValue, 
      app_background_theme: bgThemeValue,
      logo: logoValue,
      is_archived: false
    });
  });

  app.put("/api/profiles/:id", (req, res) => {
    const { name, avatar, color_theme, app_background_theme, is_archived, logo, custom_background_image, custom_labels, font_family, text_color } = req.body;
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (avatar !== undefined) {
      updates.push("avatar = ?");
      values.push(avatar);
    }
    if (logo !== undefined) {
      updates.push("logo = ?");
      values.push(logo);
    }
    if (color_theme !== undefined) {
      updates.push("color_theme = ?");
      values.push(color_theme);
    }
    if (app_background_theme !== undefined) {
      updates.push("app_background_theme = ?");
      values.push(app_background_theme);
    }
    if (custom_background_image !== undefined) {
      updates.push("custom_background_image = ?");
      values.push(custom_background_image);
    }
    if (font_family !== undefined) {
      updates.push("font_family = ?");
      values.push(font_family);
    }
    if (text_color !== undefined) {
      updates.push("text_color = ?");
      values.push(text_color);
    }
    if (custom_labels !== undefined) {
      updates.push("custom_labels = ?");
      values.push(JSON.stringify(custom_labels));
    }
    if (is_archived !== undefined) {
      updates.push("is_archived = ?");
      values.push(is_archived ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.json({ success: true });
    }

    values.push(req.params.id);
    const query = `UPDATE profiles SET ${updates.join(", ")} WHERE id = ?`;
    db.prepare(query).run(...values);
    
    // Return the updated profile
    const updatedProfile = db.prepare("SELECT * FROM profiles WHERE id = ?").get(req.params.id);
    res.json({ success: true, data: updatedProfile });
  });

  app.delete("/api/profiles/:id", (req, res) => {
    const profileId = req.params.id;
    
    try {
      // Delete all associated data (foreign key cascades handle most deletions)
      db.prepare("DELETE FROM tasks WHERE profile_id = ?").run(profileId);
      db.prepare("DELETE FROM categories WHERE profile_id = ?").run(profileId);
      db.prepare("DELETE FROM affaires WHERE profile_id = ?").run(profileId);
      
      // Delete the profile itself
      db.prepare("DELETE FROM profiles WHERE id = ?").run(profileId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting profile:', error);
      res.status(500).json({ error: 'Failed to delete profile' });
    }
  });

  // Chat (inter-profile messaging)
  app.get("/api/chat/conversations/:profileId", (req, res) => {
    try {
      const profileId = Number(req.params.profileId);
      if (!Number.isFinite(profileId) || profileId <= 0) {
        return res.status(400).json({ error: 'Invalid profile id' });
      }

      const self = db.prepare("SELECT id FROM profiles WHERE id = ?").get(profileId) as any;
      if (!self) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const peers = db.prepare(`
        SELECT id, name, avatar, logo, is_archived
        FROM profiles
        WHERE id != ? AND COALESCE(is_archived, 0) = 0
        ORDER BY name COLLATE NOCASE ASC
      `).all(profileId) as any[];

      const getLastMessage = db.prepare(`
        SELECT id, sender_profile_id, recipient_profile_id, content, created_at
        FROM chat_messages
        WHERE (sender_profile_id = ? AND recipient_profile_id = ?)
           OR (sender_profile_id = ? AND recipient_profile_id = ?)
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT 1
      `);

      const getUnreadCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM chat_messages
        WHERE sender_profile_id = ?
          AND recipient_profile_id = ?
          AND COALESCE(is_read, 0) = 0
      `);

      const conversations = peers.map((peer) => {
        const last = getLastMessage.get(profileId, peer.id, peer.id, profileId) as any;
        const unread = getUnreadCount.get(peer.id, profileId) as any;
        return {
          profile: peer,
          last_message: last?.content || null,
          last_message_at: last?.created_at || null,
          unread_count: Number(unread?.count || 0)
        };
      }).sort((a, b) => {
        if (!a.last_message_at && !b.last_message_at) return a.profile.name.localeCompare(b.profile.name);
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });

      res.json(conversations);
    } catch (error: any) {
      console.error('Failed to fetch conversations:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch conversations' });
    }
  });

  app.get("/api/chat/messages", (req, res) => {
    try {
      const profileA = Number(req.query.profileA);
      const profileB = Number(req.query.profileB);

      if (!Number.isFinite(profileA) || profileA <= 0 || !Number.isFinite(profileB) || profileB <= 0) {
        return res.status(400).json({ error: 'Invalid profile ids' });
      }

      const rows = db.prepare(`
        SELECT id, sender_profile_id, recipient_profile_id, content, is_read, created_at
        FROM chat_messages
        WHERE (sender_profile_id = ? AND recipient_profile_id = ?)
           OR (sender_profile_id = ? AND recipient_profile_id = ?)
        ORDER BY datetime(created_at) ASC, id ASC
      `).all(profileA, profileB, profileB, profileA);

      db.prepare(`
        UPDATE chat_messages
        SET is_read = 1
        WHERE sender_profile_id = ?
          AND recipient_profile_id = ?
          AND COALESCE(is_read, 0) = 0
      `).run(profileB, profileA);

      res.json(rows);
    } catch (error: any) {
      console.error('Failed to fetch chat messages:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch messages' });
    }
  });

  app.post("/api/chat/messages", (req, res) => {
    try {
      const senderProfileId = Number(req.body.sender_profile_id);
      const recipientProfileId = Number(req.body.recipient_profile_id);
      const content = String(req.body.content || '').trim();

      if (!Number.isFinite(senderProfileId) || senderProfileId <= 0 || !Number.isFinite(recipientProfileId) || recipientProfileId <= 0) {
        return res.status(400).json({ error: 'Invalid profile ids' });
      }

      if (senderProfileId === recipientProfileId) {
        return res.status(400).json({ error: 'Cannot send message to the same profile' });
      }

      if (!content) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      const sender = db.prepare("SELECT id FROM profiles WHERE id = ?").get(senderProfileId) as any;
      const recipient = db.prepare("SELECT id FROM profiles WHERE id = ?").get(recipientProfileId) as any;
      if (!sender || !recipient) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const info = db.prepare(`
        INSERT INTO chat_messages (sender_profile_id, recipient_profile_id, content, is_read)
        VALUES (?, ?, ?, 0)
      `).run(senderProfileId, recipientProfileId, content);

      const message = db.prepare(`
        SELECT id, sender_profile_id, recipient_profile_id, content, is_read, created_at
        FROM chat_messages
        WHERE id = ?
      `).get(info.lastInsertRowid);

      res.json(message);
    } catch (error: any) {
      console.error('Failed to send chat message:', error);
      res.status(500).json({ error: error.message || 'Failed to send message' });
    }
  });

  app.delete("/api/chat/messages", (req, res) => {
    try {
      const profileA = Number(req.query.profileA);
      const profileB = Number(req.query.profileB);

      if (!Number.isFinite(profileA) || profileA <= 0 || !Number.isFinite(profileB) || profileB <= 0) {
        return res.status(400).json({ error: 'Invalid profile ids' });
      }

      db.prepare(`
        DELETE FROM chat_messages
        WHERE (sender_profile_id = ? AND recipient_profile_id = ?)
           OR (sender_profile_id = ? AND recipient_profile_id = ?)
      `).run(profileA, profileB, profileB, profileA);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to delete conversation:', error);
      res.status(500).json({ error: error.message || 'Failed to delete conversation' });
    }
  });

  // Categories
  app.get("/api/categories/:profileId", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories WHERE profile_id = ?").all(req.params.profileId);
    res.json(categories);
  });

  app.post("/api/categories", (req, res) => {
    const { profile_id, name, color } = req.body;
    const stmt = db.prepare("INSERT INTO categories (profile_id, name, color) VALUES (?, ?, ?)");
    const info = stmt.run(profile_id, name, color);
    res.json({ id: info.lastInsertRowid, profile_id, name, color });
  });

  app.delete("/api/categories/:id", (req, res) => {
    const stmt = db.prepare("DELETE FROM categories WHERE id = ?");
    stmt.run(req.params.id);
    res.json({ status: 'ok' });
  });

  // Affaires
  app.get("/api/affaires/:profileId", (req, res) => {
    const affaires = db.prepare("SELECT * FROM affaires WHERE profile_id = ? ORDER BY created_at DESC").all(req.params.profileId);
    res.json(affaires);
  });

  app.post("/api/affaires", (req, res) => {
    const { profile_id, number, name, color, status, image_data } = req.body;
    const stmt = db.prepare("INSERT INTO affaires (profile_id, number, name, color, status, image_data) VALUES (?, ?, ?, ?, ?, ?)");
    const info = stmt.run(profile_id, number, name, color || '#808080', status || 'Active', image_data || null);
    res.json({ id: info.lastInsertRowid, profile_id, number, name, color, status, image_data: image_data || null });
  });

  app.put("/api/affaires/:id", (req, res) => {
    const { number, name, color, status, image_data } = req.body;
    const current = db.prepare("SELECT * FROM affaires WHERE id = ?").get(req.params.id) as any;
    if (!current) return res.status(404).json({ error: 'Affaire not found' });
    const updatedImageData = image_data !== undefined ? image_data : current.image_data;
    db.prepare("UPDATE affaires SET number = ?, name = ?, color = ?, status = ?, image_data = ? WHERE id = ?").run(
      number ?? current.number,
      name ?? current.name,
      color ?? current.color,
      status ?? current.status,
      updatedImageData,
      req.params.id
    );
    res.json({ success: true });
  });

  app.delete("/api/affaires/:id", (req, res) => {
    db.prepare("DELETE FROM affaires WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Tasks
  app.get("/api/tasks/:profileId", (req, res) => {
    const tasks = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, a.number as affaire_number, a.name as affaire_name, a.color as affaire_color
      FROM tasks t 
      LEFT JOIN categories c ON t.category_id = c.id 
      LEFT JOIN affaires a ON t.affaire_id = a.id
      WHERE t.profile_id = ? AND t.is_deleted = 0 AND t.is_archived = 0
      ORDER BY t.order_index ASC, t.created_at DESC
    `).all(req.params.profileId);
    
    // Fetch subtasks and assignees for each task
    const tasksWithSubtasks = tasks.map((task: any) => {
      const subtasks = db.prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY COALESCE(parent_subtask_id, 0) ASC, order_index ASC, id ASC").all(task.id);
      const assignees = db.prepare("SELECT * FROM task_assignees WHERE task_id = ? ORDER BY created_at ASC").all(task.id);
      return { ...task, subtasks, assignees };
    });
    
    res.json(tasksWithSubtasks);
  });

  app.get("/api/tasks/:profileId/archive", (req, res) => {
    const tasks = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, a.number as affaire_number, a.name as affaire_name, a.color as affaire_color
      FROM tasks t 
      LEFT JOIN categories c ON t.category_id = c.id 
      LEFT JOIN affaires a ON t.affaire_id = a.id
      WHERE t.profile_id = ? AND t.is_deleted = 0 AND (t.is_archived = 1 OR t.is_complete = 1)
      ORDER BY t.completed_at DESC, t.updated_at DESC
    `).all(req.params.profileId);
    
    const tasksWithSubtasks = tasks.map((task: any) => {
      const subtasks = db.prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY COALESCE(parent_subtask_id, 0) ASC, order_index ASC, id ASC").all(task.id);
      const assignees = db.prepare("SELECT * FROM task_assignees WHERE task_id = ? ORDER BY created_at ASC").all(task.id);
      return { ...task, subtasks, assignees };
    });
    
    res.json(tasksWithSubtasks);
  });

  app.get("/api/tasks/:profileId/trash", (req, res) => {
    const tasks = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, a.number as affaire_number, a.name as affaire_name, a.color as affaire_color
      FROM tasks t 
      LEFT JOIN categories c ON t.category_id = c.id 
      LEFT JOIN affaires a ON t.affaire_id = a.id
      WHERE t.profile_id = ? AND t.is_deleted = 1
      ORDER BY t.created_at DESC
    `).all(req.params.profileId);
    
    const tasksWithSubtasks = tasks.map((task: any) => {
      const subtasks = db.prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY COALESCE(parent_subtask_id, 0) ASC, order_index ASC, id ASC").all(task.id);
      const assignees = db.prepare("SELECT * FROM task_assignees WHERE task_id = ? ORDER BY created_at ASC").all(task.id);
      return { ...task, subtasks, assignees };
    });
    
    res.json(tasksWithSubtasks);
  });

  app.post("/api/tasks", (req, res) => {
    try {
      const { profile_id, title, description_md, start_date, due_date, start_time, end_time, priority, category_id, kanban_column, affaire_id, recurrence_type, recurrence_end_date, image_data } = req.body;

      // Validate required fields
      if (!title || String(title).trim() === '') {
        return res.status(400).json({ error: 'Title is required' });
      }
      if (!profile_id) {
        return res.status(400).json({ error: 'profile_id is required' });
      }

      // Verify profile exists
      const profileExists = db.prepare("SELECT id FROM profiles WHERE id = ?").get(profile_id);
      if (!profileExists) {
        return res.status(400).json({ error: `Profile ${profile_id} not found. Please refresh the page.` });
      }

      const stmt = db.prepare(`
        INSERT INTO tasks (profile_id, title, description_md, start_date, due_date, start_time, end_time, priority, category_id, kanban_column, affaire_id, recurrence_type, recurrence_end_date, image_data) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        profile_id,
        String(title).trim(),
        description_md || null,
        start_date || null,
        due_date || null,
        start_time || null,
        end_time || null,
        priority || 'Medium',
        category_id || null,
        kanban_column || 'To Do',
        affaire_id || null,
        recurrence_type || null,
        recurrence_end_date || null,
        image_data || null
      );

      const newTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(info.lastInsertRowid);
      res.json({ ...newTask as object, subtasks: [] });
    } catch (err: any) {
      console.error('❌ POST /api/tasks error:', err);
      res.status(500).json({ error: err.message || 'Failed to create task' });
    }
  });

  app.put("/api/tasks/:id", (req, res) => {
    try {
      const taskId = req.params.id;
      const { title, description_md, start_date, due_date, start_time, end_time, priority, category_id, kanban_column, is_complete, affaire_id, time_spent, focus_time_spent, validation_time_spent, completed_at, is_archived, is_deleted, recurrence_type, recurrence_end_date, image_data } = req.body;
      
      // Get current task to preserve fields not being updated
      const currentTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as any;
      if (!currentTask) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      // Determine final values
      const finalIsComplete = is_complete !== undefined ? is_complete : currentTask.is_complete;
      const finalCompletedAt = completed_at !== undefined ? completed_at : (finalIsComplete && !currentTask.is_complete ? new Date().toISOString() : currentTask.completed_at);

      const hasExplicitFocus = focus_time_spent !== undefined && focus_time_spent !== null;
      const hasExplicitValidation = validation_time_spent !== undefined && validation_time_spent !== null;

      const shouldInferFocusFromLegacyTime =
        time_spent !== undefined &&
        !hasExplicitFocus &&
        !hasExplicitValidation &&
        is_complete !== true;

      const inferredFocusTime = shouldInferFocusFromLegacyTime ? time_spent : undefined;
      
      // Use provided values or fall back to current values
      const updates = {
        title: title !== undefined ? title : currentTask.title,
        description_md: description_md !== undefined ? description_md : currentTask.description_md,
        start_date: start_date !== undefined ? start_date : currentTask.start_date,
        due_date: due_date !== undefined ? due_date : currentTask.due_date,
        start_time: start_time !== undefined ? start_time : currentTask.start_time,
        end_time: end_time !== undefined ? end_time : currentTask.end_time,
        priority: priority !== undefined ? priority : currentTask.priority,
        category_id: category_id !== undefined ? category_id : currentTask.category_id,
        kanban_column: kanban_column !== undefined ? kanban_column : currentTask.kanban_column,
        is_complete: finalIsComplete,
        affaire_id: affaire_id !== undefined ? affaire_id : currentTask.affaire_id,
        image_data: image_data !== undefined ? image_data : currentTask.image_data,
        time_spent: time_spent !== undefined ? time_spent : currentTask.time_spent,
        focus_time_spent: inferredFocusTime !== undefined
          ? inferredFocusTime
          : (hasExplicitFocus ? focus_time_spent : currentTask.focus_time_spent),
        validation_time_spent: hasExplicitValidation ? validation_time_spent : currentTask.validation_time_spent,
        completed_at: finalCompletedAt,
        is_archived: is_archived !== undefined ? is_archived : currentTask.is_archived,
        is_deleted: is_deleted !== undefined ? is_deleted : currentTask.is_deleted,
        recurrence_type: recurrence_type !== undefined ? recurrence_type : currentTask.recurrence_type,
        recurrence_end_date: recurrence_end_date !== undefined ? recurrence_end_date : currentTask.recurrence_end_date
      };
      
      const stmt = db.prepare(`
        UPDATE tasks 
        SET title = ?, description_md = ?, start_date = ?, due_date = ?, start_time = ?, end_time = ?, priority = ?, category_id = ?, kanban_column = ?, is_complete = ?, completed_at = ?, affaire_id = ?, image_data = ?, time_spent = ?, focus_time_spent = ?, validation_time_spent = ?, is_archived = ?, is_deleted = ?, recurrence_type = ?, recurrence_end_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(updates.title, updates.description_md, updates.start_date, updates.due_date, updates.start_time, updates.end_time, updates.priority, updates.category_id, updates.kanban_column, updates.is_complete ? 1 : 0, updates.completed_at, updates.affaire_id, updates.image_data, updates.time_spent, updates.focus_time_spent, updates.validation_time_spent, updates.is_archived ? 1 : 0, updates.is_deleted ? 1 : 0, updates.recurrence_type, updates.recurrence_end_date, taskId);
      
      // XP logic if completed
      if (updates.is_complete && !currentTask.is_complete) {
        const task = db.prepare("SELECT profile_id FROM tasks WHERE id = ?").get(taskId) as any;
        if (task) {
          db.prepare("UPDATE profiles SET xp = xp + 10 WHERE id = ?").run(task.profile_id);
          // Level up logic (simplified: 100 XP per level)
          db.prepare("UPDATE profiles SET level = (xp / 100) + 1 WHERE id = ?").run(task.profile_id);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  app.put("/api/tasks/:id/kanban", (req, res) => {
    const { kanban_column, order_index, is_complete, is_archived, completed_at } = req.body;
    
    let query = "UPDATE tasks SET kanban_column = ?, order_index = ?";
    const params = [kanban_column, order_index];
    
    if (is_complete !== undefined) {
      query += ", is_complete = ?";
      params.push(is_complete ? 1 : 0);
    }
    
    if (is_archived !== undefined) {
      query += ", is_archived = ?";
      params.push(is_archived ? 1 : 0);
    }
    
    if (completed_at !== undefined) {
      query += ", completed_at = ?";
      params.push(completed_at);
    }
    
    query += " WHERE id = ?";
    params.push(req.params.id);
    
    db.prepare(query).run(...params);
    res.json({ success: true });
  });

  app.delete("/api/tasks/:id", (req, res) => {
    // Soft delete
    db.prepare("UPDATE tasks SET is_deleted = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/tasks/:id/archive", (req, res) => {
    db.prepare("UPDATE tasks SET is_archived = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/tasks/:id/restore", (req, res) => {
    db.prepare("UPDATE tasks SET is_deleted = 0, is_archived = 0 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/tasks/:id/permanent", (req, res) => {
    db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/tasks/trash/empty/:profileId", (req, res) => {
    db.prepare("DELETE FROM tasks WHERE profile_id = ? AND is_deleted = 1").run(req.params.profileId);
    res.json({ success: true });
  });

  const recalculateTaskTimeFromCompletedSubtasks = (taskId: number) => {
    const totalRow = db.prepare(`
      SELECT COALESCE(SUM(COALESCE(time_spent, 0)), 0) as total
      FROM subtasks
      WHERE task_id = ?
    `).get(taskId) as any;

    const total = Number(totalRow?.total || 0);
    db.prepare("UPDATE tasks SET subtasks_time_spent = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(total, taskId);
  };

  // Subtasks
  app.post("/api/subtasks", (req, res) => {
    const { task_id, title } = req.body;
    const rawParentSubtaskId = req.body.parent_subtask_id ?? req.body.parentSubtaskId ?? null;
    const normalizedParentSubtaskId = rawParentSubtaskId == null ? null : Number(rawParentSubtaskId);
    const nextOrderRow = db.prepare("SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order FROM subtasks WHERE task_id = ? AND COALESCE(parent_subtask_id, 0) = COALESCE(?, 0)").get(task_id, normalizedParentSubtaskId) as any;
    const nextOrder = Number(nextOrderRow?.next_order ?? 0) || 0;
    const stmt = db.prepare("INSERT INTO subtasks (task_id, parent_subtask_id, order_index, title) VALUES (?, ?, ?, ?)");
    const info = stmt.run(task_id, normalizedParentSubtaskId, nextOrder, title);
    recalculateTaskTimeFromCompletedSubtasks(Number(task_id));
    res.json({
      id: info.lastInsertRowid,
      task_id,
      parent_subtask_id: normalizedParentSubtaskId,
      parentSubtaskId: normalizedParentSubtaskId,
      order_index: nextOrder,
      title,
      is_complete: 0
    });
  });

  app.put("/api/subtasks/:id", (req, res) => {
    const { is_complete, title, time_spent, focus_time_spent, validation_time_spent, completed_at, order_index } = req.body;
    const subtask = db.prepare("SELECT * FROM subtasks WHERE id = ?").get(req.params.id) as any;
    if (!subtask) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    const hasExplicitFocus = focus_time_spent !== undefined && focus_time_spent !== null;
    const hasExplicitValidation = validation_time_spent !== undefined && validation_time_spent !== null;

    const shouldInferFocusFromLegacyTime =
      time_spent !== undefined &&
      !hasExplicitFocus &&
      !hasExplicitValidation &&
      is_complete !== true;

    const resolvedFocusTime = shouldInferFocusFromLegacyTime ? time_spent : (hasExplicitFocus ? focus_time_spent : undefined);
    const resolvedValidationTime = hasExplicitValidation ? validation_time_spent : undefined;

    const resolvedParentSubtaskId = req.body.parent_subtask_id ?? req.body.parentSubtaskId;
    let query = "UPDATE subtasks SET ";
    const updates = [];
    const params = [];

    if (is_complete !== undefined) {
      updates.push("is_complete = ?");
      params.push(is_complete ? 1 : 0);
    }
    if (title !== undefined) {
      updates.push("title = ?");
      params.push(title);
    }
    if (time_spent !== undefined) {
      updates.push("time_spent = ?");
      params.push(time_spent);
    }
    if (resolvedFocusTime !== undefined) {
      updates.push("focus_time_spent = ?");
      params.push(resolvedFocusTime);
    }
    if (resolvedValidationTime !== undefined) {
      updates.push("validation_time_spent = ?");
      params.push(resolvedValidationTime);
    }
    if (completed_at !== undefined) {
      updates.push("completed_at = ?");
      params.push(completed_at);
    }
    if (resolvedParentSubtaskId !== undefined) {
      updates.push("parent_subtask_id = ?");
      params.push(resolvedParentSubtaskId == null ? null : Number(resolvedParentSubtaskId));
    }
    if (order_index !== undefined) {
      updates.push("order_index = ?");
      params.push(Number(order_index) || 0);
    }

    if (updates.length > 0) {
      query += updates.join(", ") + " WHERE id = ?";
      params.push(req.params.id);
      db.prepare(query).run(...params);
    }

    recalculateTaskTimeFromCompletedSubtasks(Number(subtask.task_id));
    res.json({ success: true });
  });

  app.delete("/api/subtasks/:id", (req, res) => {
    const subtask = db.prepare("SELECT id, task_id FROM subtasks WHERE id = ?").get(req.params.id) as any;
    if (!subtask) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    db.prepare(`
      WITH RECURSIVE descendants(id) AS (
        SELECT ?
        UNION ALL
        SELECT s.id
        FROM subtasks s
        JOIN descendants d ON s.parent_subtask_id = d.id
      )
      DELETE FROM subtasks WHERE id IN (SELECT id FROM descendants)
    `).run(req.params.id);

    recalculateTaskTimeFromCompletedSubtasks(Number(subtask.task_id));
    res.json({ success: true });
  });

  app.get("/api/documents/:entityType/:entityId", (req, res) => {
    const { entityType, entityId } = req.params;
    if (!['task', 'subtask'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const documents = db.prepare(`
      SELECT id, entity_type, entity_id, file_name, mime_type, data_url, created_at
      FROM documents
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at DESC, id DESC
    `).all(entityType, entityId);

    res.json(documents);
  });

  app.post("/api/documents", (req, res) => {
    try {
      const { entity_type, entity_id, file_name, mime_type, data_url } = req.body;

      if (!['task', 'subtask'].includes(entity_type)) {
        return res.status(400).json({ error: 'Invalid entity_type' });
      }
      if (!entity_id || !file_name || !data_url) {
        return res.status(400).json({ error: 'Missing required document fields' });
      }

      const stmt = db.prepare(`
        INSERT INTO documents (entity_type, entity_id, file_name, mime_type, data_url)
        VALUES (?, ?, ?, ?, ?)
      `);
      const info = stmt.run(entity_type, entity_id, file_name, mime_type || null, data_url);

      const created = db.prepare(`
        SELECT id, entity_type, entity_id, file_name, mime_type, data_url, created_at
        FROM documents WHERE id = ?
      `).get(info.lastInsertRowid);

      res.json(created);
    } catch (error: any) {
      console.error('Error saving document:', error);
      res.status(500).json({ error: error?.message || 'Failed to save document' });
    }
  });

  app.delete("/api/documents/:id", (req, res) => {
    try {
      const documentId = Number(req.params.id);
      if (!Number.isFinite(documentId) || documentId <= 0) {
        return res.status(400).json({ error: 'Invalid document id' });
      }

      const existing = db.prepare("SELECT id FROM documents WHERE id = ?").get(documentId) as any;
      if (!existing) {
        return res.status(404).json({ error: 'Document not found' });
      }

      db.prepare("DELETE FROM documents WHERE id = ?").run(documentId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      res.status(500).json({ error: error?.message || 'Failed to delete document' });
    }
  });

  // Task Assignees
  app.get("/api/tasks/:taskId/assignees", (req, res) => {
    const assignees = db.prepare("SELECT * FROM task_assignees WHERE task_id = ? ORDER BY created_at ASC").all(req.params.taskId);
    res.json(assignees);
  });

  app.post("/api/task-assignees", (req, res) => {
    const { task_id, assignee_name, assignee_avatar } = req.body;
    const stmt = db.prepare("INSERT INTO task_assignees (task_id, assignee_name, assignee_avatar) VALUES (?, ?, ?)");
    const info = stmt.run(task_id, assignee_name, assignee_avatar || '👤');
    res.json({ id: info.lastInsertRowid, task_id, assignee_name, assignee_avatar: assignee_avatar || '👤' });
  });

  app.delete("/api/task-assignees/:id", (req, res) => {
    db.prepare("DELETE FROM task_assignees WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Pomodoro
  app.post("/api/pomodoro", (req, res) => {
    const { profile_id, task_id, duration_min } = req.body;
    db.prepare("INSERT INTO pomodoro (profile_id, task_id, duration_min) VALUES (?, ?, ?)").run(profile_id, task_id, duration_min);
    db.prepare("UPDATE profiles SET xp = xp + 20 WHERE id = ?").run(profile_id);
    res.json({ success: true });
  });

  // Stats
  app.get("/api/stats/:profileId", (req, res) => {
    const profileId = req.params.profileId;
    
    const completedToday = db.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE profile_id = ? AND is_complete = 1 AND date(completed_at) = date('now')
    `).get(profileId) as any;
    
    const pomodorosToday = db.prepare(`
      SELECT COUNT(*) as count FROM pomodoro 
      WHERE profile_id = ? AND date(completed_at) = date('now')
    `).get(profileId) as any;

    res.json({
      completedToday: completedToday.count,
      pomodorosToday: pomodorosToday.count
    });
  });

  // Backups
  app.get("/api/backups", (req, res) => {
    const backups = db.prepare(`
      SELECT b.*, p.name as profile_name 
      FROM backup_log b 
      LEFT JOIN profiles p ON b.profile_id = p.id 
      ORDER BY b.exported_at DESC
    `).all();
    res.json(backups);
  });

  app.post("/api/backups/export", (req, res) => {
    try {
      const { profileId, password, comments, settings, scope } = req.body;
      const exportScope = scope === 'profile' ? 'profile' : 'full';

      const allProfiles = db.prepare("SELECT * FROM profiles").all() as any[];
      const allTasks = db.prepare("SELECT * FROM tasks").all() as any[];
      const allSubtasks = db.prepare("SELECT * FROM subtasks").all() as any[];
      const allCategories = db.prepare("SELECT * FROM categories").all() as any[];
      const allAffaires = db.prepare("SELECT * FROM affaires").all() as any[];
      const allPomodoro = db.prepare("SELECT * FROM pomodoro").all() as any[];
      const allAssignees = db.prepare("SELECT * FROM task_assignees").all() as any[];
      const allAppointments = db.prepare("SELECT * FROM appointments").all() as any[];
      const allParticipants = db.prepare("SELECT * FROM appointment_participants").all() as any[];
      const allDocuments = db.prepare("SELECT * FROM documents").all() as any[];
      const allChatMessages = db.prepare("SELECT * FROM chat_messages").all() as any[];
      const allBackupLogs = db.prepare("SELECT * FROM backup_log").all() as any[];

      let profiles: any[] = [];
      let tasks: any[] = [];
      let subtasks: any[] = [];
      let categories: any[] = [];
      let affaires: any[] = [];
      let pomodoro: any[] = [];
      let task_assignees: any[] = [];
      let appointments: any[] = [];
      let appointment_participants: any[] = [];
      let documents: any[] = [];
      let chat_messages: any[] = [];
      let backup_log: any[] = [];
      let exportedBy = 'System';

      if (exportScope === 'full') {
        profiles = allProfiles;
        tasks = allTasks;
        subtasks = allSubtasks;
        categories = allCategories;
        affaires = allAffaires;
        pomodoro = allPomodoro;
        task_assignees = allAssignees;
        appointments = allAppointments;
        appointment_participants = allParticipants;
        documents = allDocuments;
        chat_messages = allChatMessages;
        backup_log = allBackupLogs;
        exportedBy = 'All profiles';
      } else {
        const profile = db.prepare("SELECT * FROM profiles WHERE id = ?").get(profileId) as any;
        if (!profile) return res.status(404).json({ error: "Profile not found" });

        profiles = allProfiles.filter((p) => Number(p.id) === Number(profileId));
        categories = allCategories.filter((c) => Number(c.profile_id) === Number(profileId));
        affaires = allAffaires.filter((a) => Number(a.profile_id) === Number(profileId));
        tasks = allTasks.filter((t) => Number(t.profile_id) === Number(profileId));

        const taskIds = new Set(tasks.map((t) => Number(t.id)));
        subtasks = allSubtasks.filter((s) => taskIds.has(Number(s.task_id)));
        const subtaskIds = new Set(subtasks.map((s) => Number(s.id)));

        task_assignees = allAssignees.filter((ta) => taskIds.has(Number(ta.task_id)));
        pomodoro = allPomodoro.filter((p) => Number(p.profile_id) === Number(profileId) || taskIds.has(Number(p.task_id)));
        appointments = allAppointments.filter((a) => Number(a.profile_id) === Number(profileId));
        const appointmentIds = new Set(appointments.map((a) => Number(a.id)));
        appointment_participants = allParticipants.filter((ap) => appointmentIds.has(Number(ap.appointment_id)));
        documents = allDocuments.filter((d) => {
          const entityType = String(d.entity_type || '').toLowerCase();
          const entityId = Number(d.entity_id);
          return (entityType === 'task' && taskIds.has(entityId)) || (entityType === 'subtask' && subtaskIds.has(entityId));
        });
        chat_messages = [];
        backup_log = allBackupLogs.filter((log) => Number(log.profile_id) === Number(profileId));

        exportedBy = profile.name;
      }

      const backupData = {
        app: "TodoApp",
        version: "4.1",
        exported_at: new Date().toISOString(),
        exported_by: exportedBy,
        profiles,
        tasks,
        subtasks,
        categories,
        affaires,
        pomodoro,
        task_assignees,
        appointments,
        appointment_participants,
        documents,
        chat_messages,
        backup_log,
        comments: comments || {},
        images: [],
        badges: [],
        goals: [],
        history: [],
        settings: settings && typeof settings === 'object' ? settings : {}
      };

      const jsonString = JSON.stringify(backupData);
      const checksum = crypto.createHash("sha256").update(jsonString).digest("hex");
      (backupData as any).checksum = checksum;

      let finalData: string | Buffer = JSON.stringify(backupData, null, 2);
      let isEncrypted = false;
      let extension = ".json";

      if (password) {
        const iv = crypto.randomBytes(16);
        const key = crypto.scryptSync(password, 'salt', 32);
        const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
        let encrypted = cipher.update(finalData, "utf8", "hex");
        encrypted += cipher.final("hex");
        finalData = JSON.stringify({
          iv: iv.toString("hex"),
          data: encrypted
        });
        isEncrypted = true;
        extension = ".jsonbak";
      }

      const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
      const exportLabel = exportScope === 'full' ? 'ALL_PROFILES' : exportedBy.replace(/\s+/g, "_");
      const filename = `TodoBackup_${dateStr}_${exportLabel}${extension}`;
      const filepath = path.join(BACKUP_DIR, filename);

      fs.writeFileSync(filepath, finalData);

      const stats = fs.statSync(filepath);
      const fileSizeKb = Math.round(stats.size / 1024);

      const stmt = db.prepare(`
        INSERT INTO backup_log (filename, path, profile_id, task_count, file_size_kb, is_encrypted)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(filename, filepath, exportScope === 'full' ? null : profileId, tasks.length, fileSizeKb, isEncrypted ? 1 : 0);

      res.json({ success: true, filename, size: fileSizeKb, isEncrypted });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/backups/export-db", (req, res) => {
    try {
      const { profileId, scope } = req.body;
      const exportScope = scope === 'profile' ? 'profile' : 'full';

      let safeLabel = 'ALL_PROFILES';
      let backupProfileId: number | null = null;
      const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
      const filenameBase = `TodoDatabase_${dateStr}`;
      const filepath = path.join(BACKUP_DIR, `${filenameBase}.db`);

      if (exportScope === 'full') {
        fs.copyFileSync(DB_PATH, filepath);
      } else {
        const profile = db.prepare("SELECT * FROM profiles WHERE id = ?").get(profileId) as any;
        if (!profile) return res.status(404).json({ error: "Profile not found" });

        safeLabel = String(profile.name || 'profile').replace(/[^a-zA-Z0-9_-]/g, '_');
        backupProfileId = Number(profileId);

        const profileFilePath = path.join(BACKUP_DIR, `${filenameBase}_${safeLabel}.db`);
        fs.copyFileSync(DB_PATH, profileFilePath);

        const tempDb = new Database(profileFilePath);
        tempDb.pragma("foreign_keys = OFF");
        const keepProfileId = Number(profileId);

        tempDb.transaction(() => {
          tempDb.prepare(`
            DELETE FROM appointment_participants
            WHERE appointment_id IN (SELECT id FROM appointments WHERE profile_id != ?)
          `).run(keepProfileId);

          tempDb.prepare("DELETE FROM appointments WHERE profile_id != ?").run(keepProfileId);

          tempDb.prepare(`
            DELETE FROM documents
            WHERE entity_type = 'task'
              AND entity_id IN (SELECT id FROM tasks WHERE profile_id != ?)
          `).run(keepProfileId);

          tempDb.prepare(`
            DELETE FROM documents
            WHERE entity_type = 'subtask'
              AND entity_id IN (
                SELECT s.id
                FROM subtasks s
                JOIN tasks t ON s.task_id = t.id
                WHERE t.profile_id != ?
              )
          `).run(keepProfileId);

          tempDb.prepare("DELETE FROM subtasks WHERE task_id IN (SELECT id FROM tasks WHERE profile_id != ?)").run(keepProfileId);
          tempDb.prepare("DELETE FROM task_assignees WHERE task_id IN (SELECT id FROM tasks WHERE profile_id != ?)").run(keepProfileId);
          tempDb.prepare("DELETE FROM pomodoro WHERE profile_id != ? AND task_id IN (SELECT id FROM tasks WHERE profile_id != ?)").run(keepProfileId, keepProfileId);
          tempDb.prepare("DELETE FROM tasks WHERE profile_id != ?").run(keepProfileId);
          tempDb.prepare("DELETE FROM affaires WHERE profile_id != ?").run(keepProfileId);
          tempDb.prepare("DELETE FROM categories WHERE profile_id != ?").run(keepProfileId);
          tempDb.prepare("DELETE FROM backup_log").run();
          tempDb.prepare("DELETE FROM chat_messages").run();
          tempDb.prepare("DELETE FROM profiles WHERE id != ?").run(keepProfileId);
        })();

        tempDb.close();

        // Use the profile-scoped file as final exported file
        const finalPath = path.join(BACKUP_DIR, `${filenameBase}_${safeLabel}.db`);
        const stats = fs.statSync(finalPath);
        const fileSizeKb = Math.max(1, Math.round(stats.size / 1024));
        const taskCount = Number((db.prepare("SELECT COUNT(*) as count FROM tasks WHERE profile_id = ?").get(keepProfileId) as any)?.count || 0);

        const stmt = db.prepare(`
          INSERT INTO backup_log (filename, path, profile_id, task_count, file_size_kb, is_encrypted)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(path.basename(finalPath), finalPath, backupProfileId, taskCount, fileSizeKb, 0);

        return res.json({ success: true, filename: path.basename(finalPath), size: fileSizeKb, type: 'db' });
      }

      const stats = fs.statSync(filepath);
      const fileSizeKb = Math.max(1, Math.round(stats.size / 1024));
      const taskCount = Number((db.prepare("SELECT COUNT(*) as count FROM tasks").get() as any)?.count || 0);

      const stmt = db.prepare(`
        INSERT INTO backup_log (filename, path, profile_id, task_count, file_size_kb, is_encrypted)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(path.basename(filepath), filepath, null, taskCount, fileSizeKb, 0);

      res.json({ success: true, filename: path.basename(filepath), size: fileSizeKb, type: 'db' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/backups/import-db", (req, res) => {
    try {
      const { filename, fileContentBase64, mode, noSuffix } = req.body;
      const importMode = mode === 'profile' ? 'profile' : 'full';

      if (!filename || !fileContentBase64) {
        return res.status(400).json({ error: "Missing filename or file content" });
      }

      const lowerName = String(filename).toLowerCase();
      if (!lowerName.endsWith('.db') && !lowerName.endsWith('.sqlite') && !lowerName.endsWith('.sqlite3')) {
        return res.status(400).json({ error: "Unsupported database format" });
      }

      const buffer = Buffer.from(fileContentBase64, 'base64');
      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ error: "Invalid or empty database file" });
      }

      const sqliteHeader = buffer.subarray(0, 16).toString('utf8');
      if (sqliteHeader !== 'SQLite format 3\u0000') {
        return res.status(400).json({ error: "Invalid SQLite database file" });
      }

      const tempName = `import_${Date.now()}_${Math.random().toString(36).slice(2)}.db`;
      const tempPath = path.join(BACKUP_DIR, tempName);
      fs.writeFileSync(tempPath, buffer);

      const sourceDb = new Database(tempPath, { readonly: true });
      const allTables = [
        'profiles',
        'categories',
        'affaires',
        'tasks',
        'subtasks',
        'documents',
        'task_assignees',
        'pomodoro',
        'appointments',
        'appointment_participants',
        'backup_log',
        'chat_messages'
      ];
      const requiredTables = ['profiles', 'tasks', 'subtasks'];

      const sourceTableRows = sourceDb.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as any[];
      const sourceTableNames = new Set(sourceTableRows.map((row) => String(row.name || '')));
      for (const required of requiredTables) {
        if (!sourceTableNames.has(required)) {
          sourceDb.close();
          fs.unlinkSync(tempPath);
          return res.status(400).json({ error: `Invalid database: missing table ${required}` });
        }
      }

      const sourceData: Record<string, any[]> = {};
      for (const table of allTables) {
        if (!sourceTableNames.has(table)) {
          sourceData[table] = [];
          continue;
        }
        sourceData[table] = sourceDb.prepare(`SELECT * FROM ${table}`).all() as any[];
      }
      sourceDb.close();

      const insertRowsIntoTable = (table: string, rows: any[]) => {
        if (!rows || rows.length === 0) return;

        const destinationColumns = (db.prepare(`PRAGMA table_info(${table})`).all() as any[])
          .map((c) => String(c.name));
        const destinationSet = new Set(destinationColumns);

        const sourceColumns = Object.keys(rows[0] || {});
        const commonColumns = sourceColumns.filter((col) => destinationSet.has(col));
        if (commonColumns.length === 0) return;

        const placeholders = commonColumns.map(() => '?').join(', ');
        const stmt = db.prepare(`INSERT INTO ${table} (${commonColumns.join(', ')}) VALUES (${placeholders})`);

        for (const row of rows) {
          stmt.run(...commonColumns.map((col) => (row[col] === undefined ? null : row[col])));
        }
      };

      db.transaction(() => {
        if (importMode === 'full') {
          db.prepare("DELETE FROM appointment_participants").run();
          db.prepare("DELETE FROM appointments").run();
          db.prepare("DELETE FROM chat_messages").run();
          db.prepare("DELETE FROM documents").run();
          db.prepare("DELETE FROM subtasks").run();
          db.prepare("DELETE FROM task_assignees").run();
          db.prepare("DELETE FROM pomodoro").run();
          db.prepare("DELETE FROM tasks").run();
          db.prepare("DELETE FROM affaires").run();
          db.prepare("DELETE FROM categories").run();
          db.prepare("DELETE FROM backup_log").run();
          db.prepare("DELETE FROM profiles").run();

          insertRowsIntoTable('profiles', sourceData.profiles || []);
          insertRowsIntoTable('categories', sourceData.categories || []);
          insertRowsIntoTable('affaires', sourceData.affaires || []);
          insertRowsIntoTable('tasks', sourceData.tasks || []);
          insertRowsIntoTable('subtasks', sourceData.subtasks || []);
          insertRowsIntoTable('documents', sourceData.documents || []);
          insertRowsIntoTable('task_assignees', sourceData.task_assignees || []);
          insertRowsIntoTable('pomodoro', sourceData.pomodoro || []);
          insertRowsIntoTable('appointments', sourceData.appointments || []);
          insertRowsIntoTable('appointment_participants', sourceData.appointment_participants || []);
          insertRowsIntoTable('backup_log', sourceData.backup_log || []);
          insertRowsIntoTable('chat_messages', sourceData.chat_messages || []);
        } else {
          const profileMap = new Map<number, number>();
          for (const p of (sourceData.profiles || [])) {
            const originalName = String(p?.name || 'Profil importé');
            const newName = noSuffix ? originalName : `${originalName} (Importé DB)`;
            const info = db.prepare("INSERT INTO profiles (name, avatar, color_theme, app_background_theme, is_archived, logo, custom_background_image, font_family, text_color, custom_labels, pin_hash, xp, level, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
              newName,
              p.avatar || '👤',
              p.color_theme || 'blue',
              p.app_background_theme || p.color_theme || 'theme-1',
              p.is_archived ? 1 : 0,
              p.logo || null,
              p.custom_background_image || null,
              p.font_family || 'system',
              p.text_color || '#000000',
              p.custom_labels || null,
              p.pin_hash || null,
              Number.isFinite(p.xp) ? p.xp : 0,
              Number.isFinite(p.level) ? p.level : 1,
              p.created_at || null
            );
            profileMap.set(Number(p.id), Number(info.lastInsertRowid));
          }

          const categoryMap = new Map<number, number>();
          for (const c of (sourceData.categories || [])) {
            if (!profileMap.has(Number(c.profile_id))) continue;
            const info = db.prepare("INSERT INTO categories (profile_id, name, color) VALUES (?, ?, ?)").run(
              profileMap.get(Number(c.profile_id)), c.name, c.color
            );
            categoryMap.set(Number(c.id), Number(info.lastInsertRowid));
          }

          const affaireMap = new Map<number, number>();
          for (const a of (sourceData.affaires || [])) {
            if (!profileMap.has(Number(a.profile_id))) continue;
            const info = db.prepare("INSERT INTO affaires (profile_id, number, name, color, status, image_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
              profileMap.get(Number(a.profile_id)), a.number, a.name, a.color, a.status, a.image_data || null, a.created_at
            );
            affaireMap.set(Number(a.id), Number(info.lastInsertRowid));
          }

          const taskMap = new Map<number, number>();
          for (const t of (sourceData.tasks || [])) {
            if (!profileMap.has(Number(t.profile_id))) continue;
            const info = db.prepare(`
              INSERT INTO tasks (profile_id, title, description_md, start_date, due_date, start_time, end_time, priority, category_id, affaire_id, is_complete, is_archived, is_deleted, bg_color, time_spent, recurrence, recurrence_type, recurrence_end_date, image_data, order_index, kanban_column, created_at, updated_at, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              profileMap.get(Number(t.profile_id)),
              t.title,
              t.description_md,
              t.start_date || null,
              t.due_date || null,
              t.start_time || null,
              t.end_time || null,
              t.priority,
              categoryMap.get(Number(t.category_id)) || null,
              affaireMap.get(Number(t.affaire_id)) || null,
              t.is_complete ? 1 : 0,
              t.is_archived ? 1 : 0,
              t.is_deleted ? 1 : 0,
              t.bg_color || null,
              Number.isFinite(t.time_spent) ? t.time_spent : 0,
              t.recurrence || null,
              t.recurrence_type || null,
              t.recurrence_end_date || null,
              t.image_data || null,
              t.order_index,
              t.kanban_column,
              t.created_at,
              t.updated_at || t.created_at,
              t.completed_at || null
            );
            taskMap.set(Number(t.id), Number(info.lastInsertRowid));
          }

          const subtaskMap = restoreSubtasksWithParents(sourceData.subtasks || [], taskMap, 'insert');

          for (const ta of (sourceData.task_assignees || [])) {
            const mappedTaskId = taskMap.get(Number(ta.task_id));
            if (!mappedTaskId) continue;
            db.prepare("INSERT INTO task_assignees (task_id, assignee_name, assignee_avatar, created_at) VALUES (?, ?, ?, ?)").run(
              mappedTaskId,
              ta.assignee_name,
              ta.assignee_avatar || '👤',
              ta.created_at || null
            );
          }

          for (const p of (sourceData.pomodoro || [])) {
            const mappedTaskId = taskMap.get(Number(p.task_id));
            const mappedProfileId = profileMap.get(Number(p.profile_id));
            if (!mappedTaskId || !mappedProfileId) continue;
            db.prepare("INSERT INTO pomodoro (profile_id, task_id, duration_min, completed_at) VALUES (?, ?, ?, ?)").run(
              mappedProfileId,
              mappedTaskId,
              p.duration_min,
              p.completed_at || null
            );
          }

          const appointmentMap = new Map<number, number>();
          for (const a of (sourceData.appointments || [])) {
            const mappedProfileId = profileMap.get(Number(a.profile_id));
            if (!mappedProfileId) continue;
            const info = db.prepare(`
              INSERT INTO appointments (profile_id, title, description, location, start_time, end_time, affaire_id, video_call_link, image_data, recurrence_type, recurrence_end_date, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              mappedProfileId,
              a.title,
              a.description,
              a.location,
              a.start_time,
              a.end_time,
              affaireMap.get(Number(a.affaire_id)) || null,
              a.video_call_link || null,
              a.image_data || null,
              a.recurrence_type || null,
              a.recurrence_end_date || null,
              a.created_at,
              a.updated_at || a.created_at
            );
            appointmentMap.set(Number(a.id), Number(info.lastInsertRowid));
          }

          for (const ap of (sourceData.appointment_participants || [])) {
            const mappedAppointmentId = appointmentMap.get(Number(ap.appointment_id));
            if (!mappedAppointmentId) continue;
            db.prepare("INSERT INTO appointment_participants (appointment_id, first_name, last_name, company_entity, phone, email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
              mappedAppointmentId,
              ap.first_name,
              ap.last_name,
              ap.company_entity,
              ap.phone,
              ap.email,
              ap.created_at
            );
          }

          for (const d of (sourceData.documents || [])) {
            const entityType = String(d.entity_type || '').toLowerCase();
            const oldEntityId = Number(d.entity_id);
            const mappedEntityId = entityType === 'task'
              ? taskMap.get(oldEntityId)
              : entityType === 'subtask'
                ? subtaskMap.get(oldEntityId)
                : null;
            if (!mappedEntityId) continue;

            db.prepare(`
              INSERT INTO documents (entity_type, entity_id, file_name, mime_type, data_url, created_at)
              VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
            `).run(
              entityType,
              mappedEntityId,
              d.file_name || 'document',
              d.mime_type || null,
              d.data_url || '',
              d.created_at || null
            );
          }

          for (const msg of (sourceData.chat_messages || [])) {
            const mappedSenderId = profileMap.get(Number(msg.sender_profile_id));
            const mappedRecipientId = profileMap.get(Number(msg.recipient_profile_id));
            if (!mappedSenderId || !mappedRecipientId) continue;
            db.prepare(`
              INSERT INTO chat_messages (sender_profile_id, recipient_profile_id, content, is_read, created_at)
              VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
            `).run(
              mappedSenderId,
              mappedRecipientId,
              msg.content || '',
              msg.is_read ? 1 : 0,
              msg.created_at || null
            );
          }
        }
      })();

      fs.unlinkSync(tempPath);

      res.json({
        success: true,
        message: "Base de données restaurée",
        profileCount: (sourceData.profiles || []).length,
        taskCount: (sourceData.tasks || []).length,
        documentCount: (sourceData.documents || []).length
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/backups/download/:filename", (req, res) => {
    const filepath = path.join(BACKUP_DIR, req.params.filename);
    if (fs.existsSync(filepath)) {
      res.download(filepath);
    } else {
      res.status(404).send("File not found");
    }
  });

  app.delete("/api/backups/:id", (req, res) => {
    const backup = db.prepare("SELECT * FROM backup_log WHERE id = ?").get(req.params.id) as any;
    if (backup) {
      if (fs.existsSync(backup.path)) {
        fs.unlinkSync(backup.path);
      }
      db.prepare("DELETE FROM backup_log WHERE id = ?").run(req.params.id);
    }
    res.json({ success: true });
  });

  app.post("/api/backups/import", (req, res) => {
    try {
      const { fileContent, filename, mode, password } = req.body;
      
      let backupData: any;

      if (filename.endsWith(".jsonbak")) {
        if (!password) return res.status(400).json({ error: "Password required for encrypted backup" });
        const encryptedData = JSON.parse(fileContent);
        const iv = Buffer.from(encryptedData.iv, "hex");
        const key = crypto.scryptSync(password, 'salt', 32);
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        let decrypted = decipher.update(encryptedData.data, "hex", "utf8");
        decrypted += decipher.final("utf8");
        backupData = JSON.parse(decrypted);
      } else {
        backupData = JSON.parse(fileContent);
      }

      // Verify checksum
      const providedChecksum = backupData.checksum;
      delete backupData.checksum;
      const calculatedChecksum = crypto.createHash("sha256").update(JSON.stringify(backupData)).digest("hex");
      
      if (providedChecksum && providedChecksum !== calculatedChecksum) {
        // Warning: checksum mismatch
      }

      const restoreDocumentsWithMappings = (
        taskMap: Map<number, number>,
        subtaskMap: Map<number, number>,
        dedupe: boolean
      ) => {
        for (const doc of (backupData.documents || [])) {
          const entityType = String(doc?.entity_type || '').toLowerCase();
          const oldEntityId = Number(doc?.entity_id);
          const mappedEntityId = entityType === 'task'
            ? taskMap.get(oldEntityId)
            : entityType === 'subtask'
              ? subtaskMap.get(oldEntityId)
              : null;

          if (!mappedEntityId) continue;

          const fileName = doc?.file_name || 'document';
          const mimeType = doc?.mime_type || null;
          const dataUrl = doc?.data_url || '';
          const createdAt = doc?.created_at || null;

          if (!dataUrl) continue;

          if (dedupe) {
            const existing = db.prepare(`
              SELECT id FROM documents
              WHERE entity_type = ?
                AND entity_id = ?
                AND file_name = ?
                AND COALESCE(mime_type, '') = COALESCE(?, '')
                AND COALESCE(created_at, '') = COALESCE(?, '')
              LIMIT 1
            `).get(entityType, mappedEntityId, fileName, mimeType, createdAt) as any;

            if (existing) {
              continue;
            }
          }

          db.prepare(`
            INSERT INTO documents (entity_type, entity_id, file_name, mime_type, data_url, created_at)
            VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
          `).run(entityType, mappedEntityId, fileName, mimeType, dataUrl, createdAt);
        }
      };

      db.transaction(() => {
        if (mode === "full") {
          // Wipe existing data
          db.prepare("DELETE FROM appointment_participants").run();
          db.prepare("DELETE FROM appointments").run();
          db.prepare("DELETE FROM subtasks").run();
          db.prepare("DELETE FROM task_assignees").run();
          db.prepare("DELETE FROM pomodoro").run();
          db.prepare("DELETE FROM tasks").run();
          db.prepare("DELETE FROM affaires").run();
          db.prepare("DELETE FROM categories").run();
          db.prepare("DELETE FROM profiles").run();
          db.prepare("DELETE FROM backup_log").run();

          // Insert profiles
          const profileMap = new Map();
          for (const p of (backupData.profiles || [])) {
            const info = db.prepare("INSERT INTO profiles (name, avatar, color_theme, app_background_theme, is_archived, logo, custom_background_image, font_family, text_color, custom_labels, pin_hash, xp, level, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
              p.name,
              p.avatar,
              p.color_theme,
              p.app_background_theme || p.color_theme || 'theme-1',
              p.is_archived ? 1 : 0,
              p.logo || null,
              p.custom_background_image || null,
              p.font_family || 'system',
              p.text_color || '#000000',
              p.custom_labels || null,
              p.pin_hash || null,
              Number.isFinite(p.xp) ? p.xp : 0,
              Number.isFinite(p.level) ? p.level : 1,
              p.created_at
            );
            profileMap.set(p.id, info.lastInsertRowid);
          }

          // Insert categories
          const categoryMap = new Map();
          for (const c of (backupData.categories || [])) {
            const info = db.prepare("INSERT INTO categories (profile_id, name, color) VALUES (?, ?, ?)").run(
              profileMap.get(c.profile_id), c.name, c.color
            );
            categoryMap.set(c.id, info.lastInsertRowid);
          }

          // Insert affaires
          const affaireMap = new Map();
          for (const a of (backupData.affaires || [])) {
            const info = db.prepare("INSERT INTO affaires (profile_id, number, name, color, status, image_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
              profileMap.get(a.profile_id), a.number, a.name, a.color, a.status, a.image_data || null, a.created_at
            );
            affaireMap.set(a.id, info.lastInsertRowid);
          }

          // Insert tasks
          const taskMap = new Map();
          for (const t of (backupData.tasks || [])) {
            const info = db.prepare(`
              INSERT INTO tasks (profile_id, title, description_md, start_date, due_date, start_time, end_time, priority, category_id, affaire_id, is_complete, is_archived, is_deleted, bg_color, time_spent, subtasks_time_spent, focus_time_spent, validation_time_spent, recurrence, recurrence_type, recurrence_end_date, image_data, order_index, kanban_column, created_at, updated_at, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              profileMap.get(t.profile_id),
              t.title,
              t.description_md,
              t.start_date || null,
              t.due_date,
              t.start_time || null,
              t.end_time || null,
              t.priority,
              categoryMap.get(t.category_id) || null,
              affaireMap.get(t.affaire_id) || null,
              t.is_complete ? 1 : 0,
              t.is_archived ? 1 : 0,
              t.is_deleted ? 1 : 0,
              t.bg_color || null,
              Number.isFinite(t.time_spent) ? t.time_spent : 0,
              Number.isFinite(t.subtasks_time_spent) ? t.subtasks_time_spent : 0,
              Number.isFinite(t.focus_time_spent) ? t.focus_time_spent : 0,
              Number.isFinite(t.validation_time_spent) ? t.validation_time_spent : 0,
              t.recurrence || null,
              t.recurrence_type || null,
              t.recurrence_end_date || null,
              t.image_data || null,
              t.order_index,
              t.kanban_column,
              t.created_at,
              t.updated_at || t.created_at,
              t.completed_at || null
            );
            taskMap.set(t.id, info.lastInsertRowid);
          }

          for (const msg of (backupData.chat_messages || [])) {
            const mappedSenderId = profileMap.get(msg.sender_profile_id);
            const mappedRecipientId = profileMap.get(msg.recipient_profile_id);
            if (!mappedSenderId || !mappedRecipientId) continue;
            db.prepare(`
              INSERT INTO chat_messages (sender_profile_id, recipient_profile_id, content, is_read, created_at)
              VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
            `).run(
              mappedSenderId,
              mappedRecipientId,
              msg.content || '',
              msg.is_read ? 1 : 0,
              msg.created_at || null
            );
          }

          for (const log of (backupData.backup_log || [])) {
            const mappedProfileId = log.profile_id != null ? profileMap.get(log.profile_id) ?? null : null;
            db.prepare(`
              INSERT INTO backup_log (filename, path, exported_at, profile_id, task_count, file_size_kb, is_encrypted, status)
              VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?, ?)
            `).run(
              log.filename || 'imported_backup.json',
              log.path || '',
              log.exported_at || null,
              mappedProfileId,
              Number.isFinite(log.task_count) ? log.task_count : 0,
              Number.isFinite(log.file_size_kb) ? log.file_size_kb : 0,
              log.is_encrypted ? 1 : 0,
              log.status || 'success'
            );
          }

          // Insert subtasks
          const subtaskMap = restoreSubtasksWithParents(backupData.subtasks || [], taskMap, 'insert');

          // Insert task assignees
          if (backupData.task_assignees && Array.isArray(backupData.task_assignees)) {
            for (const ta of backupData.task_assignees) {
              if (taskMap.has(ta.task_id)) {
                db.prepare("INSERT INTO task_assignees (task_id, assignee_name, assignee_avatar, created_at) VALUES (?, ?, ?, ?)").run(
                  taskMap.get(ta.task_id), ta.assignee_name, ta.assignee_avatar || '👤', ta.created_at
                );
              }
            }
          }

          // Insert pomodoro
          for (const p of (backupData.pomodoro || [])) {
            if (taskMap.has(p.task_id)) {
              db.prepare("INSERT INTO pomodoro (profile_id, task_id, duration_min, completed_at) VALUES (?, ?, ?, ?)").run(
                profileMap.get(p.profile_id), taskMap.get(p.task_id), p.duration_min, p.completed_at
              );
            }
          }

          // Insert appointments
          const appointmentMap = new Map();
          for (const a of (backupData.appointments || [])) {
            const mappedProfileId = profileMap.get(a.profile_id);
            if (!mappedProfileId) continue;

            const info = db.prepare(`
              INSERT INTO appointments (profile_id, title, description, location, start_time, end_time, affaire_id, video_call_link, image_data, recurrence_type, recurrence_end_date, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              mappedProfileId,
              a.title,
              a.description,
              a.location,
              a.start_time,
              a.end_time,
              affaireMap.get(a.affaire_id) || null,
              a.video_call_link,
              a.image_data || null,
              a.recurrence_type || null,
              a.recurrence_end_date || null,
              a.created_at,
              a.updated_at || a.created_at
            );
            appointmentMap.set(a.id, info.lastInsertRowid);
          }

          // Insert appointment participants
          for (const ap of (backupData.appointment_participants || [])) {
            if (!appointmentMap.has(ap.appointment_id)) continue;
            db.prepare("INSERT INTO appointment_participants (appointment_id, first_name, last_name, company_entity, phone, email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
              appointmentMap.get(ap.appointment_id),
              ap.first_name,
              ap.last_name,
              ap.company_entity,
              ap.phone,
              ap.email,
              ap.created_at
            );
          }

          // Insert documents for tasks/subtasks
          restoreDocumentsWithMappings(taskMap, subtaskMap, false);
        } else if (mode === "merge") {
          // Smart merge: Add tasks that don't exist, update if newer
          // For simplicity, we will merge into the first existing profile or the first imported profile
          let targetProfileId = db.prepare("SELECT id FROM profiles LIMIT 1").get() as any;
          
          if (!targetProfileId) {
            // No existing profiles, just do a full import
            throw new Error("Aucun profil existant pour la fusion. Utilisez la restauration complète.");
          }
          targetProfileId = targetProfileId.id;

          // Merge categories
          const categoryMap = new Map();
          for (const c of backupData.categories) {
            const existing = db.prepare("SELECT id FROM categories WHERE profile_id = ? AND name = ?").get(targetProfileId, c.name) as any;
            if (existing) {
              categoryMap.set(c.id, existing.id);
            } else {
              const info = db.prepare("INSERT INTO categories (profile_id, name, color) VALUES (?, ?, ?)").run(
                targetProfileId, c.name, c.color
              );
              categoryMap.set(c.id, info.lastInsertRowid);
            }
          }

          // Merge affaires
          const affaireMap = new Map();
          for (const a of backupData.affaires) {
            const existing = db.prepare("SELECT id FROM affaires WHERE profile_id = ? AND number = ?").get(targetProfileId, a.number) as any;
            if (existing) {
              affaireMap.set(a.id, existing.id);
              db.prepare("UPDATE affaires SET name = ?, color = ?, status = ?, image_data = ? WHERE id = ?").run(a.name, a.color, a.status, a.image_data || null, existing.id);
            } else {
              const info = db.prepare("INSERT INTO affaires (profile_id, number, name, color, status, image_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
                targetProfileId, a.number, a.name, a.color, a.status, a.image_data || null, a.created_at
              );
              affaireMap.set(a.id, info.lastInsertRowid);
            }
          }

          // Merge tasks
          const taskMap = new Map();
          for (const t of backupData.tasks) {
            // Try to find existing task by title and created_at
            const existing = db.prepare("SELECT id, updated_at FROM tasks WHERE profile_id = ? AND title = ? AND created_at = ?").get(targetProfileId, t.title, t.created_at) as any;
            
            if (existing) {
              taskMap.set(t.id, existing.id);
              // Update if backup is newer
              const backupUpdated = new Date(t.updated_at || t.created_at).getTime();
              const existingUpdated = new Date(existing.updated_at || t.created_at).getTime();
              
              if (backupUpdated > existingUpdated) {
                db.prepare(`
                  UPDATE tasks 
                  SET description_md = ?, start_date = ?, due_date = ?, start_time = ?, end_time = ?, priority = ?, category_id = ?, affaire_id = ?, is_complete = ?, is_archived = ?, is_deleted = ?, bg_color = ?, time_spent = ?, subtasks_time_spent = ?, focus_time_spent = ?, validation_time_spent = ?, recurrence = ?, recurrence_type = ?, recurrence_end_date = ?, image_data = ?, order_index = ?, kanban_column = ?, completed_at = ?, updated_at = ?
                  WHERE id = ?
                `).run(
                  t.description_md,
                  t.start_date || null,
                  t.due_date,
                  t.start_time || null,
                  t.end_time || null,
                  t.priority,
                  categoryMap.get(t.category_id) || null,
                  affaireMap.get(t.affaire_id) || null,
                  t.is_complete ? 1 : 0,
                  t.is_archived ? 1 : 0,
                  t.is_deleted ? 1 : 0,
                  t.bg_color || null,
                  Number.isFinite(t.time_spent) ? t.time_spent : 0,
                  Number.isFinite(t.subtasks_time_spent) ? t.subtasks_time_spent : 0,
                  Number.isFinite(t.focus_time_spent) ? t.focus_time_spent : 0,
                  Number.isFinite(t.validation_time_spent) ? t.validation_time_spent : 0,
                  t.recurrence || null,
                  t.recurrence_type || null,
                  t.recurrence_end_date || null,
                  t.image_data || null,
                  t.order_index,
                  t.kanban_column,
                  t.completed_at,
                  t.updated_at || t.created_at,
                  existing.id
                );
              }
            } else {
              const info = db.prepare(`
                INSERT INTO tasks (profile_id, title, description_md, start_date, due_date, start_time, end_time, priority, category_id, affaire_id, is_complete, is_archived, is_deleted, bg_color, time_spent, subtasks_time_spent, focus_time_spent, validation_time_spent, recurrence, recurrence_type, recurrence_end_date, image_data, order_index, kanban_column, created_at, updated_at, completed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                targetProfileId,
                t.title,
                t.description_md,
                t.start_date || null,
                t.due_date,
                t.start_time || null,
                t.end_time || null,
                t.priority,
                categoryMap.get(t.category_id) || null,
                affaireMap.get(t.affaire_id) || null,
                t.is_complete ? 1 : 0,
                t.is_archived ? 1 : 0,
                t.is_deleted ? 1 : 0,
                t.bg_color || null,
                Number.isFinite(t.time_spent) ? t.time_spent : 0,
                Number.isFinite(t.subtasks_time_spent) ? t.subtasks_time_spent : 0,
                Number.isFinite(t.focus_time_spent) ? t.focus_time_spent : 0,
                Number.isFinite(t.validation_time_spent) ? t.validation_time_spent : 0,
                t.recurrence || null,
                t.recurrence_type || null,
                t.recurrence_end_date || null,
                t.image_data || null,
                t.order_index,
                t.kanban_column,
                t.created_at,
                t.updated_at || t.created_at,
                t.completed_at
              );
              taskMap.set(t.id, info.lastInsertRowid);
            }
          }

          // Merge subtasks
          const subtaskMap = restoreSubtasksWithParents(backupData.subtasks || [], taskMap, 'merge');

          // Merge task assignees
          if (backupData.task_assignees && Array.isArray(backupData.task_assignees)) {
            for (const ta of backupData.task_assignees) {
              if (taskMap.has(ta.task_id)) {
                const existing = db.prepare("SELECT id FROM task_assignees WHERE task_id = ? AND assignee_name = ?").get(taskMap.get(ta.task_id), ta.assignee_name) as any;
                if (!existing) {
                  db.prepare("INSERT INTO task_assignees (task_id, assignee_name, assignee_avatar, created_at) VALUES (?, ?, ?, ?)").run(
                    taskMap.get(ta.task_id), ta.assignee_name, ta.assignee_avatar || '👤', ta.created_at
                  );
                }
              }
            }
          }

          for (const log of (backupData.backup_log || [])) {
            const mappedProfileId = log.profile_id != null ? targetProfileId : null;
            const existing = db.prepare(`
              SELECT id FROM backup_log
              WHERE filename = ?
                AND COALESCE(exported_at, '') = COALESCE(?, '')
                AND COALESCE(profile_id, 0) = COALESCE(?, 0)
              LIMIT 1
            `).get(
              log.filename || 'imported_backup.json',
              log.exported_at || null,
              mappedProfileId
            ) as any;

            if (!existing) {
              db.prepare(`
                INSERT INTO backup_log (filename, path, exported_at, profile_id, task_count, file_size_kb, is_encrypted, status)
                VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?, ?)
              `).run(
                log.filename || 'imported_backup.json',
                log.path || '',
                log.exported_at || null,
                mappedProfileId,
                Number.isFinite(log.task_count) ? log.task_count : 0,
                Number.isFinite(log.file_size_kb) ? log.file_size_kb : 0,
                log.is_encrypted ? 1 : 0,
                log.status || 'success'
              );
            }
          }

          // Merge appointments
          const appointmentMap = new Map();
          for (const a of (backupData.appointments || [])) {
            const existing = db.prepare("SELECT id, updated_at FROM appointments WHERE profile_id = ? AND title = ? AND start_time = ? AND end_time = ?").get(targetProfileId, a.title, a.start_time, a.end_time) as any;

            if (existing) {
              appointmentMap.set(a.id, existing.id);
              const backupUpdated = new Date(a.updated_at || a.created_at || 0).getTime();
              const existingUpdated = new Date(existing.updated_at || 0).getTime();

              if (backupUpdated > existingUpdated) {
                db.prepare(`
                  UPDATE appointments
                  SET description = ?, location = ?, affaire_id = ?, video_call_link = ?, image_data = ?, recurrence_type = ?, recurrence_end_date = ?, updated_at = ?
                  WHERE id = ?
                `).run(
                  a.description,
                  a.location,
                  affaireMap.get(a.affaire_id) || null,
                  a.video_call_link,
                  a.image_data || null,
                  a.recurrence_type || null,
                  a.recurrence_end_date || null,
                  a.updated_at || a.created_at,
                  existing.id
                );
              }
            } else {
              const info = db.prepare(`
                INSERT INTO appointments (profile_id, title, description, location, start_time, end_time, affaire_id, video_call_link, image_data, recurrence_type, recurrence_end_date, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                targetProfileId,
                a.title,
                a.description,
                a.location,
                a.start_time,
                a.end_time,
                affaireMap.get(a.affaire_id) || null,
                a.video_call_link,
                a.image_data || null,
                a.recurrence_type || null,
                a.recurrence_end_date || null,
                a.created_at,
                a.updated_at || a.created_at
              );
              appointmentMap.set(a.id, info.lastInsertRowid);
            }
          }

          // Merge appointment participants
          for (const ap of (backupData.appointment_participants || [])) {
            if (!appointmentMap.has(ap.appointment_id)) continue;
            const mappedAppointmentId = appointmentMap.get(ap.appointment_id);
            const existing = db.prepare("SELECT id FROM appointment_participants WHERE appointment_id = ? AND first_name = ? AND last_name = ? AND email = ?").get(
              mappedAppointmentId,
              ap.first_name,
              ap.last_name,
              ap.email || null
            ) as any;

            if (!existing) {
              db.prepare("INSERT INTO appointment_participants (appointment_id, first_name, last_name, company_entity, phone, email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
                mappedAppointmentId,
                ap.first_name,
                ap.last_name,
                ap.company_entity,
                ap.phone,
                ap.email,
                ap.created_at
              );
            }
          }

          // Merge documents for tasks/subtasks
          restoreDocumentsWithMappings(taskMap, subtaskMap, true);

        } else if (mode === "profile") {
          // Import specific profiles
          const profileMap = new Map();
          const { noSuffix } = req.body;
          for (const p of (backupData.profiles || [])) {
            // Always create new profile to avoid conflicts
            const newName = noSuffix ? p.name : `${p.name} (Importé)`;
            const info = db.prepare("INSERT INTO profiles (name, avatar, color_theme, app_background_theme, is_archived, logo, custom_background_image, font_family, text_color, custom_labels, pin_hash, xp, level, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
              newName,
              p.avatar,
              p.color_theme,
              p.app_background_theme || p.color_theme || 'theme-1',
              p.is_archived ? 1 : 0,
              p.logo || null,
              p.custom_background_image || null,
              p.font_family || 'system',
              p.text_color || '#000000',
              p.custom_labels || null,
              p.pin_hash || null,
              Number.isFinite(p.xp) ? p.xp : 0,
              Number.isFinite(p.level) ? p.level : 1,
              p.created_at
            );
            profileMap.set(p.id, info.lastInsertRowid);
          }

          // Insert categories
          const categoryMap = new Map();
          for (const c of (backupData.categories || [])) {
            if (profileMap.has(c.profile_id)) {
              const info = db.prepare("INSERT INTO categories (profile_id, name, color) VALUES (?, ?, ?)").run(
                profileMap.get(c.profile_id), c.name, c.color
              );
              categoryMap.set(c.id, info.lastInsertRowid);
            }
          }

          // Insert affaires
          const affaireMap = new Map();
          for (const a of (backupData.affaires || [])) {
            if (profileMap.has(a.profile_id)) {
              const info = db.prepare("INSERT INTO affaires (profile_id, number, name, color, status, image_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
                profileMap.get(a.profile_id), a.number, a.name, a.color, a.status, a.image_data || null, a.created_at
              );
              affaireMap.set(a.id, info.lastInsertRowid);
            }
          }

          // Insert tasks
          const taskMap = new Map();
          for (const t of (backupData.tasks || [])) {
            if (profileMap.has(t.profile_id)) {
              const info = db.prepare(`
                INSERT INTO tasks (profile_id, title, description_md, start_date, due_date, start_time, end_time, priority, category_id, affaire_id, is_complete, is_archived, is_deleted, bg_color, time_spent, subtasks_time_spent, focus_time_spent, validation_time_spent, recurrence, recurrence_type, recurrence_end_date, image_data, order_index, kanban_column, created_at, updated_at, completed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                profileMap.get(t.profile_id),
                t.title,
                t.description_md,
                t.start_date || null,
                t.due_date,
                t.start_time || null,
                t.end_time || null,
                t.priority,
                categoryMap.get(t.category_id) || null,
                affaireMap.get(t.affaire_id) || null,
                t.is_complete ? 1 : 0,
                t.is_archived ? 1 : 0,
                t.is_deleted ? 1 : 0,
                t.bg_color || null,
                Number.isFinite(t.time_spent) ? t.time_spent : 0,
                Number.isFinite(t.subtasks_time_spent) ? t.subtasks_time_spent : 0,
                Number.isFinite(t.focus_time_spent) ? t.focus_time_spent : 0,
                Number.isFinite(t.validation_time_spent) ? t.validation_time_spent : 0,
                t.recurrence || null,
                t.recurrence_type || null,
                t.recurrence_end_date || null,
                t.image_data || null,
                t.order_index,
                t.kanban_column,
                t.created_at,
                t.updated_at || t.created_at,
                t.completed_at
              );
              taskMap.set(t.id, info.lastInsertRowid);
            }
          }

          for (const msg of (backupData.chat_messages || [])) {
            const mappedSenderId = profileMap.get(msg.sender_profile_id);
            const mappedRecipientId = profileMap.get(msg.recipient_profile_id);
            if (!mappedSenderId || !mappedRecipientId) continue;
            db.prepare(`
              INSERT INTO chat_messages (sender_profile_id, recipient_profile_id, content, is_read, created_at)
              VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
            `).run(
              mappedSenderId,
              mappedRecipientId,
              msg.content || '',
              msg.is_read ? 1 : 0,
              msg.created_at || null
            );
          }

          for (const log of (backupData.backup_log || [])) {
            const mappedProfileId = log.profile_id != null ? profileMap.get(log.profile_id) ?? null : null;
            db.prepare(`
              INSERT INTO backup_log (filename, path, exported_at, profile_id, task_count, file_size_kb, is_encrypted, status)
              VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?, ?)
            `).run(
              log.filename || 'imported_backup.json',
              log.path || '',
              log.exported_at || null,
              mappedProfileId,
              Number.isFinite(log.task_count) ? log.task_count : 0,
              Number.isFinite(log.file_size_kb) ? log.file_size_kb : 0,
              log.is_encrypted ? 1 : 0,
              log.status || 'success'
            );
          }

          // Insert subtasks
          const subtaskMap = restoreSubtasksWithParents(backupData.subtasks || [], taskMap, 'insert');

          // Insert task assignees
          if (backupData.task_assignees && Array.isArray(backupData.task_assignees)) {
            for (const ta of backupData.task_assignees) {
              if (taskMap.has(ta.task_id)) {
                db.prepare("INSERT INTO task_assignees (task_id, assignee_name, assignee_avatar, created_at) VALUES (?, ?, ?, ?)").run(
                  taskMap.get(ta.task_id), ta.assignee_name, ta.assignee_avatar || '👤', ta.created_at
                );
              }
            }
          }

          // Insert pomodoro
          for (const p of (backupData.pomodoro || [])) {
            if (taskMap.has(p.task_id)) {
              db.prepare("INSERT INTO pomodoro (profile_id, task_id, duration_min, completed_at) VALUES (?, ?, ?, ?)").run(
                profileMap.get(p.profile_id), taskMap.get(p.task_id), p.duration_min, p.completed_at
              );
            }
          }

          // Insert appointments for imported profiles
          const appointmentMap = new Map();
          for (const a of (backupData.appointments || [])) {
            const mappedProfileId = profileMap.get(a.profile_id);
            if (!mappedProfileId) continue;

            const info = db.prepare(`
              INSERT INTO appointments (profile_id, title, description, location, start_time, end_time, affaire_id, video_call_link, image_data, recurrence_type, recurrence_end_date, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              mappedProfileId,
              a.title,
              a.description,
              a.location,
              a.start_time,
              a.end_time,
              affaireMap.get(a.affaire_id) || null,
              a.video_call_link,
              a.image_data || null,
              a.recurrence_type || null,
              a.recurrence_end_date || null,
              a.created_at,
              a.updated_at || a.created_at
            );
            appointmentMap.set(a.id, info.lastInsertRowid);
          }

          // Insert appointment participants for imported profiles
          for (const ap of (backupData.appointment_participants || [])) {
            if (!appointmentMap.has(ap.appointment_id)) continue;
            db.prepare("INSERT INTO appointment_participants (appointment_id, first_name, last_name, company_entity, phone, email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
              appointmentMap.get(ap.appointment_id),
              ap.first_name,
              ap.last_name,
              ap.company_entity,
              ap.phone,
              ap.email,
              ap.created_at
            );
          }

          // Insert documents for imported profiles
          restoreDocumentsWithMappings(taskMap, subtaskMap, false);
        }
      })();

      res.json({ 
        success: true, 
        message: "Restauration terminée", 
        taskCount: backupData.tasks.length,
        comments: backupData.comments || {},
        settings: backupData.settings || {}
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Appointments
  app.get("/api/appointments/:profileId", (req, res) => {
    const appointments = db.prepare(`
      SELECT a.*, aff.name as affaire_name, aff.color as affaire_color 
      FROM appointments a
      LEFT JOIN affaires aff ON a.affaire_id = aff.id
      WHERE a.profile_id = ?
      ORDER BY a.start_time DESC
    `).all(req.params.profileId) as any[];
    
    const result = appointments.map(apt => ({
      ...apt,
      participants: db.prepare("SELECT * FROM appointment_participants WHERE appointment_id = ?").all(apt.id) as any[]
    }));
    res.json(result);
  });

  app.post("/api/appointments", (req, res) => {
    try {
      const { profile_id, title, description, location, image_data, start_time, end_time, affaire_id, video_call_link, recurrence_type, recurrence_end_date, participants } = req.body;
      const rawImageData = image_data ?? req.body?.imageData ?? req.body?.image ?? null;
      const normalizedImageData = typeof rawImageData === 'string' && rawImageData.trim().length > 0
        ? rawImageData
        : null;

      if (!profile_id || !title || !start_time || !end_time) {
        return res.status(400).json({ error: "Missing required fields (profile_id, title, start_time, end_time)" });
      }

      const normalizedParticipants = Array.isArray(participants)
        ? participants.map((p: any) => ({
            first_name: (p?.first_name ?? '').toString().trim(),
            last_name: (p?.last_name ?? '').toString().trim(),
            company_entity: (p?.company_entity ?? '').toString().trim(),
            phone: (p?.phone ?? '').toString().trim(),
            email: (p?.email ?? '').toString().trim(),
          }))
          .filter((p: any) => p.first_name || p.last_name || p.email || p.phone || p.company_entity)
        : [];

      const stmt = db.prepare(`
        INSERT INTO appointments (profile_id, title, description, location, image_data, start_time, end_time, affaire_id, video_call_link, recurrence_type, recurrence_end_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        profile_id,
        title,
        description,
        location,
        normalizedImageData,
        start_time,
        end_time,
        affaire_id || null,
        video_call_link || null,
        recurrence_type || null,
        recurrence_end_date || null
      );
      const appointmentId = info.lastInsertRowid;

      if (normalizedParticipants.length > 0) {
        const participantStmt = db.prepare(`
          INSERT INTO appointment_participants (appointment_id, first_name, last_name, company_entity, phone, email)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const p of normalizedParticipants) {
          participantStmt.run(
            appointmentId,
            p.first_name || '',
            p.last_name || '',
            p.company_entity || '',
            p.phone || '',
            p.email || ''
          );
        }
      }

      res.json({ id: appointmentId, success: true });
    } catch (error: any) {
      console.error('❌ POST /api/appointments error:', error);
      res.status(500).json({ error: error?.message || 'Failed to save appointment' });
    }
  });

  app.put("/api/appointments/:id", (req, res) => {
    try {
      const { title, description, location, image_data, start_time, end_time, affaire_id, video_call_link, recurrence_type, recurrence_end_date, participants } = req.body;
      const rawImageData = image_data ?? req.body?.imageData ?? req.body?.image ?? null;
      const normalizedImageData = typeof rawImageData === 'string' && rawImageData.trim().length > 0
        ? rawImageData
        : null;

      if (!title || !start_time || !end_time) {
        return res.status(400).json({ error: "Missing required fields (title, start_time, end_time)" });
      }

      db.prepare(`
        UPDATE appointments 
        SET title = ?, description = ?, location = ?, image_data = ?, start_time = ?, end_time = ?, affaire_id = ?, video_call_link = ?, recurrence_type = ?, recurrence_end_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(title, description, location, normalizedImageData, start_time, end_time, affaire_id || null, video_call_link || null, recurrence_type || null, recurrence_end_date || null, req.params.id);

      db.prepare("DELETE FROM appointment_participants WHERE appointment_id = ?").run(req.params.id);

      const normalizedParticipants = Array.isArray(participants)
        ? participants.map((p: any) => ({
            first_name: (p?.first_name ?? '').toString().trim(),
            last_name: (p?.last_name ?? '').toString().trim(),
            company_entity: (p?.company_entity ?? '').toString().trim(),
            phone: (p?.phone ?? '').toString().trim(),
            email: (p?.email ?? '').toString().trim(),
          }))
          .filter((p: any) => p.first_name || p.last_name || p.email || p.phone || p.company_entity)
        : [];

      if (normalizedParticipants.length > 0) {
        const participantStmt = db.prepare(`
          INSERT INTO appointment_participants (appointment_id, first_name, last_name, company_entity, phone, email)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const p of normalizedParticipants) {
          participantStmt.run(
            req.params.id,
            p.first_name || '',
            p.last_name || '',
            p.company_entity || '',
            p.phone || '',
            p.email || ''
          );
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ PUT /api/appointments/:id error:', error);
      res.status(500).json({ error: error?.message || 'Failed to update appointment' });
    }
  });

  app.delete("/api/appointments/:id", (req, res) => {
    db.prepare("DELETE FROM appointments WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();