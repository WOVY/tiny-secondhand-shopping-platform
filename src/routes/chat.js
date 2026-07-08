const express = require('express');
const userModel = require('../models/user');
const messageModel = require('../models/message');
const { requireAuth } = require('../middleware/auth');
const { roomKeyForUsers } = require('../utils/chatRoom');

const router = express.Router();

router.get('/chat', requireAuth, (req, res) => {
  const messages = messageModel.listByRoom('global');
  res.render('chat/global', { messages });
});

router.get('/chat/:userId', requireAuth, (req, res) => {
  const otherId = Number(req.params.userId);
  if (!otherId || otherId === req.session.userId) return res.status(404).render('404');

  const otherUser = userModel.findById(otherId);
  if (!otherUser) return res.status(404).render('404');

  const messages = messageModel.listByRoom(roomKeyForUsers(req.session.userId, otherId));
  res.render('chat/dm', { messages, otherUser });
});

module.exports = router;
