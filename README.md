# Todo App - Full-Stack Development

**Live Demo:** https://todo-app-fullstack.vercel.app *(will be updated after deployment)*

A modern Todo application with **Multi-User Support**, **JWT Authentication**, and **SQLite Database**. This project showcases the complete full-stack development journey from a simple basic app to a production-ready application.

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
- Real-time statistics

### Modern User Experience
- Responsive design (mobile + desktop optimized)
- Authentication modal with login/register tabs
- Loading states & error handling
- Token-based session management

## Technology Stack

**Backend:** Node.js + Express.js + SQLite + JWT + bcrypt  
**Frontend:** HTML5 + CSS3 + Vanilla JavaScript  
**Database:** SQLite with user relations & foreign keys  
**Authentication:** JWT-based with secure password hashing  
**Security:** Input validation + SQL injection prevention  

## Repository Structure

```
todo-app/
├── README.md
├── LICENSE
├── .gitignore
├── screenshots/
│   ├── Desktop-Overview.png
│   ├── Mobile-View.png
│   ├── Auth-Modal.png
│   └── User-Dashboard.png
├── backend/                     # Version 1.0 - Basic Backend
├── backend-optimized/           # Version 2.0 - Crockford Patterns  
├── backend-sqlite/              # Version 3.0 - SQLite + Auth
├── frontend/                    # Version 1.0 - Basic Frontend
├── frontend-optimized/          # Version 2.0 - Enhanced UI
└── frontend-sqlite/             # Version 3.0 - Auth Integration
```

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Git

### Setup & Run

#### 1. Backend Setup (API Server)
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

#### 2. Frontend Setup (Static File Server)
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
**Frontend runs on:** http://localhost:8000 (or :5500 with Live Server)

## Screenshots

### Desktop Overview
![Desktop Overview](screenshots/Desktop-Overview.png)

### Mobile View
![Mobile View](screenshots/Mobile-View.png)

### Authentication Modal
![Authentication Modal](screenshots/Auth-Modal.png)

### User Dashboard
![User Dashboard](screenshots/User-Dashboard.png)

## API Documentation

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

> **Note:** All shown data are **example values** for API testing. Use your own credentials when testing!

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

#### Delete Task
```http
DELETE /tasks/{task-id}
Authorization: Bearer {your-jwt-token}
```

> **API Testing:** Replace `{your-jwt-token}` with your actual JWT token from the login response

## Testing

### Local Testing
```bash
# Backend health check
curl http://localhost:3000/tasks

# With authentication (replace TOKEN with actual JWT)
curl -H "Authorization: Bearer YOUR_ACTUAL_JWT_TOKEN" http://localhost:3000/tasks
```

> **Tip:** Get the JWT token after successful login via the `/auth/login` route

### Feature Testing
- **Demo Mode:** Open app without authentication
- **User Registration:** Create new account
- **Multi-User Test:** Create multiple accounts
- **Responsive Design:** Test mobile + desktop

## Security Implementation

- **JWT Token Authentication** with expiration
- **Password Hashing** (bcrypt with 12 rounds)
- **Input Validation & Sanitization** on server-side
- **SQL Injection Prevention** (prepared statements)
- **XSS Prevention** (textContent instead of innerHTML)
- **CORS Configuration** for secure API access

## Development Evolution

This project documents the **progressive development** through **3 major versions**:

- **Version 1.0:** Basic CRUD operations + JSON file storage
- **Version 2.0:** Code optimization (Douglas Crockford best practices)
- **Version 3.0:** Production ready (SQLite + JWT auth + multi-user)

## Author

**Maximilian Adam**
- GitHub: [@Max-A92](https://github.com/Max-A92)
- Email: max.adam.92.mail@gmail.com

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Full-Stack Development Journey - From Basic CRUD to Production-Ready Application**