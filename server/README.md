# Freelance Platform Server

A Node.js server application supporting real-time collaboration features including video meetings, whiteboard, chat, and collaborative document editing.

## Features

- 🔐 Authentication and Authorization
- 📹 Video Meetings with WebRTC
- ⚡ Real-time Chat
- 📝 Collaborative Document Editing
- 🎨 Shared Whiteboard
- 💻 Code Snippet Collaboration
- 🔄 WebSocket Integration
- 📊 Data Caching with Redis
- 🛡️ Security Features
- 📝 API Documentation

## Prerequisites

- Node.js (>= 18.0.0)
- MongoDB
- Redis
- Git

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.template .env
```

4. Configure environment variables in `.env`:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/freelance-platform

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRE=24h
JWT_COOKIE_EXPIRE=24

# Security
CORS_ORIGIN=http://localhost:3000

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Logging
LOG_FILE_PATH=./logs
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d

# Error Monitoring (optional)
SENTRY_DSN=your-sentry-dsn

# WebRTC (optional)
TURN_SERVER_URL=your-turn-server-url
TURN_SERVER_USERNAME=your-turn-username
TURN_SERVER_CREDENTIAL=your-turn-credential
```

5. Create required directories:
```bash
mkdir logs uploads
```

## Running the Server

### Development Mode
```bash
npm run dev
```
This will start the server with nodemon for auto-reloading.

### Production Mode
```bash
npm start
```

## API Documentation

Once the server is running, access the Swagger documentation at:
```
http://localhost:5000/api-docs
```

## WebSocket Endpoints

### Video Meetings
- `meeting:join` - Join a meeting room
- `meeting:leave` - Leave a meeting room
- `signal:offer` - WebRTC offer
- `signal:answer` - WebRTC answer
- `signal:ice-candidate` - ICE candidate

### Chat
- `chat:join` - Join a chat room
- `chat:message` - Send a message
- `chat:typing` - Typing indicator

### Whiteboard
- `whiteboard:join` - Join whiteboard session
- `whiteboard:draw` - Draw on whiteboard
- `whiteboard:clear` - Clear whiteboard

### Code Snippets
- `code:join` - Join code collaboration
- `code:change` - Code changes
- `code:cursor` - Cursor position

### Documents
- `document:join` - Join document session
- `document:operation` - Document changes
- `document:cursor` - Cursor position

## Directory Structure

```
server/
├── config/           # Configuration files
├── controllers/      # Route controllers
├── middleware/       # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic
├── socketHandlers/  # WebSocket handlers
├── utils/           # Utility functions
├── uploads/         # File uploads
├── logs/           # Application logs
└── tests/          # Test files
```

## Testing

Run tests:
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Monitoring

- Application logs are stored in `./logs`
- Error tracking via Sentry (if configured)
- Custom monitoring endpoints:
  - `/health` - Server health check
  - `/metrics` - Server metrics (if enabled)

## Security Features

- CORS protection
- Rate limiting
- XSS prevention
- SQL injection prevention
- Parameter pollution protection
- Security headers with Helmet
- Request sanitization
- JWT authentication
- Input validation

## Support

For support, please open an issue in the repository or contact the development team.
