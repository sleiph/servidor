const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();

const DEFAULT_DECK = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '?', '☕'];

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/rooms', (req, res) => {
  const { roomName, organizerName, organizerToken } = req.body;
  
  if (organizerToken) {
    for (const [rId, rObj] of rooms.entries()) {
      if (rObj.organizerToken === organizerToken) {
        rooms.delete(rId);
      }
    }
  }

  const roomId = uuidv4().substring(0, 8);
  
  const newRoom = {
    id: roomId,
    name: roomName || 'Planning Poker Room',
    organizerName: organizerName || 'Organizer',
    organizerToken: organizerToken || null,
    cardDeck: [...DEFAULT_DECK],
    tasks: [],
    currentTaskId: null,
    votesRevealed: false,
    users: {},
    votes: {}
  };

  rooms.set(roomId, newRoom);
  res.json(newRoom);
});

app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', ({ roomId, userName, isOrganizer, organizerToken }) => {
    let room = rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        name: 'Planning Poker Room',
        organizerName: userName,
        organizerToken: organizerToken || null,
        cardDeck: [...DEFAULT_DECK],
        tasks: [],
        currentTaskId: null,
        votesRevealed: false,
        users: {},
        votes: {}
      };
      rooms.set(roomId, room);
    }

    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = userName;

    let userIsOrganizer = false;
    if (organizerToken && room.organizerToken && room.organizerToken === organizerToken) {
      userIsOrganizer = true;
    } else if (!room.organizerToken && (isOrganizer || Object.keys(room.users).length === 0)) {
      if (organizerToken) {
        room.organizerToken = organizerToken;
      }
      userIsOrganizer = true;
    } else {
      userIsOrganizer = isOrganizer && (!room.organizerToken || room.organizerToken === organizerToken);
    }

    room.users[socket.id] = {
      id: socket.id,
      name: userName,
      isOrganizer: userIsOrganizer
    };

    if (userIsOrganizer) {
      room.organizerName = userName;
    }

    io.to(roomId).emit('room-update', sanitizeRoom(room));
  });

  socket.on('update-settings', ({ roomId, cardDeck, roomName }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    if (cardDeck) room.cardDeck = cardDeck;
    if (roomName) room.name = roomName;

    io.to(roomId).emit('room-update', sanitizeRoom(room));
  });

  socket.on('add-task', ({ roomId, task }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const newTask = {
      id: uuidv4().substring(0, 6),
      title: task.title,
      description: task.description || '',
      status: 'pending',
      finalScore: null
    };

    room.tasks.push(newTask);
    
    if (!room.currentTaskId && room.tasks.length === 1) {
      room.currentTaskId = newTask.id;
      newTask.status = 'voting';
    }

    io.to(roomId).emit('room-update', sanitizeRoom(room));
  });

  socket.on('update-task', ({ roomId, taskId, task }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const t = room.tasks.find(x => x.id === taskId);
    if (t) {
      if (task.title !== undefined) t.title = task.title;
      if (task.description !== undefined) t.description = task.description;
      if (task.status !== undefined) t.status = task.status;
      if (task.finalScore !== undefined) t.finalScore = task.finalScore;
    }

    io.to(roomId).emit('room-update', sanitizeRoom(room));
  });

  socket.on('delete-task', ({ roomId, taskId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.tasks = room.tasks.filter(x => x.id !== taskId);
    if (room.currentTaskId === taskId) {
      room.currentTaskId = room.tasks.length > 0 ? room.tasks[0].id : null;
      room.votesRevealed = false;
    }
    if (room.votes[taskId]) {
      delete room.votes[taskId];
    }

    io.to(roomId).emit('room-update', sanitizeRoom(room));
  });

  socket.on('set-current-task', ({ roomId, taskId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.currentTaskId = taskId;
    room.votesRevealed = false;

    room.tasks.forEach(t => {
      if (t.id === taskId) {
        t.status = 'voting';
      }
    });

    io.to(roomId).emit('room-update', sanitizeRoom(room));
  });

  socket.on('cast-vote', ({ roomId, taskId, vote }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    if (!room.votes[taskId]) {
      room.votes[taskId] = {};
    }

    room.votes[taskId][socket.id] = vote;

    io.to(roomId).emit('room-update', sanitizeRoom(room));
  });

  socket.on('clear-vote', ({ roomId, taskId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    if (room.votes[taskId] && room.votes[taskId][socket.id] !== undefined) {
      delete room.votes[taskId][socket.id];
    }

    io.to(roomId).emit('room-update', sanitizeRoom(room));
  });

  socket.on('reveal-votes', ({ roomId, revealed }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.votesRevealed = revealed;

    io.to(roomId).emit('room-update', sanitizeRoom(room));
  });

  socket.on('set-final-score', ({ roomId, taskId, score }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const t = room.tasks.find(x => x.id === taskId);
    if (t) {
      t.finalScore = score;
      t.status = 'completed';
    }

    io.to(roomId).emit('room-update', sanitizeRoom(room));
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    const roomId = socket.roomId;
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      delete room.users[socket.id];
      io.to(roomId).emit('room-update', sanitizeRoom(room));
    }
  });
});

function sanitizeRoom(room) {
  const sanitizedVotes = {};
  
  for (const taskId in room.votes) {
    sanitizedVotes[taskId] = {};
    for (const socketId in room.votes[taskId]) {
      if (room.votesRevealed) {
        sanitizedVotes[taskId][socketId] = room.votes[taskId][socketId];
      } else {
        sanitizedVotes[taskId][socketId] = true;
      }
    }
  }

  return {
    ...room,
    votes: sanitizedVotes,
  };
}

const PORT = process.env.PLANNING_POKER_PORT || 4000;
server.listen(PORT, () => {
  console.log(`Planning Poker server running on port ${PORT}`);
});

module.exports = { server, io, rooms };
