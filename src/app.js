const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { doubleCsrf } = require('csrf-csrf');

const config = require('./config/env');
const userModel = require('./models/user');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(helmet());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(cookieParser());
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    // CSRF 토큰이 세션 id에 묶이므로, 세션 쿠키가 로그인 전에도 발급되어야 함
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProduction,
    },
  })
);

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => config.sessionSecret,
  getSessionIdentifier: (req) => req.session.id,
  cookieName: 'csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: config.isProduction,
    httpOnly: true,
  },
  getCsrfTokenFromRequest: (req) => req.body._csrf,
});

app.use(doubleCsrfProtection);
app.use((req, res, next) => {
  res.locals.csrfToken = generateCsrfToken(req, res);
  next();
});

app.use((req, res, next) => {
  res.locals.currentUser = req.session.userId
    ? userModel.findById(req.session.userId) || null
    : null;
  next();
});

app.use(require('./routes/auth'));
app.use(require('./routes/profile'));

app.get('/', (req, res) => {
  res.render('index');
});

app.use((req, res) => {
  res.status(404).render('404');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.code === 'EBADCSRFTOKEN') {
    return res.status(403).render('403');
  }
  console.error(err);
  res.status(500).render('500');
});

module.exports = app;
