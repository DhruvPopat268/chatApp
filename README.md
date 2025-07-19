# Chat App with Real-time Messaging and Voice Calls

A modern chat application built with Next.js, Socket.IO, and WebRTC featuring real-time messaging and voice calling capabilities.

## 🌐 Live URLs

- **Frontend**: https://chat-app-bice-kappa-21.vercel.app
- **Backend**: https://chatapp-backend-xf2u.onrender.com

## 🚀 Features

- **Real-time Messaging**: Instant message delivery using Socket.IO
- **Voice Calls**: WebRTC-powered voice calling with ringtone
- **User Authentication**: JWT-based authentication
- **Contact Management**: Add and manage contacts
- **Message History**: Persistent message storage
- **Responsive Design**: Works on desktop and mobile
- **Environment Switching**: Easy switching between local and production

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Socket.IO Client** - Real-time communication
- **WebRTC** - Voice calling
- **shadcn/ui** - UI components

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time server
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication

## 📦 Installation

### Prerequisites
- Node.js 18+
- MongoDB database
- npm or yarn

### Frontend Setup
```bash
cd chatApp
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
npm install
npm start
```

## 🔧 Environment Configuration

The app uses environment variables for configuration. Create a `.env.local` file in the root directory:

### Environment Variables

Copy the `env.example` file to `.env.local` and configure:

```bash
# Backend URL - Change this to switch between local and production
NEXT_PUBLIC_BACKEND_URL=http://localhost:7000

# For production, use:
# NEXT_PUBLIC_BACKEND_URL=https://chatapp-backend-xf2u.onrender.com
```

### Development (Local)
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:7000`

### Production
- Frontend: `https://chat-app-bice-kappa-21.vercel.app`
- Backend: `https://chatapp-backend-xf2u.onrender.com`

### Environment Configuration
The app automatically uses the backend URL specified in your `.env.local` file.

## 🌍 Environment Variables

### Frontend (.env.local)
```env
# Backend URL - Change this to switch between local and production
NEXT_PUBLIC_BACKEND_URL=http://localhost:7000

# For production, use:
# NEXT_PUBLIC_BACKEND_URL=https://chatapp-backend-xf2u.onrender.com
```

### Backend (.env)
```env
PORT=7000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

## 📱 Features

### Real-time Messaging
- Instant message delivery
- Typing indicators
- Message history
- Unread message counts

### Voice Calling
- WebRTC peer-to-peer calls
- Incoming call notifications with ringtone
- Mute/unmute functionality
- Speaker mode toggle
- Call controls (accept/reject/end)

### User Management
- User registration and login
- Contact management
- Profile editing
- Avatar upload

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth` - Search users

### Contacts
- `GET /api/contacts` - Get user contacts
- `POST /api/contacts` - Add new contact

### Messages
- `GET /api/messages/:receiverId` - Get conversation history
- `POST /api/messages` - Send message
- `PUT /api/messages/read/:senderId` - Mark messages as read

## 🚀 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables
3. Deploy automatically on push

### Backend (Render)
1. Connect your GitHub repository to Render
2. Set environment variables
3. Deploy as a web service

## 🔒 Security

- JWT token authentication
- CORS configuration for production domains
- Input validation and sanitization
- Secure WebRTC connections

## 📞 Voice Calling

The voice calling feature uses WebRTC for peer-to-peer communication:

1. **Call Initiation**: Click phone icon to start call
2. **Incoming Call**: Receive call with ringtone notification
3. **Call Controls**: Mute, speaker, end call
4. **Real-time Audio**: Direct peer-to-peer audio streaming

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue in the GitHub repository or contact the development team.
