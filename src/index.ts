import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;

// gitHub webhook payload types
interface PullRequestFile {
  filename: string;
  patch?: string;
}

interface PullRequestPayload {
  action: string;
  repository: {
    name: string;
    owner: { login: string };
  };
  pull_request: {
    number: number;
    url: string;
  };
}

// verify gitHub webhook signature
function verifySignature(req: Request, buf: Buffer): boolean {
  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(buf).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// middleware to save raw body for signature verification
app.use(
  bodyParser.json({
    verify: (req: Request & { rawBody?: Buffer }, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// webhook endpoint
app.post(
  '/webhook',
  async (req: Request & { rawBody?: Buffer }, res: Response) => {
    if (!req.rawBody || !verifySignature(req, req.rawBody)) {
      return res.status(401).send('Invalid signature');
    }

    const event = req.headers['x-github-event'] as string;
    const payload = req.body as PullRequestPayload;

    if (
      event === 'pull_request' &&
      ['opened', 'synchronize'].includes(payload.action)
    ) {
      const prNumber = payload.pull_request.number;
      const owner = payload.repository.owner.login;
      const repo = payload.repository.name;

      try {
        // Get PR files
        const filesResponse = await axios.get<PullRequestFile[]>(
          `${payload.pull_request.url}/files`,
          { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
        );

        const codeDiff = filesResponse.data
          .map((f) => `File: ${f.filename}\nChanges:\n${f.patch || ''}`)
          .join('\n\n');

        const prompt = `
You are a senior software engineer. Review this PR diff and return JSON with issues, severity, and suggestions.

Diff:
${codeDiff}

Return output in this format:
[
  {
    "issue": "Issue description",
    "severity": "Low/Medium/High",
    "suggestion": "Suggestion to fix"
  }
]
      `;

        // call OpenAI GPT API
        const gptResponse = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
          },
          { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
        );

        const reviewComments = gptResponse.data.choices[0].message.content;

        // Post comment on PR
        await axios.post(
          `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
          { body: `### AI Code Review\n\`\`\`json\n${reviewComments}\n\`\`\`` },
          { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
        );

        res.status(200).send('PR reviewed');
      } catch (err: any) {
        console.error(err.response?.data || err.message);
        res.status(500).send('Error reviewing PR');
      }
    } else {
      res.status(200).send('Event ignored');
    }
  }
);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
