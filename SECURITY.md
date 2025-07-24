# Security Policy

## 🛡️ Supported Versions

I actively maintain and provide security updates for the following versions of this Todo Application:

| Version | Supported          | Status                    |
| ------- | ------------------ | ------------------------- |
| 2.0.x   | :white_check_mark: | Current stable release    |
| 1.x.x   | :x:                | Legacy - no longer supported |

## 🔍 Security Features

### Authentication & Authorization
- **JWT-based authentication** with configurable expiration
- **Email verification** required for account activation  
- **Password hashing** using bcrypt with configurable rounds
- **Session management** with secure token handling

### Rate Limiting & Bot Protection
- **Configurable rate limiting** for all endpoints
- **Honeypot detection** to catch automated bots
- **Timing analysis** to detect suspicious form submissions
- **User-agent filtering** to block known malicious clients
- **IP-based blocking** after failed attempts

### Email Security
- **International email validation** with 268+ blocked disposable domains
- **Pattern-based threat detection** across multiple languages
- **Provider categorization** (trusted vs suspicious)
- **Anti-spam measures** integrated into registration

### Infrastructure Security
- **Security headers** (CSP, HSTS, X-Frame-Options, etc.)
- **CORS protection** with configurable origins
- **Input validation & sanitization** on all user inputs
- **SQL injection prevention** through parameterized queries
- **XSS protection** via output encoding

### Monitoring & Analytics
- **Real-time threat detection** and logging
- **Security event monitoring** with configurable thresholds
- **Performance monitoring** to detect DoS attempts
- **Automated vulnerability scanning** via GitHub CodeQL

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

### 📧 Contact Methods
1. **GitHub Security Advisory** (Preferred):
   - Go to the "Security" tab in this repository
   - Click "Report a vulnerability"
   - Fill out the private security advisory form

2. **Email** (Alternative):
   - Send details to: `appservicetodo@gmail.com`
   - Use subject: `[SECURITY] Vulnerability Report - Todo App`

### 📋 What to Include
Please provide as much information as possible:

- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** and severity assessment
- **Suggested fix** or mitigation (if available)
- **Your contact information** for follow-up
- **Whether you'd like to be credited** in the security advisory

### ⏱️ Response Timeline
- **Initial response**: 24-48 hours
- **Status update**: Weekly progress updates
- **Resolution timeline**: 30-90 days (depending on severity)
- **Public disclosure**: After fix is deployed and verified

### 🏆 Security Researcher Recognition
I appreciate security researchers who help improve my application's security:
- **Responsible disclosure** will be publicly acknowledged
- **Contributor recognition** in my security advisory
- **Hall of Fame** listing for significant findings (with permission)

## 🔒 Security Best Practices

### For Users
- **Use strong passwords** (minimum 8 characters, mixed case, numbers, symbols)
- **Enable email verification** for account security
- **Don't share credentials** or use public computers for sensitive operations
- **Report suspicious activity** immediately

### For Developers
- **Keep dependencies updated** (automated via Dependabot)
- **Follow secure coding practices** outlined in my contribution guidelines
- **Test security features** before deploying changes
- **Review security-related PRs** carefully

### For Administrators
- **Configure rate limiting** according to your traffic patterns
- **Monitor security logs** regularly
- **Keep environment variables** secure and up-to-date
- **Use HTTPS** in production environments

## 🛠️ Security Configuration

### Environment Variables
Critical security settings are configurable via environment variables:

```bash
# Rate Limiting Configuration
LOGIN_MAX_REQUESTS=5
REGISTER_MAX_REQUESTS=3
GENERAL_MAX_REQUESTS=120

# Bot Protection Settings  
ENABLE_HONEYPOT=true
ENABLE_TIMING=true
MIN_FORM_TIME_MS=3000

# Security Thresholds
SECURITY_BLOCK_THRESHOLD=30
SECURITY_SUSPICIOUS_THRESHOLD=60
```

### Security Headers
The application automatically applies security headers:
- **Content Security Policy (CSP)**
- **HTTP Strict Transport Security (HSTS)**
- **X-Frame-Options** 
- **X-Content-Type-Options**
- **Referrer-Policy**

## 📊 Threat Model

### Assets Protected
- **User credentials** and authentication tokens
- **Personal todo data** and task information
- **Email addresses** and verification status
- **Application availability** and performance

### Potential Threats
- **Brute force attacks** on login endpoints
- **Automated bot registration** with disposable emails
- **Cross-site scripting (XSS)** attacks
- **SQL injection** attempts
- **Denial of Service (DoS)** attacks
- **Session hijacking** and token theft

### Mitigations Implemented
- **Rate limiting** prevents brute force attacks
- **Email validation** blocks disposable/suspicious domains
- **Input sanitization** prevents XSS and injection
- **Security headers** provide defense-in-depth
- **Monitoring** enables rapid threat detection

## 🔄 Security Updates

### Automated Security
- **Dependabot** automatically creates PRs for security updates
- **CodeQL analysis** scans code for vulnerabilities weekly
- **Secret scanning** prevents credential leaks
- **Branch protection** ensures security review of changes

### Manual Review Process
1. **Security PRs** are prioritized and fast-tracked
2. **Vulnerability assessments** before major releases
3. **Penetration testing** for significant changes
4. **Security audits** quarterly or after major updates

## 📚 Additional Resources

### Documentation
- [Security Headers Configuration](./backend-sqlite/security-headers.js)
- [Rate Limiting Setup](./backend-sqlite/server.js#L25-L50)
- [Email Validation Logic](./backend-sqlite/server.js#L300-L400)
- [Monitoring & Analytics](./backend-sqlite/monitoring.js)

### External Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Guide](https://expressjs.com/en/advanced/best-practice-security.html)

## 📅 Security Changelog

### Version 2.0.0 (Current)
- ✅ **Enhanced email validation** with international support
- ✅ **Configurable security settings** via environment variables
- ✅ **Advanced bot protection** with honeypot and timing analysis
- ✅ **Comprehensive monitoring** and threat detection
- ✅ **GitHub Security integration** (CodeQL, Dependabot, Secret scanning)

### Version 1.x.x (Legacy)
- ⚠️ **Basic authentication** without advanced protections
- ⚠️ **Limited rate limiting** with hard-coded values
- ⚠️ **Basic email validation** without disposable domain blocking

---

**Last Updated**: July 2025  
**Security Contact**: appservicetodo@gmail.com  
**Repository**: https://github.com/Max-A92/todo-app-fullstack