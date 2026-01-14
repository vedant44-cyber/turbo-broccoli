import { Rule, Vulnerability, FileContext } from '../types';

const SECRET_PATTERNS = [
  {
    name: 'AWS Access Key',
    regex: /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/,
  },
  {
    name: 'Private Key',
    regex: /-----BEGIN PRIVATE KEY-----/,
  },
  {
    name: 'Generic API Key',
    regex: /api[_-]?key\s*[:=]\s*['"]([a-zA-Z0-9_\-]{32,})['"]/, // Crude heuristic
  },
  {
      name: 'Google API Key',
      regex: /AIza[0-9A-Za-z\\-_]{35}/
  }
];

export const exposedSecretsRule: Rule = {
  id: 'exposed-secrets',
  name: 'Exposed Secrets',
  description: 'Detects hardcoded secrets, API keys, and credentials in source code.',
  severity: 'CRITICAL',
  check: (context: FileContext): Vulnerability[] => {
    const vulnerabilities: Vulnerability[] = [];
    const lines = context.content.split('\n');

    lines.forEach((line, index) => {
      // Skip if line looks like an ENV variable definition in a .env.example file or similar
      if (context.path.includes('.example') || context.path.includes('.template')) {
          return;
      }
      
      for (const pattern of SECRET_PATTERNS) {
        const match = line.match(pattern.regex);
        if (match) {
          vulnerabilities.push({
            ruleId: 'exposed-secrets',
            file: context.path,
            line: index + 1,
            severity: 'CRITICAL',
            message: `Possible ${pattern.name} found in code.`,
            codeSnippet: line.trim().substring(0, 100), // Truncate for display
            vulnType: 'SECRET',
            description: 'Hardcoded secrets can be stolen by attackers scanning public repositories.',
            fixSuggestion: 'Move this secret to an environment variable (.env) and access it via process.env.',
          });
        }
      }
    });

    return vulnerabilities;
  },
};
