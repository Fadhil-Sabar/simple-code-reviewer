# Smart Code Reviewer

## 1. Overview

Smart Code Reviewer adalah web app sederhana yang menggunakan AI untuk melakukan review awal terhadap potongan kode sebelum masuk ke human code review.

Fokus review:

* Readability
* Code structure
* Maintainability

Aplikasi tidak menggantikan human reviewer, hanya membantu menemukan issue awal dengan cepat.

## 2. Goal

Membantu developer menemukan masalah dasar pada kode sebelum human review, sehingga reviewer dapat lebih fokus pada logic, architecture, dan business requirements.

## 3. Tech Stack

### Frontend

* SvelteKit
* TypeScript

### Backend

* Bun
* Hono
* OpenAI-compatible LLM API

## 4. Core Flow

```text
User pastes code
      ↓
Click "Review Code"
      ↓
SvelteKit sends request to Hono API
      ↓
Hono sends structured prompt to LLM
      ↓
LLM detects the code context/language automatically
      ↓
Structured review displayed to user
```

## 5. MVP Features

### 5.1 Code Input

User hanya perlu:

* Paste code snippet
* Click `Review Code`

Tidak ada pemilihan programming language. AI menentukan konteks kode langsung dari snippet yang diberikan.

### 5.2 AI Code Review

AI mengevaluasi tiga area utama.

#### Readability

* Naming clarity
* Code clarity
* Unnecessary complexity

#### Structure

* Function responsibility
* Separation of concerns
* Code organization
* Duplication

#### Maintainability

* Tight coupling
* Repeated logic
* Error handling
* Extensibility

## 6. Review Output

Contoh:

```text
Overall Score: 7/10

Readability
- Variable `data` is too generic.
- Consider renaming it based on its actual purpose.

Structure
- The function handles multiple responsibilities.
- Consider separating validation and data processing.

Maintainability
- Error handling is duplicated.
- Extract shared error handling into a helper.

Positive Note
- The function has a clear input and return value.
```

## 7. API

### Endpoint

```http
POST /api/review
```

### Request

```json
{
  "code": "..."
}
```

### Response

```json
{
  "score": 7,
  "readability": [
    {
      "issue": "Variable naming is too generic",
      "suggestion": "Use a name that describes the value being stored."
    }
  ],
  "structure": [],
  "maintainability": [],
  "positiveNote": "The function has a clear responsibility."
}
```

## 8. AI Behaviour

AI harus:

* Detect programming language/context automatically
* Review hanya berdasarkan code yang diberikan
* Tidak mengarang context yang tidak tersedia
* Fokus pada practical engineering improvements
* Menghindari subjective style preferences
* Memberikan alasan singkat untuk recommendation
* Tidak melakukan full rewrite kecuali diperlukan
* Memberikan minimal satu positive note
* Menghasilkan structured JSON

## 9. UI

Single-page interface.

```text
┌─────────────────────────────────────────┐
│ Smart Code Reviewer                     │
│ AI-assisted pre-review for developers   │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Paste your code here...             │ │
│ │                                     │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              [ Review Code ]            │
├─────────────────────────────────────────┤
│ Overall Score: 7/10                     │
│                                         │
│ Readability                             │
│ Structure                               │
│ Maintainability                         │
│ Positive Note                           │
└─────────────────────────────────────────┘
```

## 10. Error Handling

Handle:

* Empty code
* Code terlalu panjang
* Invalid LLM response
* LLM API timeout
* API rate limit
* Missing API key

API key hanya disimpan di backend.

```env
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=
```

## 11. Out of Scope

Tidak perlu untuk MVP:

* GitHub integration
* Pull Request integration
* Authentication
* Database
* Review history
* Multi-file analysis
* Automatic code modification
* Agent framework
* Manual language selection

## 12. Suggested Project Structure

```text
smart-code-reviewer/
├── apps/
│   ├── web/
│   │   └── SvelteKit
│   │
│   └── api/
│       └── Hono + Bun
│
├── package.json
└── README.md
```

Bun workspace:

```json
{
  "workspaces": [
    "apps/*"
  ]
}
```
