const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../veri/veritabani.sqlite');
const db = new sqlite3.Database(dbPath);

const tables = [
  'departments',
  'users',
  'fixed_plan',
  'attendance',
  'tasks',
  'holidays',
  'announcements',
  'announcement_reads',
  'leave_requests',
  'notifications',
  'audit_logs'
];

db.serialize(() => {
  tables.forEach(table => {
    db.get(`SELECT COUNT(*) AS count FROM ${table}`, (err, row) => {
      if (err) {
        console.error(`Error counting ${table}:`, err.message);
      } else {
        console.log(`Table: ${table} - Count: ${row.count}`);
      }
    });
  });
});

db.close();
