# Todo App - Full-Stack Development

## Live Demo

**Frontend:** https://todo-app-fullstack-gamma.vercel.app  
**Backend API:** https://todo-app-fullstack-f4vh.onrender.com

**Try it live!** Register an account, log in, and start managing your tasks with full authentication and multi-user support.

---

## Project Overview

A modern Todo application with Multi-User Support, JWT Authentication, and SQLite Database. This project showcases the complete full-stack development journey from a simple basic app to a production-ready application.

### Live Demo Features
- **User Registration & Login** (JWT Authentication)
- **Personal Task Management** (CRUD Operations)  
- **Multi-User Support** (Isolated user data)
- **Responsive Design** (Mobile + Desktop optimized)
- **Real-time Statistics**
- **Production Deployment**

---

## Architecture & Deployment

### Modern Microservices Setup
```
Frontend (Vercel)     →     Backend (Render)
Static File Hosting   ←→    Node.js + SQLite
Global CDN            ←→    JWT Authentication
```

### Deployment Stack
- **Frontend:** Vercel (Static Hosting, Global CDN)
- **Backend:** Render (Node.js Server, Persistent Storage)  
- **Database:** SQLite (File-based, persistent on Render)
- **Authentication:** JWT Token-based with bcrypt hashing

---

## Features

### Authentication & User Management
- User registration with email validation
- Secure login with JWT tokens
- Password hashing (bcrypt with 12 rounds)
- User-specific data isolation
- Demo mode for guests without account

### Advanced Task Management
- Complete CRUD operations
- Status toggle (Open ↔ Completed)
- Inline text editing with click-to-edit
- Bulk operations (delete all completed tasks)
- Real-time statistics and progress tracking

### Modern User Experience
- Responsive design (mobile + desktop optimized)
- Authentication modal with login/register tabs
- Loading states & error handling
- Token-based session management
- Offline mode with cached data

---

## Technology Stack

### Backend
- **Node.js** + **Express.js** - Server framework
- **SQLite** - Lightweight database with user relations & foreign keys
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Secure password hashing
- **CORS** - Cross-origin resource sharing

### Frontend  
- **HTML5** + **CSS3** + **Vanilla JavaScript**
- **Module Pattern** (Douglas Crockford best practices)
- **Fetch API** with timeout handling
- **LocalStorage** for token management
- **Responsive Design** with CSS Grid/Flexbox

### DevOps & Deployment
- **Vercel** - Frontend deployment with automatic SSL
- **Render** - Backend deployment with persistent storage
- **GitHub** - Version control and CI/CD integration
- **Environment Variables** - Secure configuration management

---

## Repository Structure

```
todo-app-fullstack/
├── README.md                    # This file (English)
├── README-DE.md                 # German version
├── LICENSE                      # MIT License
├── .gitignore                   # Git ignore patterns
├── screenshots/                 # Application screenshots
│   ├── Desktop-Overview.png
│   ├── Mobile-View.png
│   ├── Auth-Modal.png
│   └── User-Dashboard.png
├── frontend-sqlite/             # Frontend (Deployed on Vercel)
│   └── index.html              # Complete SPA with authentication
├── backend-sqlite/              # Backend (Deployed on Render)
│   ├── server.js               # Express server with auth & CRUD
│   ├── package.json            # Node.js dependencies
│   ├── .env.example            # Environment variables template
│   └── database.js             # SQLite database file (auto-created)
├── frontend-optimized/          # Version 2.0 - Enhanced UI
├── backend-optimized/           # Version 2.0 - Crockford Patterns
└── backend/                     # Version 1.0 - Basic CRUD
```

---

## API Documentation

**Base URL:** https://todo-app-fullstack-f4vh.onrender.com

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
    "username": "example_user",
    "email": "user@example.com", 
    "password": "your_password_here"
}
```

#### Login User  
```http
POST /auth/login
Content-Type: application/json

{
    "username": "example_user",
    "password": "your_password_here"
}
```

### Protected Task Endpoints

#### Get User Tasks
```http
GET /tasks
Authorization: Bearer {your-jwt-token}
```

#### Create Task
```http
POST /tasks
Authorization: Bearer {your-jwt-token}
Content-Type: application/json

{
    "text": "Example task"
}
```

#### Update Task Status
```http
PUT /tasks/{task-id}
Authorization: Bearer {your-jwt-token}
```

#### Update Task Text
```http
PUT /tasks/{task-id}/text
Authorization: Bearer {your-jwt-token}
Content-Type: application/json

{
    "text": "Updated task text"
}
```

#### Delete Task
```http
DELETE /tasks/{task-id}
Authorization: Bearer {your-jwt-token}
```

**Note:** All shown data are example values for API testing. Use your own credentials when testing!

---

## Local Development Setup

### Prerequisites
- Node.js (v16 or higher)
- Git

### 1. Backend Setup (API Server)
```bash
# Clone repository
git clone https://github.com/Max-A92/todo-app-fullstack.git
cd todo-app-fullstack

# Backend setup (SQLite + Auth)
cd backend-sqlite
npm install

# Create JWT secret (IMPORTANT!)
echo "JWT_SECRET=your-super-secret-jwt-key-here" > .env

# Start backend
node server.js
```
**Backend runs on:** http://localhost:3000

### 2. Frontend Setup (Static File Server)
```bash
# Open new terminal
cd frontend-sqlite

# Option 1: VS Code Live Server (recommended)
# Right-click on index.html → "Open with Live Server"

# Option 2: Python HTTP Server  
python -m http.server 8000

# Option 3: Node.js HTTP Server
npx http-server -p 8000
```
**Frontend runs on:** http://localhost:5500 (or :8000)

---

## Testing

### Local Testing
```bash
# Backend health check
curl http://localhost:3000/tasks

# With authentication (replace TOKEN with actual JWT)
curl -H "Authorization: Bearer YOUR_ACTUAL_JWT_TOKEN" http://localhost:3000/tasks
```

**Tip:** Get the JWT token after successful login via the `/auth/login` route

### Feature Testing
- **Demo Mode:** Open app without authentication
- **User Registration:** Create new account  
- **Multi-User Test:** Create multiple accounts and verify data isolation
- **Responsive Design:** Test mobile + desktop views
- **Offline Mode:** Disconnect internet, app should show cached data

---

## Screenshots

### Desktop Overview
![Desktop View](screenshots/Desktop-Overview.png)

### Mobile View
![Mobile View](screenshots/Mobile-View.png)

### Authentication Modal
![Auth Modal](screenshots/Auth-Modal.png)

### User Dashboard
![User Dashboard](screenshots/User-Dashboard.png)

---

## Development Evolution

This project documents the **progressive development** through 3 major versions:

**Version 1.0:** Basic CRUD operations + JSON file storage  
**Version 2.0:** Code optimization (Douglas Crockford best practices)  
**Version 3.0:** Production ready (SQLite + Auth + multi-user)

Each version is preserved in the repository to show the development journey from basic app to production-ready application.

---

## Security Features

- **Password Hashing:** bcrypt with 12 rounds
- **Input Validation & Sanitization** on server-side
- **SQL Injection Prevention** (prepared statements)
- **XSS Prevention** (textContent instead of innerHTML)
- **CORS Configuration** for secure API access
- **JWT Token Expiration** and validation

---

## Performance & Scalability

- **Database Optimization:** Indexed user relations and foreign keys
- **Frontend Caching:** LocalStorage for auth tokens and task caching
- **Global CDN:** Vercel provides worldwide content delivery
- **Error Handling:** Comprehensive error handling with user feedback
- **Resource Management:** Efficient DOM manipulation and event handling

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Author

**Maximilian Adam**
- GitHub: [@Max-A92](https://github.com/Max-A92)
- Email: max.adam.92.mail@gmail.com

---

## Live URLs

- **Application:** https://todo-app-fullstack-gamma.vercel.app
- **API Documentation:** https://todo-app-fullstack-f4vh.onrender.com
- **Repository:** https://github.com/Max-A92/todo-app-fullstack

---

**Full-Stack Development Journey - From Basic CRUD to Production-Ready Application**