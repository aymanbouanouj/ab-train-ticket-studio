# Security Policy

AB TRAIN is an **independent railway booking simulation**. It has no real railway reservation backend, online payments, official ONCF access, or accounts. Sample tickets and QR codes are **not valid for travel**.

## Supported releases

Security reports are welcome for the current source on the default `main` branch and the [live demonstration](https://aymanbouanouj.github.io/ab-train-ticket-studio/). Historical snapshots may not receive fixes.

## Reporting a vulnerability privately

**Do not disclose a security vulnerability, secret, real passenger data or exploit instructions in a public GitHub issue, discussion, PR or screenshot.**

1. Open the repository's **Security** tab.
2. If GitHub's **Report a vulnerability** option is available, use its private vulnerability-reporting form to submit a report.
3. If that option is **not** available, contact the repository maintainer using a previously established *private* GitHub contact channel and request a secure reporting method before sharing sensitive details. There is no designated public email inbox for reports. Do not post the details publicly simply to request contact.

Provide a short impact assessment, affected version/commit or URL, reproducible steps using **synthetic sample data**, expected vs. actual behavior, and any relevant logs *after removing secrets and personal information*. Please avoid denial-of-service tests, accessing other people's data, or disrupting the live demo.

The maintainer will review reports as availability permits. No fixed response or remediation SLA is promised.

## Scope and responsible disclosure

Relevant examples include client-side script injection, unsafe URL handling, unintended disclosure of secrets or personal data, dependency vulnerabilities that demonstrably affect the application, or malicious code introduced through build/deployment automation.

The absence of real bookings, online payments or official train service integration is an intentional product limitation rather than a security defect. The app intentionally stores **demo ticket history locally in the visitor's browser**, and exported tickets/QR codes contain readable sample passenger and journey details. Use fictional information when testing.

## Maintainer and rights

Original software: [GNU AGPL-3.0-only](LICENSE). Original author-controlled artwork and branding: [All Rights Reserved](COPYRIGHT.md). External material keeps its [own licenses and attribution](THIRD_PARTY_NOTICES.md).

For ordinary feature requests and non-sensitive bugs, use [GitHub Issues](https://github.com/aymanbouanouj/ab-train-ticket-studio/issues).
