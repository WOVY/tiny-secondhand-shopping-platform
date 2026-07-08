(function () {
  var socket = io();
  var otherUserId = Number(document.body.dataset.otherUserId);
  var messagesEl = document.getElementById('messages');
  var form = document.getElementById('chat-form');
  var input = document.getElementById('chat-input');

  socket.emit('chat:dm:join', otherUserId);

  function appendMessage(m) {
    var li = document.createElement('li');
    li.className = 'list-group-item';
    var strong = document.createElement('strong');
    strong.textContent = m.senderUsername + ': ';
    li.appendChild(strong);
    li.appendChild(document.createTextNode(m.content));
    messagesEl.appendChild(li);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  socket.on('chat:dm:message', appendMessage);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var content = input.value.trim();
    if (!content) return;
    socket.emit('chat:dm:message', { toUserId: otherUserId, content: content });
    input.value = '';
  });
})();
