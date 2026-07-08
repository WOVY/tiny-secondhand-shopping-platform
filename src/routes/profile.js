const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const userModel = require('../models/user');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', requireAuth, (req, res) => {
  res.render('profile', {
    errors: [],
    bioUpdated: req.query.bioUpdated === '1',
    passwordUpdated: req.query.passwordUpdated === '1',
  });
});

router.post(
  '/profile/bio',
  requireAuth,
  [body('bio').trim().isLength({ max: 500 }).withMessage('소개글은 500자 이하여야 합니다.')],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .render('profile', { errors: errors.array(), bioUpdated: false, passwordUpdated: false });
    }
    userModel.updateBio(req.session.userId, req.body.bio);
    res.redirect('/profile?bioUpdated=1');
  }
);

router.post(
  '/profile/password',
  requireAuth,
  [
    body('currentPassword').notEmpty().withMessage('현재 비밀번호를 입력하세요.'),
    body('newPassword')
      .isLength({ min: 8, max: 72 })
      .withMessage('새 비밀번호는 8~72자여야 합니다.'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .render('profile', { errors: errors.array(), bioUpdated: false, passwordUpdated: false });
    }

    const user = userModel.findById(req.session.userId);
    const ok = bcrypt.compareSync(req.body.currentPassword, user.password_hash);
    if (!ok) {
      return res.status(400).render('profile', {
        errors: [{ msg: '현재 비밀번호가 올바르지 않습니다.' }],
        bioUpdated: false,
        passwordUpdated: false,
      });
    }

    userModel.updatePassword(user.id, bcrypt.hashSync(req.body.newPassword, 12));
    res.redirect('/profile?passwordUpdated=1');
  }
);

module.exports = router;
