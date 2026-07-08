const db = require('../config/db');

function countForTarget(targetType, targetId) {
  return db
    .prepare('SELECT COUNT(*) AS count FROM reports WHERE target_type = ? AND target_id = ?')
    .get(targetType, targetId).count;
}

function hasReported(reporterId, targetType, targetId) {
  return Boolean(
    db
      .prepare(
        'SELECT 1 FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ?'
      )
      .get(reporterId, targetType, targetId)
  );
}

function create({ reporterId, targetType, targetId, reason }) {
  db.prepare(
    'INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?, ?, ?, ?)'
  ).run(reporterId, targetType, targetId, reason);
}

function listUnresolved() {
  return db.prepare('SELECT * FROM reports WHERE resolved = 0 ORDER BY created_at DESC').all();
}

function resolve(id) {
  db.prepare('UPDATE reports SET resolved = 1 WHERE id = ?').run(id);
}

module.exports = { countForTarget, hasReported, create, listUnresolved, resolve };
