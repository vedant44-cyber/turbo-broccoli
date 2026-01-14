import { Vulnerability } from '../types';

export class FixGenerator {
  static generateFix(vuln: Vulnerability): string | null {
    switch (vuln.vulnType) {
      case 'JWT':
        if (vuln.ruleId === 'jwt-misconfig') {
          return `// [DeployGuard Fix] Use strong secret and algorithm
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("Missing JWT_SECRET");
const token = jwt.sign(payload, secret, { algorithm: 'HS256' });`;
        }
        break;

      case 'SECRET':
        return `// [DeployGuard Fix] Moved secret to environment variable
const apiKey = process.env.API_KEY;`;

      case 'CORS':
        return `// [DeployGuard Fix] Restrict CORS origin
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "https://your-domain.com",
  credentials: true
}));`;

      case 'ADMIN_ROUTE':
        return `// [DeployGuard Fix] Protect admin route
app.use('/admin', authenticateAdminMiddleware, adminRouter);`;
    }
    return null;
  }

  static generatePRUrl(vuln: Vulnerability): string {
    const fileName = vuln.file.split('/').pop();
    return `https://github.com/user/repo/pull/12/files?filename=${fileName}`;
  }
}
