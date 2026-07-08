const express = require('express');
const { body, validationResult } = require('express-validator');
const userModel = require('../models/user');
const transactionModel = require('../models/transaction');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function renderForm(res, user, extra) {
  return res.render('transfer', {
    errors: [],
    values: {},
    success: false,
    balance: user.balance,
    transactions: transactionModel.listForUser(user.id),
    ...extra,
  });
}

router.get('/transfer', requireAuth, (req, res) => {
  const user = userModel.findById(req.session.userId);
  renderForm(res, user, { success: req.query.success === '1' });
});

router.post(
  '/transfer',
  requireAuth,
  [
    body('toUsername').trim().notEmpty().withMessage('받는 사람 아이디를 입력하세요.'),
    body('amount')
      .isInt({ min: 1, max: 100000000 })
      .withMessage('금액은 1 이상 정수여야 합니다.')
      .toInt(),
  ],
  (req, res) => {
    const user = userModel.findById(req.session.userId);
    const fail = (msg) => renderForm(res.status(400), user, { errors: [{ msg }], values: req.body });

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      return renderForm(res.status(400), user, { errors: validation.array(), values: req.body });
    }

    const recipient = userModel.findByUsername(req.body.toUsername);
    if (!recipient) return fail('받는 사람을 찾을 수 없습니다.');
    if (recipient.id === user.id) return fail('자기 자신에게는 송금할 수 없습니다.');
    if (recipient.status === 'suspended') return fail('휴면 계정에는 송금할 수 없습니다.');

    try {
      transactionModel.transfer({
        fromUserId: user.id,
        toUserId: recipient.id,
        amount: req.body.amount,
      });
    } catch (err) {
      if (err instanceof transactionModel.InsufficientBalanceError) {
        return fail('잔액이 부족합니다.');
      }
      throw err;
    }

    res.redirect('/transfer?success=1');
  }
);

module.exports = router;
