const express = require('express');
const { body, query, validationResult } = require('express-validator');
const productModel = require('../models/product');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const productValidators = [
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('제목은 1~100자여야 합니다.'),
  body('description')
    .trim()
    .isLength({ max: 2000 })
    .withMessage('설명은 2000자 이하여야 합니다.'),
  body('price')
    .isInt({ min: 0, max: 100000000 })
    .withMessage('가격은 0 이상 정수여야 합니다.')
    .toInt(),
];

function collectErrors(req) {
  const errors = validationResult(req).array();
  if (req.uploadError) errors.push({ msg: req.uploadError });
  return errors;
}

router.get(
  '/products',
  [
    query('minPrice').optional({ values: 'falsy' }).isInt({ min: 0 }).toInt(),
    query('maxPrice').optional({ values: 'falsy' }).isInt({ min: 0 }).toInt(),
  ],
  (req, res) => {
    const invalidFields = new Set(validationResult(req).array().map((e) => e.path));
    const q = (req.query.q || '').toString().slice(0, 100);
    // 검색폼은 항상 minPrice/maxPrice 필드를 함께 제출하므로, 값이 빈 문자열("")인
    // 경우가 흔하다. 이를 "필터 없음"이 아니라 그대로 SQL에 바인딩하면 better-sqlite3가
    // ''를 TEXT로 바인딩하고, SQLite 타입 정렬 규칙상 TEXT는 항상 INTEGER보다 크게
    // 취급되어 `price >= ''` 비교가 항상 거짓이 되는 문제가 있었다.
    const minPrice =
      !invalidFields.has('minPrice') && req.query.minPrice !== '' && req.query.minPrice !== undefined
        ? req.query.minPrice
        : undefined;
    const maxPrice =
      !invalidFields.has('maxPrice') && req.query.maxPrice !== '' && req.query.maxPrice !== undefined
        ? req.query.maxPrice
        : undefined;

    const products = productModel.list({ q, minPrice, maxPrice });
    res.render('products/index', {
      products,
      q,
      minPrice: req.query.minPrice || '',
      maxPrice: req.query.maxPrice || '',
    });
  }
);

router.get('/products/new', requireAuth, (req, res) => {
  res.render('products/new', { errors: [], values: {} });
});

router.post(
  '/products/new',
  requireAuth,
  productValidators,
  (req, res) => {
    const errors = collectErrors(req);
    if (errors.length) {
      return res.status(400).render('products/new', { errors, values: req.body });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const product = productModel.create({
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      sellerId: req.session.userId,
      imagePath,
    });
    res.redirect(`/products/${product.id}`);
  }
);

router.get('/products/mine', requireAuth, (req, res) => {
  const products = productModel.listBySeller(req.session.userId);
  res.render('products/mine', { products });
});

router.get('/products/:id', (req, res) => {
  const product = productModel.findDetailById(req.params.id);
  if (!product) return res.status(404).render('404');

  const isOwner = Boolean(res.locals.currentUser && res.locals.currentUser.id === product.seller_id);
  if (product.status === 'blocked' && !isOwner) {
    return res.status(404).render('404');
  }

  res.render('products/show', { product, isOwner });
});

router.get('/products/:id/edit', requireAuth, (req, res) => {
  const product = productModel.findById(req.params.id);
  if (!product) return res.status(404).render('404');
  if (product.seller_id !== req.session.userId) return res.status(403).render('403');

  res.render('products/edit', { errors: [], product });
});

router.post(
  '/products/:id/edit',
  requireAuth,
  productValidators,
  (req, res) => {
    const product = productModel.findById(req.params.id);
    if (!product) return res.status(404).render('404');
    if (product.seller_id !== req.session.userId) return res.status(403).render('403');

    const errors = collectErrors(req);
    if (errors.length) {
      return res
        .status(400)
        .render('products/edit', { errors, product: { ...product, ...req.body } });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : undefined;
    productModel.update(product.id, {
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      imagePath,
    });
    res.redirect(`/products/${product.id}`);
  }
);

router.post('/products/:id/delete', requireAuth, (req, res) => {
  const product = productModel.findById(req.params.id);
  if (!product) return res.status(404).render('404');
  if (product.seller_id !== req.session.userId) return res.status(403).render('403');

  productModel.remove(product.id);
  res.redirect('/products/mine');
});

module.exports = router;
