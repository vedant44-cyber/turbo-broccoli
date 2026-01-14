import { glob } from 'glob';
import * as fs from 'fs/promises';
import { Rule, ScanResult, Vulnerability, FileContext } from '../types';
import * as path from 'path';

export class Scanner {
  private rules: Rule[];

  constructor(rules: Rule[]) {
    this.rules = rules;
  }

  async scan(projectPath: string): Promise<ScanResult> {
    const startTime = Date.now();
    const vulnerabilities: Vulnerability[] = [];
    let scannedFilesCount = 0;

    // Default ignores for performance and relevance
    const ignorePatterns = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/src/rules/**', // Ignore self-matching rules
      '**/*.lock',
      '**/*.png', // binary files
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.ico',
      '**/*.svg',
    ];

    try {
      const files = await glob('**/*', { 
        cwd: projectPath, 
        ignore: ignorePatterns,
        nodir: true,
        absolute: true
      });

      scannedFilesCount = files.length;

      for (const file of files) {
        try {
          // Read file content
          const content = await fs.readFile(file, 'utf-8');
          
          // Basic context creation
          const context: FileContext = {
            path: file,
            content,
            // AST parsing will be added here later if needed per file type
          };

          for (const rule of this.rules) {
            const ruleVulns = rule.check(context);
            vulnerabilities.push(...ruleVulns);
          }
        } catch (err) {
          console.error(`Error scanning file ${file}:`, err);
        }
      }

    } catch (err) {
      console.error('Error in glob search:', err);
    }

    return {
      vulnerabilities,
      scannedFiles: scannedFilesCount,
      durationMs: Date.now() - startTime,
    };
  }
}
