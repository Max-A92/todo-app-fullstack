Todo App - Full-Stack Development with International Email Validation
Live Demo
Frontend: https://todo-app-fullstack-gamma.vercel.app
Backend API: https://todo-app-fullstack-fdvh.onrender.com

Try it live! Register with any real email address from around the world - Gmail, Outlook, Yahoo, Web.de, GMX, company emails, and all legitimate providers are supported. Advanced international spam protection blocks 200+ disposable email services.

Project Overview
A modern Todo application with Multi-User Support, JWT Authentication, SQLite Database, and International Email Validation. This project showcases the complete full-stack development journey from a simple basic app to a production-ready application with enterprise-level security.

Live Demo Features
International User Registration - Advanced email validation for 200+ countries
JWT Authentication - Secure token-based login system
Personal Task Management - Full CRUD operations with user isolation
Multi-User Support - Complete data separation between users
Responsive Design - Optimized for mobile and desktop
Real-time Statistics - Progress tracking and task analytics
Production Deployment - Deployed on Vercel + Render with SSL
International Compatibility - Perfect for global GitHub projects
International Email Validation Features
Supported Email Providers Worldwide
Major International: Gmail, Outlook, Yahoo, iCloud, AOL
European Regional: Web.de, GMX, T-Online, Orange.fr, Libero.it, Mail.ru
Privacy-Focused: ProtonMail, Tutanota, FastMail, Posteo
Educational: All .edu, .ac.uk, university domains
Business: All legitimate company email addresses
Blocked Disposable Email Services (200+ Domains)
English: 10minutemail, guerrillamail, mailinator, tempmail, throwaway.email
German: wegwerfmail.de, einmalmail.de, zehnminutenmail.de
French: yopmail.fr, jetable.org, tempomail.fr
Spanish: correo-temporal.com, email-temporal.com
Italian: tempmail.it, email-temporanea.it
Russian: tempmail.ru, spambog.ru
Japanese: tempmail.jp, supermailer.jp
Portuguese: email-temporario.com.br
And many more international services
Advanced Security Features
Pattern Recognition: Detects suspicious domains in multiple languages
Domain Structure Analysis: Blocks malformed and fake domains
TLD Validation: Prevents suspicious top-level domains (.tk, .ml, .ga)
Liberal Approach: Perfect for open-source projects - legitimate emails always work
Architecture & Deployment
Modern Microservices Setup
Frontend (Vercel)     →     Backend (Render)
Static File Hosting   ←→    Node.js + Express
Global CDN            ←→    JWT Authentication
Auto SSL              ←→    SQLite Database
                            International Email Validation
Deployment Stack
Frontend: Vercel (Static Hosting, Global CDN, Auto SSL)
Backend: Render (Node.js Server, Persistent Storage, Auto SSL)
Database: SQLite (File-based, persistent, with user relations)
Authentication: JWT Token-based with bcrypt hashing (12 rounds)
Email Validation: International disposable email blocking (200+ domains)
Features
International Email Validation
200+ blocked disposable domains across multiple languages
Liberal approach - all legitimate providers worldwide accepted
Pattern recognition for suspicious domains in English, German, French, Spanish, Italian, Russian, Japanese, Portuguese
Domain structure analysis prevents malformed domains
Perfect for GitHub projects - developers worldwide can register with their real emails
Authentication & User Management
International email validation with comprehensive spam protection
Secure registration with real-time email provider detection
JWT token authentication with configurable expiration
Password hashing with bcrypt (12 rounds) for maximum security
User-specific data isolation - complete privacy between accounts
Demo mode for guests without account registration
Advanced Task Management
Complete CRUD operations (Create, Read, Update, Delete)
Status management with instant toggle (Open ↔ Completed)
Inline text editing with click-to-edit functionality
Bulk operations (delete all completed tasks with confirmation)
Real-time statistics with progress tracking and completion percentages
User-specific tasks with complete data separation
Modern User Experience
Responsive design optimized for both mobile and desktop
Authentication modal with smooth login/register transitions
Loading states with progress indicators and timeout handling
Error handling with user-friendly messages and retry mechanisms
Token-based sessions with automatic expiration handling
Offline mode with cached data and connection retry logic
International UX with email provider recognition and feedback
Technology Stack
Backend
Node.js + Express.js - High-performance server framework
SQLite - Lightweight database with advanced user relations & foreign keys
JWT - JSON Web Tokens for stateless authentication
bcrypt - Military-grade password hashing (12 rounds)
CORS - Secure cross-origin resource sharing with multiple origins
International Email Validation - Custom implementation blocking 200+ disposable services
Frontend
HTML5 + CSS3 + Vanilla JavaScript - Modern web standards
Module Pattern following Douglas Crockford best practices
Fetch API with comprehensive timeout and retry handling
LocalStorage for secure token management and session persistence
Responsive Design with CSS Grid/Flexbox for all device sizes
Progressive Enhancement with graceful degradation
DevOps & Deployment
Vercel - Frontend deployment with global CDN and automatic SSL
Render - Backend deployment with persistent storage and SSL
GitHub - Version control with automated CI/CD pipeline integration
Environment Variables - Secure configuration management
Health Monitoring - Automated endpoint monitoring and alerting
Repository Structure
todo-app-fullstack/
├── README.md                    # Professional documentation
├── LICENSE                      # MIT License
├── .gitignore                   # Git ignore patterns
├── screenshots/                 # Application screenshots (optional)
│   ├── Desktop-Overview.png
│   ├── Mobile-View.png
│   ├── Auth-Modal.png
│   └── User-Dashboard.png
├── frontend-sqlite/             # CURRENT: Frontend (Deployed on Vercel)
│   └── index.html              # Complete SPA with international email validation
├── backend-sqlite/              # CURRENT: Backend (Deployed on Render)
│   ├── server.js               # Express server with international email validation
│   ├── package.json            # Node.js dependencies
│   ├── .env.example            # Environment variables template
│   └── database.js             # SQLite database with user relations
├── frontend-optimized/          # Version 2.0 - Enhanced UI (legacy)
│   └── index.html              # Improved version without auth
├── backend-optimized/           # Version 2.0 - Crockford Patterns (legacy)
│   ├── server.js               # Module pattern implementation
│   └── package.json
└── backend/                     # Version 1.0 - Basic CRUD (legacy)
    ├── server.js               # Simple Express + JSON storage
    └── package.json
API Documentation
Base URL: https://todo-app-fullstack-fdvh.onrender.com

Enhanced Authentication Endpoints
Register User (International Email Validation)
http
POST /auth/register
Content-Type: application/json

{
    "username": "developer_name",
    "email": "developer@company.com", 
    "password": "secure_password_123"
}
Response (Success):

json
{
    "message": "User erfolgreich registriert",
    "user": {
        "id": 1,
        "username": "developer_name",
        "email": "developer@company.com",
        "createdAt": "2025-07-20T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h",
    "emailInfo": {
        "provider": "Company Email",
        "category": "business_or_personal"
    }
}
Response (Email Validation Error):

json
{
    "error": "Ungültige E-Mail",
    "message": "Wegwerf-E-Mail-Adressen sind nicht erlaubt",
    "code": "DISPOSABLE_EMAIL",
    "suggestion": "Verwende deine echte E-Mail-Adresse von Gmail, Outlook, Yahoo, Web.de, GMX oder deiner Firma"
}
Login User
http
POST /auth/login
Content-Type: application/json

{
    "username": "developer_name",
    "password": "secure_password_123"
}
Protected Task Endpoints
Get User Tasks
http
GET /tasks
Authorization: Bearer {your-jwt-token}
Create Task
http
POST /tasks
Authorization: Bearer {your-jwt-token}
Content-Type: application/json

{
    "text": "Implement international email validation"
}
Update Task Status
http
PUT /tasks/{task-id}
Authorization: Bearer {your-jwt-token}
Update Task Text
http
PUT /tasks/{task-id}/text
Authorization: Bearer {your-jwt-token}
Content-Type: application/json

{
    "text": "Updated task description"
}
Delete Task
http
DELETE /tasks/{task-id}
Authorization: Bearer {your-jwt-token}
Delete All Completed Tasks
http
DELETE /tasks?status=completed
Authorization: Bearer {your-jwt-token}
System Health & Info
Health Check
http
GET /health
Response:

json
{
    "status": "ok",
    "message": "INTERNATIONAL EMAIL TODO SERVER IS RUNNING",
    "version": "INTERNATIONAL-EMAIL-1.0",
    "emailValidation": {
        "type": "international",
        "blockedDomains": 200,
        "supportedLanguages": ["English", "German", "French", "Spanish", "Italian", "Russian", "Japanese", "Portuguese"],
        "approach": "liberal"
    },
    "database": "connected",
    "environment": "production"
}
Local Development Setup
Prerequisites
Node.js (v16 or higher)
Git for version control
Modern browser (Chrome, Firefox, Safari, Edge)
1. Backend Setup (API Server with International Email Validation)
bash
# Clone repository
git clone https://github.com/Max-A92/todo-app-fullstack.git
cd todo-app-fullstack

# Backend setup
cd backend-sqlite
npm install

# Create environment configuration
echo "JWT_SECRET=your-super-secret-jwt-key-min-32-characters" > .env
echo "NODE_ENV=development" >> .env

# Start backend with international email validation
node server.js
Backend runs on: http://localhost:3000
Health Check: http://localhost:3000/health

2. Frontend Setup (Static File Server)
bash
# Open new terminal
cd frontend-sqlite

# Option 1: VS Code Live Server (recommended for development)
# Right-click on index.html → "Open with Live Server"

# Option 2: Python HTTP Server
python -m http.server 8000

# Option 3: Node.js HTTP Server
npx http-server -p 8000 --cors

# Option 4: Serve (if installed globally)
serve -l 8000
Frontend runs on: http://localhost:5500 (Live Server) or http://localhost:8000

Testing the International Email Validation
Valid Email Examples (Should Work)
bash
# Major international providers
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@gmail.com","password":"test123"}'

# European providers
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2","email":"test@web.de","password":"test123"}'

# Business emails
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser3","email":"developer@company.com","password":"test123"}'

# Educational emails
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser4","email":"student@university.edu","password":"test123"}'
Invalid Email Examples (Should Be Blocked)
bash
# Disposable email services (will be rejected)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"spammer","email":"test@10minutemail.com","password":"test123"}'

# Response: {"error":"Ungültige E-Mail","message":"Wegwerf-E-Mail-Adressen sind nicht erlaubt"}

# More disposable services
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"spammer2","email":"test@guerrillamail.com","password":"test123"}'

# German disposable service
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"spammer3","email":"test@wegwerfmail.de","password":"test123"}'

# French disposable service
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"spammer4","email":"test@yopmail.fr","password":"test123"}'
Email Validation Categories
The system automatically categorizes emails and provides feedback:

Major International: Gmail, Outlook, Yahoo, iCloud
Regional European: Web.de, GMX, T-Online, Orange.fr, Mail.ru
Privacy-Focused: ProtonMail, Tutanota, FastMail
Educational: .edu, .ac.uk, university domains
Business/Personal: Company domains and unknown providers
Advanced Testing
Authentication Flow Testing
bash
# 1. Register new user
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testdev","email":"dev@example-corp.com","password":"secure123"}')

echo "Registration: $REGISTER_RESPONSE"

# 2. Extract token from registration (if auto-login enabled)
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')

# 3. Or login separately
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testdev","password":"secure123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

# 4. Test authenticated endpoints
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/tasks

# 5. Create task
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Test international email validation"}'

# 6. Get user info
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/auth/me
Multi-User Testing
bash
# Create multiple users to test data separation
for i in {1..3}; do
  curl -X POST http://localhost:3000/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"user$i\",\"email\":\"user$i@gmail.com\",\"password\":\"test123\"}"
done
Development Evolution & International Enhancement
This project documents the progressive development through 4 major versions:

Version 1.0: Basic CRUD operations + JSON file storage
Version 2.0: Code optimization (Douglas Crockford best practices)
Version 3.0: Production ready (SQLite + Auth + multi-user)
Version 4.0: International email validation (200+ blocked domains)

What's New in Version 4.0 (International Email Validation)
Comprehensive International Support
200+ blocked disposable domains across multiple languages and countries
Pattern recognition for suspicious domains in 8+ languages
Liberal approach perfect for international open-source projects
Real-time email provider detection with user feedback
Enhanced Security Features
Advanced domain structure analysis prevents sophisticated fake domains
Multi-language suspicious pattern detection (English, German, French, Spanish, Italian, Russian, Japanese, Portuguese)
TLD validation blocks suspicious top-level domains
Business email support for company domains worldwide
Developer Experience Improvements
Detailed error messages with suggestions for valid email providers
Provider categorization (Major International, Regional European, Privacy-Focused, Educational, Business)
Real-time feedback showing detected email provider during registration
Comprehensive logging for debugging and analytics
Each version is preserved in the repository to show the development journey from basic app to enterprise-ready application with international support.

Performance & Scalability
Email Validation Performance
O(1) lookup time for disposable domain checking using JavaScript Set
Efficient pattern matching with optimized regex patterns
Minimal memory footprint with intelligent data structures
No external API dependencies for maximum reliability and speed
Application Performance
Database optimization with indexed user relations and foreign keys
Frontend caching with LocalStorage for auth tokens and intelligent task caching
Global CDN delivery via Vercel for worldwide content delivery
Comprehensive error handling with user feedback and automatic retry logic
Efficient DOM manipulation with minimal reflows and optimized event handling
Scalability Features
Stateless JWT authentication enables horizontal scaling
User data isolation with efficient database queries
Connection pooling ready for database scaling
CDN-optimized frontend with global edge caching
Health monitoring with automated endpoint checks
Security Features
Authentication Security
International email validation blocking 200+ disposable services
Password hashing with bcrypt and 12 salt rounds
JWT token security with configurable expiration and secure signing
Input validation & sanitization on all server endpoints
SQL injection prevention using prepared statements exclusively
Application Security
XSS prevention using textContent instead of innerHTML
CORS configuration with explicit origin whitelisting
Request rate limiting considerations for production deployment
Secure headers configuration for enhanced protection
Environment variable protection for sensitive configuration
International Security
Multi-language spam protection across 8+ languages
Cultural domain awareness (understanding regional providers)
Sophisticated pattern recognition for evolving spam techniques
Domain structure analysis preventing character substitution attacks
Deployment
Production Deployment (Current)
Frontend: Deployed on Vercel with global CDN
Backend: Deployed on Render with persistent storage
SSL: Automatic HTTPS on both platforms
Monitoring: Health checks and uptime monitoring
Custom Deployment Options
Docker Deployment
dockerfile
# Dockerfile for backend
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
Railway Deployment
bash
# Deploy to Railway
railway login
railway link
railway up
Heroku Deployment
bash
# Deploy to Heroku
heroku create your-todo-app
git push heroku main
Contributing
We welcome contributions from developers worldwide! The international email validation makes this project truly global.

International Contributions Welcome
Email provider additions for new regions/countries
Translation of error messages and UI text
Regional testing from different countries
Cultural UX improvements for international users
How to Contribute
Fork the repository
Create a feature branch (git checkout -b feature/amazing-international-feature)
Test thoroughly with international email addresses
Commit your changes (git commit -m 'Add amazing international feature')
Push to the branch (git push origin feature/amazing-international-feature)
Open a Pull Request with detailed description
Testing Guidelines
Test with email addresses from different countries
Verify that legitimate business emails work
Ensure new disposable services are properly blocked
Test error messages are helpful and clear
License
This project is licensed under the MIT License - see the LICENSE file for details.

Author
Maximilian Adam

GitHub: @Max-A92
Email: max.adam.92.mail@gmail.com

Acknowledgments
International Developer Community for testing and feedback
Open Source Email Validation Projects for inspiration
GitHub Community for making this globally accessible
Vercel & Render for excellent deployment platforms
Live URLs
Application: https://todo-app-fullstack-gamma.vercel.app
API Documentation: https://todo-app-fullstack-fdvh.onrender.com
Repository: https://github.com/Max-A92/todo-app-fullstack
Health Check: https://todo-app-fullstack-fdvh.onrender.com/health
Quick Start for International Developers
bash
# Test with your real email address (any legitimate provider worldwide)
curl -X POST https://todo-app-fullstack-fdvh.onrender.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","email":"your.real.email@yourprovider.com","password":"your_password"}'

# Should work with: Gmail, Outlook, Yahoo, Web.de, GMX, company emails, university emails, etc.
# Will block: 10minutemail, guerrillamail, wegwerfmail, yopmail, tempmail, etc.
Full-Stack Development with International Email Validation - From Basic CRUD to Enterprise-Ready Global Application

Perfect for international GitHub projects and worldwide developer communities!

