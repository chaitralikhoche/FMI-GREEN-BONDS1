const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Broadcast when a new player joins
  socket.broadcast.emit('userJoined', socket.id);

  // Listen for game events from clients
  socket.on('playerMove', (data) => {
    // Broadcast to all other players
    socket.broadcast.emit('playerMove', data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    io.emit('userLeft', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
