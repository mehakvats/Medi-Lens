# MediLens
Whatever action you can do yourself, please do yourself. This includes starting apps and performing verifications.

MediLens is a calm, premium personal health-intelligence interface that helps people organise medical reports, understand laboratory reference ranges, compare results over time, and prepare questions for a healthcare professional.

> MediLens provides educational information and report organisation. It does not diagnose conditions, prescribe treatment, or replace professional medical advice.

## What this build includes

- A responsive public landing page with a product-led report preview
- A fully interactive browser-based demo workspace, clearly marked as containing sample data
- Report archive with client-side search across report type, date, and parameters
- Report-detail dialog with extracted parameters, laboratory ranges, status text, confidence, and plain-language explanations
- Side-by-side report comparison using shared structured parameters
- Parameter trend visualisation with laboratory reference ranges
- Doctor-discussion prompts with working copy actions
- Accessible controls, keyboard focus styles, intentional mobile navigation, and a light/dark preference
- Browser-local OCR for JPG/PNG lab-report images: selected images are read on-device and never transmitted or retained

## Product decisions

The interface avoids health scores and diagnostic language. It surfaces values alongside the range provided by the laboratory and uses plain phrasing such as “above range” and “worth discussing.” Semantic status colors are always paired with text.

Demo reports are intentionally labelled. Adding a file creates an explicitly labelled sample analysis so that the workspace can demonstrate the document-review flow without claiming to have read a medical file.

## Stack

- React 19 + TypeScript
- Vite
- Hand-authored responsive CSS and SVG data visualisation (no generic dashboard UI kit)

## Run locally

```bash
npm install
npm run dev
```

Run a production check with:

```bash
npm run build
```

## Production architecture next steps

This repository is a polished client-side prototype. A production implementation should place sensitive processing behind an authenticated server boundary:

```text
React client
  -> authenticated REST API
  -> encrypted object storage + MongoDB/Mongoose
  -> document-quality check / PDF text extraction / OCR
  -> parameter normalisation service
  -> schema-validated AI provider abstraction
  -> structured report, comparison, trends, and questions APIs
```

The supplied `.env.example` names the server-side configuration required for that stage. API keys, medical files, password hashes, and database credentials must never be sent to or stored in the browser.

## Suggested API surface

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/reports/upload
GET    /api/reports
GET    /api/reports/:id
DELETE /api/reports/:id
POST   /api/reports/compare
GET    /api/trends/:parameter
POST   /api/questions
```

## Safety and privacy

- OCR accepts JPG, JPEG, and PNG report images up to 10 MB; files are rejected locally when they do not meet these constraints.
- The demo never uploads the selected file.
- A real system should validate file signatures, scan uploads, authorise every resource by user, rate-limit endpoints, hash passwords with Argon2/bcrypt, use secure HTTP-only sessions or carefully scoped JWTs, encrypt storage, and retain clear deletion/audit controls.
- AI output should be constrained to a versioned JSON schema and rejected if it includes missing, malformed, or unsupported fields.

## Limitations

This client-only showcase does not implement authentication, PDF parsing, durable storage, server-side upload handling, or a live AI provider. It performs on-device image OCR for a defined set of common parameters (HbA1c, hemoglobin, LDL, vitamin D, and TSH); all extracted values must be checked against the original report.

