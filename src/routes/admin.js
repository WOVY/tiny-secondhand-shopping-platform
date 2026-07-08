const express = require('express');
const { requireAdmin } = require('../middleware/admin');
const userModel = require('../models/user');
const productModel = require('../models/product');
const reportModel = require('../models/report');

const router = express.Router();

router.get('/admin', requireAdmin, (req, res) => {
  res.render('admin/index');
});

router.get('/admin/users', requireAdmin, (req, res) => {
  res.render('admin/users', { users: userModel.listAll(), error: null });
});

router.post('/admin/users/:id/status', requireAdmin, (req, res) => {
  const target = userModel.findById(req.params.id);
  if (!target) return res.status(404).render('404');

  userModel.updateStatus(target.id, target.status === 'suspended' ? 'active' : 'suspended');
  res.redirect('/admin/users');
});

router.post('/admin/users/:id/delete', requireAdmin, (req, res) => {
  const target = userModel.findById(req.params.id);
  if (!target) return res.status(404).render('404');

  if (target.id === req.session.userId) {
    return res
      .status(400)
      .render('admin/users', { users: userModel.listAll(), error: '본인 계정은 삭제할 수 없습니다.' });
  }

  try {
    userModel.remove(target.id);
  } catch (err) {
    return res.status(400).render('admin/users', {
      users: userModel.listAll(),
      error: '연관된 상품/거래/메시지/신고 기록이 있어 삭제할 수 없습니다. 휴면 처리를 이용하세요.',
    });
  }
  res.redirect('/admin/users');
});

router.get('/admin/products', requireAdmin, (req, res) => {
  res.render('admin/products', { products: productModel.listAll() });
});

router.post('/admin/products/:id/status', requireAdmin, (req, res) => {
  const product = productModel.findById(req.params.id);
  if (!product) return res.status(404).render('404');

  productModel.updateStatus(product.id, product.status === 'blocked' ? 'active' : 'blocked');
  res.redirect('/admin/products');
});

router.post('/admin/products/:id/delete', requireAdmin, (req, res) => {
  const product = productModel.findById(req.params.id);
  if (!product) return res.status(404).render('404');

  productModel.remove(product.id);
  res.redirect('/admin/products');
});

router.get('/admin/reports', requireAdmin, (req, res) => {
  res.render('admin/reports', { reports: reportModel.listAll() });
});

router.post('/admin/reports/:id/resolve', requireAdmin, (req, res) => {
  reportModel.resolve(req.params.id);
  res.redirect('/admin/reports');
});

module.exports = router;
