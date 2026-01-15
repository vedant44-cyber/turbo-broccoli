import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

// Simple in-memory rate limiter
// Allow 5 requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 3;
let requestCount = 0;
let windowStart = Date.now();

export class AIService {
    private static genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
    private static model = AIService.genAI ? AIService.genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" }) : null;

    static async generateFix(codeSnippet: string, vulnerability: string): Promise<string | null> {
        if (!this.model) {
            console.warn("Gemini API Key missing. Skipping AI fix.");
            return null;
        }

        // Rate Limiting Check
        const now = Date.now();
        if (now - windowStart > RATE_LIMIT_WINDOW) {
            requestCount = 0;
            windowStart = now;
        }

        if (requestCount >= MAX_REQUESTS) {
            console.warn("Rate limit exceeded for AI Fix generation.");
            return "// Rate limit exceeded. Please try again later.";
        }

        requestCount++;

        try {
            const prompt = `
  You are a security expert. Fix the following vulnerability.
  Vulnerability: ${vulnerability}
  Code:
  \`\`\`
  ${codeSnippet}
  \`\`\`
  
  Provide ONLY the fixed code block. No markdown, no explanations.
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            // Clean up markdown code blocks if present
            text = text.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '');

            return text.trim();
        } catch (error) {
            console.error("AI Generation failed:", error);
            return null;
        }
    }
}
