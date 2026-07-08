(function () {
  var socket = io();
  var messagesEl = document.getElementById('messages');
  var form = document.getElementById('chat-form');
  var input = document.getElementById('chat-input');

  function appendMessage(m) {
    var li = document.createElement('li');
    var strong = document.createElement('strong');
    strong.textContent = m.senderUsername + ': ';
    li.appendChild(strong);
    li.appendChild(document.createTextNode(m.content));
    messagesEl.appendChild(li);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  socket.on('chat:global:message', appendMessage);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var content = input.value.trim();
    if (!content) return;
    socket.emit('chat:global:message', content);
    input.value = '';
  });
})();
