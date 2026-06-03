"use strict";

require('dotenv').config();
const { Pool } = require('pg');
const crypto = require("crypto");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL environmental variable is missing in .env!");
  process.exit(1);
}

console.log("🔌 Connecting to Supabase (PostgreSQL)...");

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

// A query queue to simulate SQLite's single-threaded query execution order
let queryQueue = Promise.resolve();

function convertSql(sql) {
  let converted = sql;

  // 1. Convert INSERT OR IGNORE to Postgres ON CONFLICT DO NOTHING
  if (converted.toUpperCase().includes('INSERT OR IGNORE')) {
    if (converted.toLowerCase().includes('system_settings')) {
      converted = converted.replace(/INSERT OR IGNORE/i, 'INSERT') + ' ON CONFLICT (key) DO NOTHING';
    } else if (converted.toLowerCase().includes('users')) {
      converted = converted.replace(/INSERT OR IGNORE/i, 'INSERT') + ' ON CONFLICT (email) DO NOTHING';
    } else if (converted.toLowerCase().includes('holidays')) {
      converted = converted.replace(/INSERT OR IGNORE/i, 'INSERT') + ' ON CONFLICT (date) DO NOTHING';
    } else if (converted.toLowerCase().includes('announcement_reads')) {
      converted = converted.replace(/INSERT OR IGNORE/i, 'INSERT') + ' ON CONFLICT (announcement_id, user_id) DO NOTHING';
    } else {
      converted = converted.replace(/INSERT OR IGNORE/i, 'INSERT') + ' ON CONFLICT DO NOTHING';
    }
  }

  // 2. Convert SQLite ? parameters to PostgreSQL $1, $2, $3...
  let index = 1;
  converted = converted.replace(/\?/g, () => `$${index++}`);

  return converted;
}

const db = {
  serialize(callback) {
    // SQLite serialize just queues calls; for PG we call the callback immediately since we queue at the query level
    if (callback) callback();
  },

  run(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    const convertedSql = convertSql(sql);
    const isInsert = convertedSql.trim().toUpperCase().startsWith('INSERT');
    const tableWithNoId = ['holidays', 'system_settings'];
    const hasNoId = tableWithNoId.some(t => convertedSql.toLowerCase().includes(t));
    
    let finalSql = convertedSql;
    if (isInsert && !hasNoId && !convertedSql.toUpperCase().includes('RETURNING')) {
      finalSql += ' RETURNING id';
    }

    pool.query(finalSql, params || [], (err, result) => {
      if (err) {
        console.error("❌ SQL execution error:", err.message, "\nSQL:", finalSql);
        if (callback) callback(err);
        return;
      }

      const context = {
        lastID: isInsert && result.rows && result.rows[0] ? result.rows[0].id : null,
        changes: result.rowCount
      };

      if (callback) {
        callback.call(context, null);
      }
    });
  },

  get(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    const convertedSql = convertSql(sql);

    pool.query(convertedSql, params || [], (err, result) => {
      if (err) {
        console.error("❌ SQL get error:", err.message, "\nSQL:", convertedSql);
        if (callback) callback(err);
        return;
      }

      if (callback) {
        callback(null, result.rows[0] || null);
      }
    });
  },

  all(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    const convertedSql = convertSql(sql);

    pool.query(convertedSql, params || [], (err, result) => {
      if (err) {
        console.error("❌ SQL all error:", err.message, "\nSQL:", convertedSql);
        if (callback) callback(err);
        return;
      }

      if (callback) {
        callback(null, result.rows || []);
      }
    });
  },

  // Helper helper to support promise chain migrations
  runPromise(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
};

// Seeding and utility functions
function veritabaniniBaslat() {
  db.serialize(async () => {
    try {
      // 1. Birimler (Departments)
      await db.runPromise(`
        CREATE TABLE IF NOT EXISTS departments (
          id               SERIAL PRIMARY KEY,
          name             TEXT NOT NULL,
          open_time        TEXT NOT NULL,
          close_time       TEXT NOT NULL,
          student_capacity INTEGER DEFAULT 10,
          location         TEXT,
          is_active        SMALLINT DEFAULT 1,
          created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Kullanıcılar (Users)
      await db.runPromise(`
        CREATE TABLE IF NOT EXISTS users (
          id                      SERIAL PRIMARY KEY,
          name                    TEXT,
          email                   TEXT UNIQUE NOT NULL,
          password                TEXT NOT NULL,
          role                    TEXT NOT NULL CHECK(role IN ('manager', 'student', 'super_admin')),
          dept_id                 INTEGER,
          program_duration_months INTEGER,
          is_terminated           SMALLINT DEFAULT 0,
          tc_kimlik               TEXT UNIQUE,
          iban                    TEXT,
          phone                   TEXT,
          status                  TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'assigned', 'approved', 'rejected', 'revision_required', 'permanently_rejected')),
          documents               TEXT,
          preferred_days          TEXT,
          preferred_dept_id       INTEGER,
          rejection_reason        TEXT,
          course_schedule_matrix  TEXT,
          last_login_at           TIMESTAMP,
          failed_login_attempts   INTEGER DEFAULT 0,
          locked_until            TIMESTAMP,
          created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE SET NULL
        )
      `);

      // 3. Sistem Ayarları (System Settings)
      await db.runPromise(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key   TEXT PRIMARY KEY,
          value TEXT
        )
      `);
      await db.runPromise(`INSERT INTO system_settings (key, value) VALUES ('daily_wage', '1375') ON CONFLICT (key) DO NOTHING`);

      // 4. Çalışma Planları (Fixed Plan)
      await db.runPromise(`
        CREATE TABLE IF NOT EXISTS fixed_plan (
          id                   SERIAL PRIMARY KEY,
          user_id              INTEGER NOT NULL,
          dept_id              INTEGER NOT NULL,
          day                  TEXT NOT NULL,
          hours                TEXT NOT NULL,
          status               TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
          course_schedule_file TEXT,
          created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE CASCADE
        )
      `);

      // 5. Devamsızlık ve Katılım (Attendance)
      await db.runPromise(`
        CREATE TABLE IF NOT EXISTS attendance (
          id         SERIAL PRIMARY KEY,
          user_id    INTEGER NOT NULL,
          date       TEXT NOT NULL,
          check_in   TEXT,
          check_out  TEXT,
          status     TEXT,
          type       TEXT,
          note       TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user_id, date)
        )
      `);

      // 6. Görevler (Tasks)
      await db.runPromise(`
        CREATE TABLE IF NOT EXISTS tasks (
          id                SERIAL PRIMARY KEY,
          dept_id           INTEGER NOT NULL,
          created_by        INTEGER NOT NULL,
          assigned_to       INTEGER,
          title             TEXT NOT NULL,
          description       TEXT,
          category          TEXT NOT NULL,
          deadline          TIMESTAMP,
          status            TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'submitted', 'approved', 'rejected')),
          priority          TEXT DEFAULT 'normal',
          is_archived       SMALLINT DEFAULT 0,
          completion_note   TEXT,
          performance_score INTEGER CHECK(performance_score >= 1 AND performance_score <= 5),
          manager_feedback  TEXT,
          created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (dept_id)    REFERENCES departments(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      // 7. Tatiller (Holidays)
      await db.runPromise(`
        CREATE TABLE IF NOT EXISTS holidays (
          date        TEXT PRIMARY KEY,
          description TEXT NOT NULL,
          is_fixed    SMALLINT DEFAULT 0
        )
      `);

      // 8. Duyurular (Announcements)
      await db.runPromise(`
        CREATE TABLE IF NOT EXISTS announcements (
          id         SERIAL PRIMARY KEY,
          dept_id    INTEGER,
          created_by INTEGER NOT NULL,
          title      TEXT NOT NULL,
          content    TEXT NOT NULL,
          priority   TEXT DEFAULT 'normal' CHECK(priority IN ('normal', 'high', 'critical', 'urgent')),
          expires_at TEXT,
          is_pinned  SMALLINT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (dept_id)    REFERENCES departments(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // 9. Diğer Destek Tabloları
      await db.runPromise(`CREATE TABLE IF NOT EXISTS announcement_reads ( id SERIAL PRIMARY KEY, announcement_id INTEGER NOT NULL, user_id INTEGER NOT NULL, read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, UNIQUE (announcement_id, user_id) )`);
      await db.runPromise(`CREATE TABLE IF NOT EXISTS leave_requests ( id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, dept_id INTEGER NOT NULL, type TEXT NOT NULL CHECK(type IN ('sick', 'personal', 'emergency', 'other')), start_date DATE NOT NULL, end_date DATE NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')), reviewed_by INTEGER, review_note TEXT, reviewed_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE CASCADE, FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL )`);
      await db.runPromise(`CREATE TABLE IF NOT EXISTS notifications ( id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT, entity_type TEXT, entity_id INTEGER, is_read SMALLINT NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE )`);
      await db.runPromise(`CREATE TABLE IF NOT EXISTS audit_logs ( id SERIAL PRIMARY KEY, user_id INTEGER, action TEXT NOT NULL, entity_type TEXT, entity_id INTEGER, old_value TEXT, new_value TEXT, ip_address TEXT, user_agent TEXT, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL )`);

      // Create indexes and trigger helpers
      await indeksleriVeTetikleyicileriOlustur();

      // Seed default static values
      await tatilleriTohumla();
      await sistemYoneticisiTohumla();

      console.log("✅ Supabase PostgreSQL schema and seeds are ready.");
    } catch (err) {
      console.error("❌ Database initialization failed:", err.message);
    }
  });
}

async function indeksleriVeTetikleyicileriOlustur() {
  const indexes = [
    "idx_users_dept ON users(dept_id)",
    "idx_users_role ON users(role)",
    "idx_att_date ON attendance(date)",
    "idx_att_user ON attendance(user_id)",
    "idx_tasks_status ON tasks(status)",
    "idx_tasks_assigned ON tasks(assigned_to)",
    "idx_tasks_creator ON tasks(created_by)",
    "idx_notif_user_read ON notifications(user_id, is_read)"
  ];
  
  for (const idx of indexes) {
    await db.runPromise(`CREATE INDEX IF NOT EXISTS ${idx}`);
  }

  // Create PostgreSQL Trigger Function for auto-updating updated_at
  await db.runPromise(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
       NEW.updated_at = CURRENT_TIMESTAMP;
       RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  const tables = ["departments", "users", "attendance", "tasks", "announcements", "fixed_plan"];
  for (const tablo of tables) {
    await db.runPromise(`DROP TRIGGER IF EXISTS trg_${tablo}_updated_at ON ${tablo}`);
    await db.runPromise(`
      CREATE TRIGGER trg_${tablo}_updated_at
      BEFORE UPDATE ON ${tablo}
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
  }
}

async function tatilleriTohumla() {
  const sabitTatiller = [
    { d: '01-01', desc: 'Yılbaşı' },
    { d: '04-23', desc: 'Ulusal Egemenlik ve Çocuk Bayramı' },
    { d: '05-01', desc: 'Emek ve Dayanışma Günü' },
    { d: '05-19', desc: 'Atatürk’ü Anma, Gençlik ve Spor Bayramı' },
    { d: '07-15', desc: '15 Temmuz Demokrasi ve Milli Birlik Günü' },
    { d: '08-30', desc: 'Zafer Bayramı' },
    { d: '10-29', desc: 'Cumhuriyet Bayramı' }
  ];
  const currentYear = new Date().getFullYear();
  for (const t of sabitTatiller) {
    const fullDate = `${currentYear}-${t.d}`;
    await db.runPromise("INSERT INTO holidays (date, description, is_fixed) VALUES ($1, $2, 1) ON CONFLICT (date) DO NOTHING", [fullDate, t.desc]);
  }
}

async function sistemYoneticisiTohumla() {
  await db.runPromise(
    "INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING",
    ['Sistem Yöneticisi', 'superadmin@deu.edu.tr', 'superadmin123', 'super_admin', 'approved']
  );
  await db.runPromise(
    "INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING",
    ['Sistem Yöneticisi (Ogr)', 'superadmin@ogr.deu.edu.tr', 'superadmin123', 'super_admin', 'approved']
  );
}

// Utility methods
db.guvenliOtpUret = (uzunluk = 6) => {
  const rakamlar = "0123456789";
  const baytlar = crypto.randomBytes(uzunluk);
  return Array.from(baytlar).map((b) => rakamlar[b % rakamlar.length]).join("");
};

db.sifreHashle = (sifre, salt = null) => {
  const kullanilanSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHmac("sha256", kullanilanSalt).update(sifre).digest("hex");
  return { hash, salt: kullanilanSalt };
};

// Initialize schema on load
veritabaniniBaslat();

module.exports = db;
