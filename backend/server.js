const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");

dotenv.config();

const authRoutes = require("./routes/authRoute");
const contactRoutes = require("./routes/contactRoute");
const messageRoutes = require("./routes/messageRoute");
const adminAuthRoutes = require("./routes/adminAuthRoute");
const User = require('./models/authModel');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "https://chat-app-bice-kappa-21.vercel.app"],
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: ["http://localhost:3000", "https://chat-app-bice-kappa-21.vercel.app"],
  credentials: true
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin-auth", adminAuthRoutes);

// In-memory push subscriptions (userId -> subscription)
const pushSubscriptions = new Map();

const axios = require('axios');

// Save OneSignal player ID for user
app.post('/api/save-onesignal-id', async (req, res) => {
  const { userId, playerId } = req.body;
  if (!userId || !playerId) return res.status(400).json({ error: 'Missing userId or playerId' });
  await User.updateOne({ _id: userId }, { $set: { oneSignalPlayerId: playerId } });
  res.json({ success: true });
});

// Socket.IO connection handling
const connectedUsers = new Map(); // userId -> socketId
// Track last seen for users
const userStatus = new Map(); // userId -> { online: boolean, lastSeen: number }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Authenticate user and store their socket connection
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;
      userStatus.set(userId, { online: true });
      // Broadcast to ALL users that this user is online
      io.emit('user_status', { userId, online: true });
      console.log(`User ${userId} authenticated and connected. Connected users:`, Array.from(connectedUsers.keys()));
    } catch (error) {
      console.error('Authentication failed:', error);
      socket.emit('auth_error', 'Authentication failed');
    }
  });

  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const { receiverId, content, type, fileName, fileSize } = data;
      
      // Save message to database
      const Message = require('./models/messageModel');
      const message = await Message.create({
        senderId: socket.userId,
        receiverId,
        content,
        type: type || 'text',
        fileName,
        fileSize
      });

      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'username')
        .populate('receiverId', 'username');

      // Send to receiver if online
      console.log('Connected users before message:', Array.from(connectedUsers.keys()));
      console.log('Checking if user', receiverId, 'is connected:', connectedUsers.has(receiverId));
      const receiverSocketId = connectedUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new_message', populatedMessage);
      } else {
        // User is offline, send push notification via OneSignal if playerId is set
        console.log('User', receiverId, 'is not connected. Attempting to send push notification via OneSignal.');
        const user = await User.findById(receiverId);
        const playerId = user?.oneSignalPlayerId;
        if (playerId) {
          try {
            await axios.post('https://onesignal.com/api/v1/notifications', {
              app_id: process.env.ONESIGNAL_APP_ID,
              include_player_ids: [playerId],
              headings: { en: populatedMessage.senderId.username + ' sent a message' },
              contents: { en: content },
              url: '/chat',
            }, {
              headers: {
                'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
                'Content-Type': 'application/json'
              }
            });
            console.log('OneSignal push notification sent to user', receiverId);
          } catch (err) {
            console.error('OneSignal push notification error for user', receiverId, ':', err);
          }
        } else {
          console.log('No OneSignal playerId found for user', receiverId);
        }
      }

      // Send back to sender for confirmation
      socket.emit('message_sent', populatedMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message_error', 'Failed to send message');
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { receiverId } = data;
    const receiverSocketId = connectedUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user_typing', { userId: socket.userId });
    }
  });

  socket.on('typing_stop', (data) => {
    const { receiverId } = data;
    const receiverSocketId = connectedUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user_stopped_typing', { userId: socket.userId });
    }
  });

  // WebRTC Call Signaling
  socket.on('start_call', (data) => {
    const { receiverId, callType, roomId } = data;
    const receiverSocketId = connectedUsers.get(receiverId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming_call', {
        callerId: socket.userId,
        receiverId,
        callType,
        roomId
      });
    }
  });

  socket.on('accept_call', (data) => {
    const { callerId, roomId } = data;
    const callerSocketId = connectedUsers.get(callerId);
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_accepted', {
        callerId,
        receiverId: socket.userId,
        callType: data.callType,
        roomId
      });
    }
  });

  socket.on('reject_call', (data) => {
    const { callerId } = data;
    const callerSocketId = connectedUsers.get(callerId);
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_rejected');
    }
  });

  socket.on('end_call', (data) => {
    const { callerId, receiverId } = data;
    const callerSocketId = connectedUsers.get(callerId);
    const receiverSocketId = connectedUsers.get(receiverId);
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_ended');
    }
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call_ended');
    }
  });

  // WebRTC Signaling (Offer/Answer/ICE)
  socket.on('offer', (data) => {
    const { roomId } = data;
    console.log(`Offer received in room: ${roomId}`);
    // Broadcast to all users in the room (for now, just the other party)
    socket.broadcast.emit('offer', data);
  });

  socket.on('answer', (data) => {
    const { roomId } = data;
    console.log(`Answer received in room: ${roomId}`);
    // Broadcast to all users in the room (for now, just the other party)
    socket.broadcast.emit('answer', data);
  });

  socket.on('ice_candidate', (data) => {
    const { roomId } = data;
    console.log(`ICE candidate received in room: ${roomId}`);
    // Broadcast to all users in the room (for now, just the other party)
    socket.broadcast.emit('ice_candidate', data);
  });

  // Listen for status requests
  socket.on('request_status', (data) => {
    const { userId } = data;
    if (connectedUsers.has(userId)) {
      socket.emit('user_status', { userId, online: true });
    } else {
      const status = userStatus.get(userId);
      socket.emit('user_status', { userId, online: false, lastSeen: status?.lastSeen });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      userStatus.set(socket.userId, { online: false, lastSeen: Date.now() });
      // Notify others this user is offline
      io.emit('user_status', { userId: socket.userId, online: false, lastSeen: Date.now() });
      console.log(`User ${socket.userId} disconnected. Connected users now:`, Array.from(connectedUsers.keys()));
    }
    console.log('User disconnected:', socket.id);
  });
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB Connected");
        server.listen(process.env.PORT, () => {
            console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
            console.log(`🔌 Socket.IO server ready`);
        });
    })
    .catch(err => {
        console.error("❌ MongoDB connection error:", err);
    });
