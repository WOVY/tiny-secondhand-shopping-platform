function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  if (res.locals.currentUser && res.locals.currentUser.status === 'suspended') {
    return req.session.destroy(() => res.redirect('/login?suspended=1'));
  }

  next();
}

module.exports = { requireAuth };
