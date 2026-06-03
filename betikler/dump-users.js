const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../veri/veritabani.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT id, name, email, role, status FROM users ORDER BY id", (err, rows) => {
  if (err) console.error(err);
  else console.log("Users:", rows);
  db.close();
});
