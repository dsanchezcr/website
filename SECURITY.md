# Security Policy

## Supported Versions

This project is actively maintained. Security updates are applied to the following:

| Component | Version | Supported |
| --- | --- | --- |
| Frontend (Docusaurus) | 3.x | ✅ |
| Backend (Azure Functions - .NET) | 9.0 | ✅ |
| Node.js Dependencies | Latest | ✅ |

## Security Features

### Automated Security Scanning

This repository implements multiple layers of automated security scanning:

#### 1. CodeQL Analysis
- **Frequency**: Runs on every push to `main` branch and on all pull requests
- **Languages Scanned**: C# (backend) and JavaScript/TypeScript (frontend)
- **Purpose**: Identifies security vulnerabilities, coding errors, and potential exploits in the codebase
- **Configuration**: See `.github/workflows/codeql.yml`
- **Results**: Available in the Security tab → Code scanning alerts

#### 2. Dependency Review
- **Frequency**: Runs on all pull requests to `main` branch
- **Purpose**: Prevents introduction of vulnerable dependencies and incompatible licenses
- **Severity Threshold**: Fails on `moderate` severity or higher
- **License Policy**: Blocks GPL and LGPL licenses to maintain compatibility
- **Features**:
  - OpenSSF Scorecard integration for dependency health metrics
  - Automated PR comments with vulnerability summaries
  - Comprehensive vulnerability reporting
- **Configuration**: See `.github/workflows/dependency-review.yml`

#### 3. Dependency Updates
Regular monitoring and updates of:
- npm packages (frontend dependencies)
- NuGet packages (backend dependencies)
- GitHub Actions versions

### Contact Form Security

The contact form (`/api/contact`) implements comprehensive security measures:

#### Multi-Layer Spam Protection
1. **Google reCAPTCHA v3**
   - Minimum score: 0.5
   - Invisible challenge for legitimate users
   - Bot detection without user interaction

2. **Honeypot Field**
   - Hidden `website` field that legitimate users won't fill
   - Bots typically auto-fill all fields, triggering detection
   - 2-second delay added for caught bots to waste their time

3. **Email Verification Flow**
   - Two-step verification process prevents automated submissions
   - Verification tokens expire after 24 hours
   - Tokens are single-use and removed from cache after validation

4. **Rate Limiting** (In-Memory Cache)
   - IP-based: Maximum 3 submissions per hour per IP address
   - Email-based: Maximum 2 submissions per day per email address
   - **Note**: Rate limits reset on function app restart (not suitable for high-scale multi-instance deployments)

5. **Content-Based Spam Detection**
   - URL pattern detection (max 2 URLs allowed)
   - Multiple email address detection
   - Spam keyword filtering (pharmaceutical, cryptocurrency, gambling terms)
   - Message length validation (10-5000 characters)
   - Repetitive character detection
   - Name format validation (no numbers or special characters)

#### Input Validation & Sanitization
- Email format validation using .NET `MailAddress` class
- HTML encoding of all user inputs in email templates
- JSON schema validation for API requests
- Case-insensitive property name handling

#### Secure Communication
- All API endpoints use HTTPS in production
- Azure Communication Services for email delivery with verified sender domains
- CORS configuration restricts API access to known domains

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please follow responsible disclosure practices:

### How to Report

1. **DO NOT** open a public GitHub issue for security vulnerabilities
2. **Email**: Send details to contact form with subject line: `[SECURITY] Vulnerability Report`
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)
   - Your contact information for follow-up

## Security Best Practices for Contributors

If you're contributing to this project, please follow these security guidelines:

### Code Contributions
- Never commit secrets, API keys, or connection strings to the repository
- Use environment variables for sensitive configuration
- Follow the principle of least privilege for Azure Function authorization levels
- Validate and sanitize all user inputs
- Use parameterized queries to prevent injection attacks
- Keep dependencies up to date

### Pull Requests
- All PRs automatically run CodeQL and dependency review checks
- Address any security findings before merge
- Review the dependency review comments for vulnerability information

### Environment Variables
The following environment variables contain sensitive data and must NEVER be committed:

```
AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING
RECAPTCHA_SECRET_KEY
AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_KEY
AZUREFUNCTION_PUBLISHINGPROFILE
AZURE_STATIC_WEB_APPS_API_TOKEN
```

Use Azure Key Vault or GitHub Secrets for production deployment.

## Known Limitations

### Rate Limiting
The current rate limiting implementation uses in-memory caching (`IMemoryCache`), which has the following limitations:
- Resets when the Azure Function app restarts
- Not shared across multiple function instances in scaled-out deployments
- **Recommendation**: For production at scale, migrate to Azure Redis Cache or Azure Table Storage

### Email Verification Tokens
- Stored in memory with 24-hour expiration
- Lost during function app restarts
- Consider Azure Redis Cache for persistent token storage in high-availability scenarios

## Security Compliance

### HTTPS Enforcement
- All production endpoints served over HTTPS
- Azure Static Web Apps automatically enforces HTTPS
- Azure Functions configured with HTTPS-only setting

### Data Privacy
- No personal data stored in databases
- Contact form submissions sent via email only
- Email verification tokens temporarily cached (24-hour TTL)
- No third-party analytics tracking in Azure Functions
- Google Analytics used on frontend

---

**Last Updated**: November 2025