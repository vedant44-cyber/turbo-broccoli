import { Rule, Vulnerability, FileContext } from '../types';

// Helper to calculate line number
function getLineNumber(content: string, matchIndex: number): number {
  return content.substring(0, matchIndex).split('\n').length;
}

export const jwtMisconfigurationRule: Rule = {
  id: 'jwt-misconfig',
  name: 'JWT Misconfiguration',
  description: 'Detects insecure JWT usage such as "none" algorithm or weak/hardcoded secrets.',
  severity: 'CRITICAL',
  check: (context: FileContext): Vulnerability[] => {
    const vulnerabilities: Vulnerability[] = [];

    // Check for "none" algorithm
    const noneMatch = context.content.match(/['"]alg['"]\s*:\s*['"]none['"]/i) || context.content.match(/algorithm:\s*['"]none['"]/i);
    if (noneMatch && noneMatch.index !== undefined) {
      vulnerabilities.push({
        ruleId: 'jwt-misconfig',
        file: context.path,
        line: getLineNumber(context.content, noneMatch.index),
        severity: 'CRITICAL',
        message: 'JWT "none" algorithm detected.',
        codeSnippet: 'alg: "none"',
        vulnType: 'JWT',
        description: 'The "none" algorithm allows attackers to forge tokens by removing the signature.',
        fixSuggestion: 'Use HS256 or RS256 and verify signatures.',
      });
    }

    // Check for obvious hardcoded secrets in jwt.sign
    const signMatch = context.content.match(/jwt\.sign\s*\([^,]+,\s*['"]([^'"]+)['"]/);
    if (signMatch && signMatch.index !== undefined && signMatch[1].length < 32 && !signMatch[1].startsWith('process.env')) {
      vulnerabilities.push({
        ruleId: 'jwt-misconfig',
        file: context.path,
        line: getLineNumber(context.content, signMatch.index),
        severity: 'HIGH',
        message: 'Weak or hardcoded JWT secret identified.',
        codeSnippet: signMatch[0],
        vulnType: 'JWT',
        description: 'Hardcoded secrets make it easy for attackers to forge valid tokens.',
        fixSuggestion: 'Use a strong secret stored in an environment variable (process.env.JWT_SECRET).',
      });
    }

    return vulnerabilities;
  },
};
