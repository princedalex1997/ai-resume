----------REGISTER-------------
// URL : POSThttp://localhost:8000/api/auth/register
register payload= {

    "name":"Maria",
    "email":"maria@gmail.com",
    "password":"maria@gmail.com"

}

---

------LOGIN--------
//URL :POST http://localhost:8000/api/auth/login

{
"email":"email@gmail.com",
"password":"12345678"
}

---------change name ----------
URL :PATCH http://localhost:8000/api/auth/updateprofile
{
"name":"Maria Jomol Jose"
}

---------Change PAssword ---------
URL :PATCH http://localhost:8000/api/auth/changePassword
{
"currentPassword":"maria@gmail.com",
"newPassword":"newPassword1234"
}

LIST OF ID BASED RESUME
URL : GET http://localhost:8000/api/resumes/6a38e5d71e0346df99a16a6b

LIST OF ALL RESUMES
URL : GET http://localhost:8000/api/resumes/

UPLOAD RESUME
URL : http://localhost:8000/api/resumes/
FILE : RESUME.PDF

GET ANY PARTICULAR RESUME URL : http://localhost:8000/api/resumes{resume id}

GET CURENT VERSION :
url :http://localhost:8000/api/resumes/resumeID/versions/versionid

// to get analysze resume url + resumeId:
// http://localhost:8000/api/resumes/resumeid/analyze

// htts / sumeid / rewrite

body analysi id : analysis id

http://localhost:8000/api/resumes/resumeID/rewrite

{
"analysisId":"6a3a5c6eebf77619777a4cf7"
}

compare 2 versions (GET)) (versionid from ResumeVersions)
url: http://localhost:8000/api/resumes/resumeid/diff?from=versionId&to=versionid

DASHBOARD API(GET) : http://localhost:8000/api/dashboard

# AI Resume Analyzer — Backend

A Node.js/Express backend that powers an AI-driven resume analysis platform. Users can upload PDF resumes, get them parsed into structured data, run AI-powered ATS (Applicant Tracking System) analysis using Google Gemini, apply AI-suggested bullet rewrites, track multiple resume versions, and view dashboards/insights on their progress over time.

## ✨ Features

- **Authentication** — Email/password registration & login with JWT stored in HTTP-only cookies, profile updates, and password change.
- **Resume Upload & Parsing** — Upload a PDF resume; text is extracted (`pdf-parse`) and converted into structured JSON (basics, experience, education, skills, projects, certifications, etc.) using Gemini.
- **AI ATS Analysis** — Get an ATS-readiness score (0–100) with a breakdown across keywords, formatting, impact, and clarity, plus prioritized issues, strengths, missing/present keywords, and a written summary.
- **Bullet Rewrites** — AI-generated, quantified rewrites for weak resume bullets that can be selectively applied to create a new resume version.
- **Version Control** — Every upload and rewrite creates a new tracked `ResumeVersion`, with a word/line-level diff viewer between any two versions.
- **Dashboard & Insights** — Aggregated KPIs (ATS score trend, versions, issues, keyword match rate), score history, top recurring issues, and top missing/present keywords across all resumes.
- **Activity History** — Unified timeline of uploads, rewrites, and analyses.
- **Rate Limiting** — Separate limiters for auth endpoints and AI analysis endpoints to prevent abuse.

## 🛠️ Tech Stack

| Layer         | Technology                                          |
| ------------- | --------------------------------------------------- |
| Runtime       | Node.js                                             |
| Framework     | Express 5                                           |
| Database      | MongoDB (Mongoose)                                  |
| Auth          | JWT (`jsonwebtoken`) + `bcrypt` + HTTP-only cookies |
| AI            | Google Gemini (`@google/genai`)                     |
| PDF Parsing   | `pdf-parse`                                         |
| Validation    | Zod                                                 |
| File Uploads  | Multer (in-memory, PDF only, 5MB limit)             |
| Diffing       | `diff`                                              |
| Rate Limiting | `express-rate-limit`                                |
| Logging       | `morgan`, `colors`                                  |

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js            # MongoDB connection
│   │   └── env.js           # Environment variable loading & validation
│   ├── middleware/
│   │   ├── auth.js          # JWT auth guard
│   │   ├── errorHandler.js  # Centralized error handling
│   │   ├── rateLimit.js     # Auth & analysis rate limiters
│   │   ├── upload.js        # Multer PDF upload handler
│   │   └── validate.js      # Zod request validation
│   ├── models/
│   │   ├── User.js
│   │   ├── Resume.js
│   │   ├── ResumeVersion.js
│   │   └── Analysis.js
│   ├── routes/
│   │   ├── auth.js          # /api/auth
│   │   ├── resume.js        # /api/resumes
│   │   ├── dashboard.js     # /api/dashboard
│   │   ├── insights.js      # /api/insight
│   │   ├── versions.js      # /api/versions
│   │   ├── history.js       # /api/history
│   │   └── health.js        # /api/health
│   ├── services/
│   │   ├── geminiService.js       # ATS analysis via Gemini
│   │   ├── structuredParser.js    # Resume -> structured JSON via Gemini
│   │   ├── pdfService.js          # PDF text extraction
│   │   └── diffService.js         # Version diffing
│   ├── utils/
│   │   ├── ApiError.js
│   │   ├── asyncHandler.js
│   │   └── jwt.js
│   └── server.js
├── package.json
└── .env
```

## 🔌 API Endpoints

### Auth — `/api/auth`

| Method | Endpoint          | Description                       | Auth |
| ------ | ----------------- | --------------------------------- | ---- |
| POST   | `/register`       | Register a new user               | ❌   |
| POST   | `/login`          | Log in and receive session cookie | ❌   |
| POST   | `/logout`         | Clear session cookie              | ❌   |
| PATCH  | `/updateprofile`  | Update name                       | ✅   |
| PATCH  | `/changePassword` | Change password                   | ✅   |

### Resumes — `/api/resumes`

| Method | Endpoint                    | Description                                            |
| ------ | --------------------------- | ------------------------------------------------------ |
| POST   | `/`                         | Upload a PDF resume (creates Resume + V1)              |
| GET    | `/`                         | List all resumes for the current user                  |
| GET    | `/:id`                      | Get a resume with all its versions                     |
| GET    | `/:id/versions/:versionId`  | Get a specific version (with raw text)                 |
| DELETE | `/:id`                      | Delete a resume and its versions/analyses              |
| POST   | `/:id/analyze`              | Run AI ATS analysis on a version                       |
| GET    | `/:id/analyze`              | List all analyses for a resume                         |
| POST   | `/:id/rewrite`              | Apply selected bullet rewrites, creating a new version |
| GET    | `/:id/diff?from=&to=&mode=` | Diff two versions (word or line mode)                  |

All resume routes require authentication.

### Dashboard, Insights, Versions, History

| Method | Endpoint         | Description                                                               |
| ------ | ---------------- | ------------------------------------------------------------------------- |
| GET    | `/api/dashboard` | KPIs, score series, recent activity                                       |
| GET    | `/api/insight`   | Aggregated insights across all resumes (top issues/keywords, performance) |
| GET    | `/api/versions`  | All versions across all resumes                                           |
| GET    | `/api/history`   | Combined activity timeline                                                |
| GET    | `/api/health`    | Server & DB health check                                                  |

## ⚙️ Environment Variables

Create a `.env` file inside `backend/`:

```env
NODE_ENV=development
PORT=5000

MONGO_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JET_EXPRESS_IN=5d
COOKIE_NAME=arr-_token

CLIENT_ORGIN=http://localhost:5173,http://localhost:5174

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODAL=gemini-2.0-flash
```

| Variable         | Required             | Description                          |
| ---------------- | -------------------- | ------------------------------------ |
| `MONGO_URL`      | ✅                   | MongoDB connection string            |
| `JWT_SECRET`     | ✅                   | Secret used to sign JWTs             |
| `PORT`           | ❌                   | Server port (default `5000`)         |
| `JET_EXPRESS_IN` | ❌                   | JWT expiry (default `5d`)            |
| `COOKIE_NAME`    | ❌                   | Session cookie name                  |
| `CLIENT_ORGIN`   | ❌                   | Comma-separated allowed CORS origins |
| `GEMINI_API_KEY` | ✅ (for AI features) | Google Gemini API key                |
| `GEMINI_MODAL`   | ✅ (for AI features) | Gemini model name to use             |

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- A MongoDB instance (local or Atlas)
- A Google Gemini API key

### Installation

```bash
git clone <your-repo-url>
cd backend
npm install
```

Set up your `.env` file as shown above, then run:

```bash
npm run dev
```

The server will start at `http://localhost:5000` (or your configured `PORT`).

### Available Scripts

| Script         | Description                                  |
| -------------- | -------------------------------------------- |
| `npm run dev`  | Start the server with nodemon (auto-restart) |
| `npm start`    | Start the server with nodemon                |
| `npm run seed` | Run the database seed script                 |

## 🔒 Authentication Flow

1. On register/login, the server signs a JWT and sets it as an HTTP-only cookie (`cookiesOptions` in `utils/jwt.js`).
2. Protected routes use the `requiredAuth` middleware, which reads the cookie, verifies the JWT, and attaches `req.user`.
3. Cookies use `secure`/`sameSite` settings that adapt automatically between development and production.

## 🤖 AI Pipeline

1. **Upload** → PDF text is extracted via `pdfService`.
2. **Structured Parsing** → `structuredParser` sends the raw text to Gemini with a strict JSON schema to produce structured resume data (basics, experience, education, skills, etc.).
3. **Analysis** → `geminiService` sends the resume text to Gemini to generate an ATS score, breakdown, issues, strengths, keyword gaps, and bullet rewrites — validated with Zod and retried with exponential backoff on transient failures.
4. **Rewrite Application** → Selected rewrites are merged back into the resume's raw text and re-parsed to produce a new version.

## 📝 License

ISC
