const socket = io(); // No room code needed

console.log('Connected to server');

// Example: Notify when a new player joins
socket.on('userJoined', (id) => {
  console.log('New player joined:', id);
});

// Example: Notify when a player leaves
socket.on('userLeft', (id) => {
  console.log('Player left:', id);
});

// Example: Send a move (replace with your game logic)
function sendMove(move) {
  socket.emit('playerMove', move);
}

// Example: Listen to moves from others
socket.on('playerMove', (move) => {
  console.log('Player move received:', move);
});
