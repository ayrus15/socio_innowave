import Database from 'better-sqlite3';

const db = new Database('./data/socio-copy.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables in database:');
tables.forEach(t => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get();
  console.log(`  ${t.name}: ${count.count} rows`);
});

// Show sample data from each table
tables.forEach(t => {
  console.log(`\n--- ${t.name} ---`);
  const rows = db.prepare(`SELECT * FROM ${t.name} LIMIT 3`).all();
  console.log(JSON.stringify(rows, null, 2));
});

db.close();
