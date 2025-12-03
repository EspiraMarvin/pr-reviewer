# ChatGPT GitHub PR Review Assistant

**AI-Powered Pull Request Reviewer using ChatGPT**

This project integrates **OpenAI’s ChatGPT** with **GitHub Pull Requests** to provide automated code reviews. It automatically analyzes code changes and posts structured JSON feedback as PR comments, maintaining code quality and consistency.

---

## **Features**

- **Webhook verification** – Securely verifies incoming GitHub webhooks using HMAC signatures.
- **Pull Request diff extraction** – Automatically retrieves the changed files and code diff from a PR.
- **ChatGPT API call** – Sends PR diffs to GPT-4 to generate code review feedback.
- **Posting JSON feedback as PR comment** – Posts structured review comments directly on the PR in GitHub.

---

## **Tech Stack**

- **Backend:** Node.js + Express (TypeScript)
- **LLM API:** OpenAI GPT-4
- **Version Control:** GitHub webhooks & REST API
- **Dev Tools:** ts-node-dev, dotenv

---

## **Setup & Installation**

1. Clone the repository:

```bash
git clone https://github.com/EspiraMarvin/pr-reviewer.git
cd pr-reviewer
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a .env file in the root directory, copy the variables from .env.example:

```bash
PORT=3000
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
GITHUB_TOKEN=YOUR_GITHUB_PERSONAL_ACCESS_TOKEN
WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
```

4. Expose your local server

```bash
npx ngrok http 3000
```

5. Add a GitHub webhook to your repository:

```bash
Payload URL: https://<ngrok-url>/webhook
Content type: application/json
Secret: WEBHOOK_SECRET
Events: Pull Requests
```

6. Start server:

```bash
pnpm run server
```

## Usage

Open a Pull Request in the connected GitHub repository.

The server receives the webhook, extracts the code diff, sends it to ChatGPT, and posts structured JSON feedback as a comment.

Example output format:

```json
[
  {
    "issue": "Missing input validation on user registration",
    "severity": "High",
    "suggestion": "Add server-side validation for email and password format."
  },
  {
    "issue": "Inefficient loop in calculateTotal function",
    "severity": "Medium",
    "suggestion": "Consider using Array.reduce() instead of for loop."
  }
]
```
