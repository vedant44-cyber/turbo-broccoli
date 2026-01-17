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
  ast?: import('acorn').Node;
}

export interface ASTRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  fileTypes: string[]; // e.g., ['.ts', '.tsx', '.js', '.jsx']
  check: (
    ast: import('acorn').Node,
    context: FileContext
  ) => Vulnerability[];
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

export interface DynamicContext {
  baseUrl: string;
  route: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

export interface DynamicRule {
  id: string;
  name: string;
  description?: string;
  check: (url: string) => Promise<Vulnerability | null>;
}
