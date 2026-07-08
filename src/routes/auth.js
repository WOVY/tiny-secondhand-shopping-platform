const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const userModel = require('../models/user');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.',
});

router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('register', { errors: [], values: {} });
});

router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('아이디는 3~20자여야 합니다.')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('아이디는 영문/숫자/밑줄만 사용할 수 있습니다.'),
    body('password')
      .isLength({ min: 8, max: 72 })
      .withMessage('비밀번호는 8~72자여야 합니다.'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .render('register', { errors: errors.array(), values: { username: req.body.username } });
    }

    const { username, password } = req.body;
    if (userModel.findByUsername(username)) {
      return res.status(400).render('register', {
        errors: [{ msg: '이미 사용 중인 아이디입니다.' }],
        values: { username },
      });
    }

    const passwordHash = bcrypt.hashSync(password, 12);
    const user = userModel.create({ username, passwordHash });

    req.session.regenerate((err) => {
      if (err) return res.status(500).render('500');
      req.session.userId = user.id;
      res.redirect('/');
    });
  }
);

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('login', { errors: [], values: {}, suspended: req.query.suspended === '1' });
});

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  const user = username ? userModel.findByUsername(username) : null;
  const passwordOk = user && bcrypt.compareSync(password || '', user.password_hash);

  if (!passwordOk) {
    return res.status(400).render('login', {
      errors: [{ msg: '아이디 또는 비밀번호가 올바르지 않습니다.' }],
      values: { username },
      suspended: false,
    });
  }

  if (user.status === 'suspended') {
    return res.status(403).render('login', {
      errors: [{ msg: '휴면 처리된 계정입니다. 관리자에게 문의하세요.' }],
      values: { username },
      suspended: false,
    });
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).render('500');
    req.session.userId = user.id;
    res.redirect('/');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
