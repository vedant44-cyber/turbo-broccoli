import { glob } from 'glob';
import * as fs from 'fs/promises';
import { Rule, ScanResult, Vulnerability, FileContext } from '../types';
import * as path from 'path';

export class Scanner {
  private rules: Rule[];

  constructor(rules: Rule[]) {
    this.rules = rules;
  }

  /**
   * Scans a list of files provided in memory.
   */
  async scanFiles(files: FileContext[], allFilePaths?: string[]): Promise<ScanResult> {
    const startTime = Date.now();
    const vulnerabilities: Vulnerability[] = [];

    for (const file of files) {
      try {
        const context: FileContext = {
          path: file.path,
          content: file.content,
        };

        for (const rule of this.rules) {
          // Special handling for gitignore validation - needs all files context
          if (rule.id === 'gitignore-validation') {
            continue; // Skip for now, we'll run it once at the end
          }

          const ruleVulns = rule.check(context);
          vulnerabilities.push(...ruleVulns);
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
        const gitignoreVulns = gitignoreRule.check(dummyContext, files, allFilePaths);
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

  /**
   * Scans a directory from the local file system.
   */
  async scanDirectory(projectPath: string): Promise<ScanResult> {
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
      const paths = await glob('**/*', {
        cwd: projectPath,
        ignore: ignorePatterns,
        nodir: true,
        absolute: true
      });

      const files: FileContext[] = [];
      for (const p of paths) {
        try {
          const content = await fs.readFile(p, 'utf-8');
          files.push({ path: p, content });
        } catch (err) {
          console.error(`Error reading file ${p}:`, err);
        }
      }

      return this.scanFiles(files);

    } catch (err) {
      console.error('Error in glob search:', err);
      return { vulnerabilities: [], scannedFiles: 0, durationMs: 0 };
    }
  }

  // Legacy method for backward compatibility if needed, aliased to scanDirectory
  async scan(projectPath: string): Promise<ScanResult> {
    return this.scanDirectory(projectPath);
  }

}
