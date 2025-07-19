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

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/messages", messageRoutes);

// Socket.IO connection handling
const connectedUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Authenticate user and store their socket connection
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;
      console.log(`User ${userId} authenticated and connected`);
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
      const receiverSocketId = connectedUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new_message', populatedMessage);
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

  // Handle voice/video calls
  socket.on('start_call', (data) => {
    const { receiverId, callType, roomId, offer } = data;
    const receiverSocketId = connectedUsers.get(receiverId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming_call', {
        callerId: socket.userId,
        receiverId,
        callType,
        roomId,
        offer
      });
    }
  });

  socket.on('accept_call', (data) => {
    const { roomId } = data;
    // Notify the caller that the call was accepted
    socket.broadcast.emit('call_accepted', {
      roomId,
      receiverId: socket.userId
    });
  });

  socket.on('reject_call', (data) => {
    const { roomId } = data;
    // Notify the caller that the call was rejected
    socket.broadcast.emit('call_rejected', { roomId });
  });

  socket.on('end_call', (data) => {
    const { roomId } = data;
    // Notify all participants that the call ended
    socket.broadcast.emit('call_ended', { roomId });
  });

  // Handle WebRTC signaling
  socket.on('ice_candidate', (data) => {
    const { candidate, roomId } = data;
    socket.broadcast.emit('ice_candidate', { candidate, roomId });
  });

  socket.on('offer', (data) => {
    const { offer, roomId } = data;
    socket.broadcast.emit('offer', { offer, roomId });
  });

  socket.on('answer', (data) => {
    const { answer, roomId } = data;
    socket.broadcast.emit('answer', { answer, roomId });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
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
