import { Vulnerability } from '../types';

import { AIService } from '../services/aiService';

export class FixGenerator {
  static async generateFix(vuln: Vulnerability): Promise<string | null> {
    // Try AI fix first for critical/high issues (but skip GITIGNORE as static template is better)
    if (['CRITICAL', 'HIGH'].includes(vuln.severity) && vuln.vulnType !== 'GITIGNORE') {
      const aiFix = await AIService.generateFix(vuln.codeSnippet, vuln.description || '');
      if (aiFix) return aiFix;
    }

    // Fallback to static fixes
    switch (vuln.vulnType) {
      case 'JWT':
        if (vuln.ruleId === 'jwt-misconfig') {
          return `// [turbo-broccoli Fix] Use strong secret and algorithm
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("Missing JWT_SECRET");
const token = jwt.sign(payload, secret, { algorithm: 'HS256' });`;
        }
        break;

      case 'SECRET':
        return `// [turbo-broccoli Fix] Moved secret to environment variable
const apiKey = process.env.API_KEY;`;

      case 'CORS':
        return `// [turbo-broccoli Fix] Restrict CORS origin
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "https://your-domain.com",
  credentials: true
}));`;

      case 'ADMIN_ROUTE':
        return `// [turbo-broccoli Fix] Protect admin route
app.use('/admin', authenticateAdminMiddleware, adminRouter);`;

      case 'GITIGNORE':
        return `# [turbo-broccoli Fix] Add these critical patterns to .gitignore

# Environment variables
.env
.env.local
.env.*.local

# Dependencies
node_modules/

# Build outputs
dist/
build/
.next/
out/

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp`;
    }
    return null;
  }


}
