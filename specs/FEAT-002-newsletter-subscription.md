# Feature Specification: Newsletter Subscription System

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | FEAT-002 |
| **Title** | Newsletter Subscription System |
| **Author** | GitHub Copilot |
| **Date** | 2026-04-23 |
| **Status** | Implemented |
| **Related ADR** | N/A |

## Problem Statement

The website has no mechanism for readers to receive updates about new blog posts, projects, or content changes. Visitors must manually check the site. A newsletter subscription system would build a direct communication channel with engaged readers, delivering curated content digests on their preferred schedule (weekly or monthly).

## Expected Behavior

1. A newsletter subscription banner appears site-wide (above footer) inviting visitors to subscribe
2. Users provide their email, choose frequency (weekly/monthly), and complete double opt-in verification
3. A GitHub Actions cron job triggers newsletter dispatch at scheduled intervals
4. Every newsletter email includes an unsubscribe link (confirmation required)
5. A dedicated `/newsletter` page allows users to manage preferences or unsubscribe
6. All UI supports en/es/pt locales

## Constraints

- [x] Must support i18n (en/es/pt)
- [x] Must work with existing Docusaurus build
- [x] Uses existing Azure Cosmos DB (new container: `newsletter-subscribers`)
- [x] Uses existing Azure Communication Services for email delivery
- [x] Backend is HTTP-trigger only (SWA managed functions — no timer triggers)
- [x] Scheduled dispatch via GitHub Actions cron (not Azure Functions timer)

## Technical Design

### Data Model — Cosmos DB

**Container**: `newsletter-subscribers`
**Partition key**: `/email`

```json
{
  "id": "user@example.com",
  "email": "user@example.com",
  "frequency": "weekly",
  "language": "en",
  "status": "active",
  "subscribedAt": "2026-04-23T00:00:00Z",
  "verifiedAt": "2026-04-23T00:05:00Z",
  "lastSentAt": null,
  "verificationToken": null,
  "unsubscribeToken": "random-base64url-token"
}
```

### API Endpoints

| Function | Route | Method | Purpose |
|----------|-------|--------|---------|
| `SubscribeNewsletter` | `/api/newsletter/subscribe` | POST | Create pending subscription + send verification email |
| `VerifySubscription` | `/api/newsletter/verify` | GET | Confirm subscription via token |
| `UnsubscribeNewsletter` | `/api/newsletter/unsubscribe` | GET/POST | Unsubscribe with confirmation |
| `UpdatePreferences` | `/api/newsletter/preferences` | POST | Change frequency |
| `GetSubscriptionStatus` | `/api/newsletter/status` | POST | Check status by unsubscribe token |
| `DispatchNewsletter` | `/api/newsletter/dispatch` | POST | Build + send digest (called by GitHub Actions) |

### Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `NewsletterSubscribe` | `src/components/NewsletterSubscribe/` | Inline banner with email + frequency selector |
| `newsletter.js` | `src/pages/newsletter.js` | Manage preferences / unsubscribe page |

### Affected Files

| File | Action | Description |
|------|--------|-------------|
| `src/components/NewsletterSubscribe/index.js` | Create | Subscription form component |
| `src/components/NewsletterSubscribe/styles.module.css` | Create | Component styles |
| `src/pages/newsletter.js` | Create | Preferences management page |
| `src/theme/Footer/index.js` | Modify | Inject `NewsletterSubscribe` |
| `src/config/environment.js` | Modify | Add newsletter API routes |
| `api/SubscribeNewsletter.cs` | Create | Subscribe endpoint |
| `api/VerifySubscription.cs` | Create | Verify subscription endpoint |
| `api/UnsubscribeNewsletter.cs` | Create | Unsubscribe endpoint |
| `api/UpdatePreferences.cs` | Create | Preferences update endpoint |
| `api/GetSubscriptionStatus.cs` | Create | Status check endpoint |
| `api/DispatchNewsletter.cs` | Create | Newsletter dispatch endpoint |
| `api/Models/Newsletter/NewsletterModels.cs` | Create | Data models |
| `api/Services/NewsletterService.cs` | Create | Cosmos DB newsletter service |
| `api/LocalizationHelper.cs` | Modify | Add newsletter email templates |
| `api/Program.cs` | Modify | Register newsletter service |
| `api/HealthCheck.cs` | Modify | Add newsletter env var + health check |
| `.github/workflows/newsletter-dispatch.yml` | Create | Cron workflow |
| `docusaurus.config.js` | Modify | Add footer link |
| `i18n/es/docusaurus-theme-classic/footer.json` | Modify | Footer translations |
| `i18n/pt/docusaurus-theme-classic/footer.json` | Modify | Footer translations |
| `infra/main.bicep` | Modify | Add NEWSLETTER_DISPATCH_KEY param |
| `tests/newsletter-subscribe.test.js` | Create | Frontend tests |
| `api.tests/NewsletterTests.cs` | Create | Backend tests |

### Security

- Double opt-in email verification (reuses existing pattern from contact form)
- Cryptographically random unsubscribe tokens per subscriber (rotated on re-subscribe, no login required)
- Verification tokens expire after 24 hours
- Rate limiting: 3 subscribe requests/IP/hour
- Honeypot field on subscription form
- reCAPTCHA v3 validation (optional — honeypot + rate limiting provide primary protection; reCAPTCHA is validated when a token is provided)
- `NEWSLETTER_DISPATCH_KEY` for authenticating GitHub Actions dispatch call
- Constant-time comparison for dispatch key validation
- Link-based unsubscribe in all newsletter emails
- Input validation at all API boundaries
- Dispatch idempotency: subscribers already sent within the current frequency window are skipped

## Edge Cases

1. Same email subscribes twice → return "already subscribed"
2. Unsubscribed user re-subscribes → reactivate with new verification
3. Dispatch runs with no new content → skip sending
4. Email delivery failure → log to Application Insights, continue with other subscribers
5. Language preference change → next newsletter uses new locale
6. GitHub Actions dispatch fails mid-batch → idempotent via `lastSentAt` tracking

## i18n Requirements

- [x] `NewsletterSubscribe` component uses inline translation pattern
- [x] `newsletter.js` page uses inline translation pattern
- [x] Newsletter email templates added to `LocalizationHelper.cs` for all 3 locales
- [x] Footer link translated in footer.json files

## Acceptance Criteria

- [x] Subscription form appears on all pages (above footer)
- [x] Double opt-in email flow works end-to-end
- [x] Unsubscribe link in every email works with single click
- [x] `/newsletter` page allows preference management
- [x] GitHub Actions workflow dispatches on schedule
- [x] All 3 locales render correctly
- [x] Rate limiting enforced on subscribe endpoint
- [x] Health check includes newsletter service status
- [x] All tests pass
- [x] No new lint errors

## Security Considerations

- Email addresses stored in Cosmos DB with partition key isolation
- No PII stored beyond email + language + frequency
- Unsubscribe tokens are cryptographically random (256-bit), not guessable
- Privacy page (FEAT-001) documents newsletter data handling

## Out of Scope

- Rich HTML email editor / template builder
- Analytics dashboard for open/click rates
- Subscriber segmentation or A/B testing
- Custom unsubscribe reasons survey
