function roomKeyForUsers(idA, idB) {
  const [a, b] = [Number(idA), Number(idB)].sort((x, y) => x - y);
  return `dm:${a}:${b}`;
}

module.exports = { roomKeyForUsers };
