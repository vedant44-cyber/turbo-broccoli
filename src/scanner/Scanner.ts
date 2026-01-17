import { Rule, ScanResult, Vulnerability, FileContext, ASTRule } from '../types';
import { parseToAST } from '../ast/astParser';

// File extensions that support AST parsing
const AST_SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

export class Scanner {
  private rules: Rule[];
  private astRules: ASTRule[];

  constructor(rules: Rule[], astRules: ASTRule[] = []) {
    this.rules = rules;
    this.astRules = astRules;
  }

  /**
   * Check if a file supports AST parsing based on its extension
   */
  private supportsAST(filePath: string): boolean {
    return AST_SUPPORTED_EXTENSIONS.some(ext => filePath.endsWith(ext));
  }

  /**
   * Scans a list of files provided in memory.
   */
  async scanFiles(files: FileContext[], allFilePaths?: string[]): Promise<ScanResult> {
    const startTime = Date.now();
    const vulnerabilities: Vulnerability[] = [];

    // Run rules on each file
    for (const file of files) {
      try {
        const context: FileContext = {
          path: file.path,
          content: file.content,
        };

        // --- Run Regex-based Rules ---
        for (const rule of this.rules) {
          // Special handling for gitignore validation - needs all files context
          if (rule.id === 'gitignore-validation') {
            continue; // Skip for now, we'll run it once at the end
          }

          const ruleVulns = rule.check(context);
          vulnerabilities.push(...ruleVulns);
        }

        // --- Run AST-based Rules ---
        if (this.supportsAST(file.path) && this.astRules.length > 0) {
          try {
            const ast = parseToAST(file.content, file.path);

            if (ast) {
              // Attach AST to context for potential future use
              context.ast = ast;

              for (const astRule of this.astRules) {
                // Check if rule applies to this file type
                const fileExt = '.' + file.path.split('.').pop();
                if (astRule.fileTypes.includes(fileExt)) {
                  try {
                    const astVulns = astRule.check(ast, context);
                    vulnerabilities.push(...astVulns);
                  } catch (ruleErr) {
                    console.warn(`[AST Rule ${astRule.id}] Error scanning ${file.path}:`, ruleErr);
                  }
                }
              }
            }
          } catch (parseErr) {
            // AST parsing failed - this is fine, regex rules still ran
            console.warn(`[AST Parser] Could not parse ${file.path}:`, parseErr);
          }
        }

      } catch (err) {
        console.error(`Error scanning file ${file.path}:`, err);
      }
    }

    // Run gitignore validation once with all files context
    const gitignoreRule = this.rules.find(r => r.id === 'gitignore-validation');
    if (gitignoreRule) {
      try {
        // Pass a dummy context and all files
        const dummyContext: FileContext = { path: '.gitignore', content: '' };
        // If allFilePaths is provided, use it. Otherwise derive from files list (though files list might be partial if chunked, 
        // but now we are client side we probably have all files or at least the ones we cared to read)
        // Ideally we pass the full list of file paths we know about.
        const paths = allFilePaths || files.map(f => f.path);
        const gitignoreVulns = gitignoreRule.check(dummyContext, files, paths);
        vulnerabilities.push(...gitignoreVulns);
      } catch (err) {
        console.error('Error running gitignore validation:', err);
      }
    }

    return {
      vulnerabilities,
      scannedFiles: files.length,
      durationMs: Date.now() - startTime,
    };
  }

  extractRoutes(files: FileContext[]): string[] {
    return files
      .filter(f => f.path.includes('route.ts') || f.path.includes('page.tsx'))
      .map(f => {
        // Convert file path to Next.js route path
        // Simple heuristic: split by 'app/'
        const parts = f.path.split('app/');
        if (parts.length < 2) return '/'; // Fallback

        let route = parts[1]
          .replace('/route.ts', '')
          .replace('/page.tsx', '')
          .replace('route.ts', '')
          .replace('page.tsx', '');

        if (route === '') route = '/';
        if (!route.startsWith('/')) route = '/' + route;

        return route;
      });
  }
}

