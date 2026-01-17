import { Rule, Vulnerability, FileContext } from '../types';

export const adminRouteRule: Rule = {
  id: 'admin-route',
  name: 'Unprotected Admin Route',
  description: 'Detects admin routes that might lack proper middleware protection.',
  severity: 'HIGH',
  check: (context: FileContext): Vulnerability[] => {
    const vulnerabilities: Vulnerability[] = [];
    const lines = context.content.split('\n');

    lines.forEach((line, index) => {
      if (line.match(/['"]\/?(api\/)?admin/)) {
        const isProtected = line.match(/auth|protect|guard|middleware|verify/i);
        if (!isProtected) {
          vulnerabilities.push({
            ruleId: 'admin-route',
            file: context.path,
            line: index + 1,
            severity: 'HIGH',
            message: 'Potential unprotected admin route.',
            codeSnippet: line.trim(),
            vulnType: 'ADMIN_ROUTE',
            description: 'Admin routes should be explicitly protected by authentication middleware.',
            fixSuggestion: 'Add authentication middleware (e.g., verifyToken, requireAdmin) to this route.',
          });
        }
      }
    });

    return vulnerabilities;
  },
};
