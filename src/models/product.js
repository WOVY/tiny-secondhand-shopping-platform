const db = require('../config/db');

function list({ q, minPrice, maxPrice } = {}) {
  let sql = `
    SELECT products.*, users.username AS seller_username
    FROM products
    JOIN users ON users.id = products.seller_id
    WHERE products.status = 'active'
  `;
  const params = [];

  if (q) {
    sql += ' AND (products.title LIKE ? OR products.description LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like);
  }
  if (minPrice !== undefined) {
    sql += ' AND products.price >= ?';
    params.push(minPrice);
  }
  if (maxPrice !== undefined) {
    sql += ' AND products.price <= ?';
    params.push(maxPrice);
  }
  sql += ' ORDER BY products.created_at DESC';

  return db.prepare(sql).all(...params);
}

function findById(id) {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
}

function findDetailById(id) {
  return db
    .prepare(
      `SELECT products.*, users.username AS seller_username
       FROM products JOIN users ON users.id = products.seller_id
       WHERE products.id = ?`
    )
    .get(id);
}

function listBySeller(sellerId) {
  return db
    .prepare('SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC')
    .all(sellerId);
}

function create({ title, description, price, sellerId, imagePath }) {
  const result = db
    .prepare(
      'INSERT INTO products (title, description, price, seller_id, image_path) VALUES (?, ?, ?, ?, ?)'
    )
    .run(title, description, price, sellerId, imagePath || null);
  return findById(result.lastInsertRowid);
}

function update(id, { title, description, price, imagePath }) {
  if (imagePath) {
    db.prepare(
      'UPDATE products SET title = ?, description = ?, price = ?, image_path = ? WHERE id = ?'
    ).run(title, description, price, imagePath, id);
  } else {
    db.prepare('UPDATE products SET title = ?, description = ?, price = ? WHERE id = ?').run(
      title,
      description,
      price,
      id
    );
  }
}

function remove(id) {
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
}

function updateStatus(id, status) {
  db.prepare('UPDATE products SET status = ? WHERE id = ?').run(status, id);
}

module.exports = {
  list,
  findById,
  findDetailById,
  listBySeller,
  create,
  update,
  remove,
  updateStatus,
};
