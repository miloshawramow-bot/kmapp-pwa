// One-time init endpoint to create D1 tables
export async function onRequestPost({ env }) {
  if (!env.DB) {
    return new Response(JSON.stringify({ success: false, error: 'D1 not bound' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const statements = [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, displayName TEXT, role TEXT DEFAULT 'user', created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now')));`,
    `CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), sender TEXT NOT NULL, senderName TEXT, recipient TEXT NOT NULL, recipientName TEXT, text TEXT, read INTEGER DEFAULT 0, created_date TEXT DEFAULT (datetime('now')));`,
    `CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient, read);`,
    `CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);`,
    `CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_date);`,
    `CREATE TABLE IF NOT EXISTS pelceri (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), kategorija TEXT, naziv TEXT, tekst TEXT, created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now')));`,
    `CREATE TABLE IF NOT EXISTS akti (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), tip TEXT, naziv TEXT, broj TEXT, sadrzaj TEXT, created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now')));`,
    `CREATE TABLE IF NOT EXISTS login_logs (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), username TEXT NOT NULL, device TEXT, created_date TEXT DEFAULT (datetime('now')));`,
    `CREATE TABLE IF NOT EXISTS push_subscriptions (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), username TEXT NOT NULL, endpoint TEXT, keys_auth TEXT, keys_p256dh TEXT, subscription TEXT, lastNotifiedDate TEXT, created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now')));`
  ];

  const results = [];
  for (const sql of statements) {
    try {
      await env.DB.prepare(sql).run();
      results.push({ ok: true, sql: sql.substring(0, 50) });
    } catch (e) {
      results.push({ ok: false, error: e.message, sql: sql.substring(0, 50) });
    }
  }

  const allOk = results.every(r => r.ok);
  return new Response(JSON.stringify({ success: allOk, results }), {
    status: allOk ? 200 : 500,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

export async function onRequestGet({ env }) {
  return onRequestPost({ env });
}
