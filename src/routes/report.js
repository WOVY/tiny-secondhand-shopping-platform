const express = require('express');
const { body, validationResult } = require('express-validator');
const reportModel = require('../models/report');
const userModel = require('../models/user');
const productModel = require('../models/product');
const { requireAuth } = require('../middleware/auth');
const { PRODUCT_REPORT_THRESHOLD, USER_REPORT_THRESHOLD } = require('../config/constants');

const router = express.Router();

function targetExists(targetType, targetId) {
  if (targetType === 'product') return Boolean(productModel.findById(targetId));
  if (targetType === 'user') return Boolean(userModel.findById(targetId));
  return false;
}

router.get('/report', requireAuth, (req, res) => {
  const targetType = req.query.type;
  const targetId = Number(req.query.id);

  if (!['user', 'product'].includes(targetType) || !targetId || !targetExists(targetType, targetId)) {
    return res.status(404).render('404');
  }

  res.render('report', { errors: [], targetType, targetId });
});

router.post(
  '/report',
  requireAuth,
  [
    body('targetType').isIn(['user', 'product']).withMessage('신고 대상 종류가 올바르지 않습니다.'),
    body('targetId').isInt({ min: 1 }).toInt().withMessage('신고 대상이 올바르지 않습니다.'),
    body('reason')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('신고 사유를 입력하세요 (500자 이하).'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    const { targetType, targetId, reason } = req.body;

    if (!errors.isEmpty() || !targetExists(targetType, targetId)) {
      return res.status(400).render('report', {
        errors: errors.isEmpty() ? [{ msg: '신고 대상을 찾을 수 없습니다.' }] : errors.array(),
        targetType,
        targetId,
      });
    }

    if (targetType === 'user' && targetId === req.session.userId) {
      return res
        .status(400)
        .render('report', { errors: [{ msg: '자기 자신은 신고할 수 없습니다.' }], targetType, targetId });
    }
    if (targetType === 'product') {
      const product = productModel.findById(targetId);
      if (product.seller_id === req.session.userId) {
        return res
          .status(400)
          .render('report', { errors: [{ msg: '본인 상품은 신고할 수 없습니다.' }], targetType, targetId });
      }
    }

    if (reportModel.hasReported(req.session.userId, targetType, targetId)) {
      return res
        .status(400)
        .render('report', { errors: [{ msg: '이미 신고한 대상입니다.' }], targetType, targetId });
    }

    try {
      reportModel.create({ reporterId: req.session.userId, targetType, targetId, reason });
    } catch (err) {
      // reports 테이블의 UNIQUE 제약(reporter_id, target_type, target_id)이
      // 동시 요청 경합 상황에서의 중복 신고를 최종 방어선으로 막아준다.
      if (/UNIQUE/.test(err.message)) {
        return res
          .status(400)
          .render('report', { errors: [{ msg: '이미 신고한 대상입니다.' }], targetType, targetId });
      }
      throw err;
    }

    const count = reportModel.countForTarget(targetType, targetId);
    if (targetType === 'product' && count >= PRODUCT_REPORT_THRESHOLD) {
      productModel.updateStatus(targetId, 'blocked');
    }
    if (targetType === 'user' && count >= USER_REPORT_THRESHOLD) {
      userModel.updateStatus(targetId, 'suspended');
    }

    res.render('report_done');
  }
);

module.exports = router;
