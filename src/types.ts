export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Vulnerability {
  ruleId: string;
  file: string;
  line: number;
  column?: number;
  severity: Severity;
  message: string;
  codeSnippet: string;
  description?: string;
  fixSuggestion?: string;
  vulnType: 'JWT' | 'SECRET' | 'CORS' | 'IDOR' | 'ADMIN_ROUTE' | 'GITIGNORE' | 'OTHER';
}

export interface FileContext {
  path: string;
  content: string;
  ast?: any; // For future AST based rules
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  check: (context: FileContext, allFiles?: FileContext[], allFilePaths?: string[]) => Vulnerability[];
}

export interface ScanResult {
  vulnerabilities: Vulnerability[];
  scannedFiles: number;
  durationMs: number;
}
