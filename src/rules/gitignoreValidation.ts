import { Rule, Vulnerability, FileContext } from '../types';

const CRITICAL_PATTERNS = [
    { pattern: /^\.env$/m, name: '.env' }
];

const HIGH_PRIORITY_PATTERNS = [
    { pattern: /^node_modules\/?$/m, name: 'node_modules/' },
    { pattern: /^npm-debug\.log\*?$/m, name: '*.log files' },
];

const MEDIUM_PRIORITY_PATTERNS = [
    { pattern: /^dist\/?$/m, name: 'dist/' },
    { pattern: /^build\/?$/m, name: 'build/' },
    { pattern: /^\.next\/?$/m, name: '.next/' },
    { pattern: /^out\/?$/m, name: 'out/' },
    { pattern: /^\.DS_Store$/m, name: '.DS_Store' },
    { pattern: /^\.vscode\/?$/m, name: '.vscode/' },
    { pattern: /^\.idea\/?$/m, name: '.idea/' },
];

//  it checks across ALL files
export const gitignoreValidationRule: Rule = {
    id: 'gitignore-validation',
    name: 'Gitignore Validation',
    description: 'Validates .gitignore file to ensure critical patterns are included and detects exposed sensitive files.',
    severity: 'CRITICAL',
    check: (context: FileContext, allFiles?: FileContext[], allFilePaths?: string[]): Vulnerability[] => {
        const vulnerabilities: Vulnerability[] = [];

        if (!allFiles && !allFilePaths) {
            return vulnerabilities;
        }
        const gitignorePath = allFilePaths
            ? allFilePaths.find(p => p.endsWith('.gitignore') || p === '.gitignore')
            : allFiles?.find(f => f.path.endsWith('.gitignore') || f.path === '.gitignore')?.path;

        const gitignoreInBatch = allFiles?.find(f => f.path.endsWith('.gitignore') || f.path === '.gitignore');

        if (!gitignorePath) {
            const envExists = allFilePaths
                ? allFilePaths.some(p => {
                    const filename = p.split('/').pop() || '';
                    return filename === '.env' || filename.startsWith('.env.');
                })
                : allFiles?.some(f => {
                    const filename = f.path.split('/').pop() || '';
                    return filename === '.env' || filename.startsWith('.env.');
                });

            if (envExists) {
                vulnerabilities.push({
                    ruleId: 'gitignore-validation',
                    file: '.gitignore',
                    line: 1,
                    severity: 'CRITICAL',
                    message: `No .gitignore file found, but .env file(s) detected in project!`,
                    codeSnippet: `# Missing .gitignore file`,
                    vulnType: 'GITIGNORE',
                    description: 'Environment files containing sensitive credentials are present but not protected by .gitignore. These files will be committed to version control!',
                    fixSuggestion: 'Create a .gitignore file immediately and add .env patterns to prevent credential leaks.',
                });
            } else {
                vulnerabilities.push({
                    ruleId: 'gitignore-validation',
                    file: '.gitignore',
                    line: 1,
                    severity: 'HIGH',
                    message: 'No .gitignore file found in project',
                    codeSnippet: '# Missing .gitignore file',
                    vulnType: 'GITIGNORE',
                    description: 'Projects should have a .gitignore file to prevent accidentally committing sensitive files, dependencies, and build artifacts.',
                    fixSuggestion: 'Create a .gitignore file with appropriate patterns for your project type.',
                });
            }
            return vulnerabilities;
        }

        // If .gitignore exists but is NOT in this batch, we return.
        // Another batch containing .gitignore will validate its content.
        if (!gitignoreInBatch) {
            return [];
        }

        // .gitignore exists AND is in this batch - check its contents
        const gitignoreContent = gitignoreInBatch.content;
        const missingPatterns: { name: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' }[] = [];

        // Check critical patterns
        for (const { pattern, name } of CRITICAL_PATTERNS) {
            if (!pattern.test(gitignoreContent)) {
                // Check if actual .env files exist globally
                const envExists = allFilePaths
                    ? allFilePaths.some(p => {
                        const filename = p.split('/').pop() || '';
                        return filename === '.env' || filename.startsWith('.env.');
                    })
                    : allFiles?.some(f => {
                        const filename = f.path.split('/').pop() || '';
                        return filename === '.env' || filename.startsWith('.env.');
                    });

                if (envExists) {
                    missingPatterns.push({ name, severity: 'CRITICAL' });
                } else {
                    missingPatterns.push({ name, severity: 'HIGH' });
                }
            }
        }

        // Check high priority patterns
        for (const { pattern, name } of HIGH_PRIORITY_PATTERNS) {
            if (!pattern.test(gitignoreContent)) {
                missingPatterns.push({ name, severity: 'HIGH' });
            }
        }

        // Check medium priority patterns
        for (const { pattern, name } of MEDIUM_PRIORITY_PATTERNS) {
            if (!pattern.test(gitignoreContent)) {
                missingPatterns.push({ name, severity: 'MEDIUM' });
            }
        }

        // Group by severity and create vulnerabilities
        const criticalMissing = missingPatterns.filter(p => p.severity === 'CRITICAL');
        const highMissing = missingPatterns.filter(p => p.severity === 'HIGH');
        const mediumMissing = missingPatterns.filter(p => p.severity === 'MEDIUM');

        if (criticalMissing.length > 0) {
            vulnerabilities.push({
                ruleId: 'gitignore-validation',
                file: gitignoreInBatch.path,
                line: 1,
                severity: 'CRITICAL',
                message: `Missing critical patterns in .gitignore: ${criticalMissing.map(p => p.name).join(', ')}`,
                codeSnippet: '# .gitignore is missing critical environment file patterns',
                vulnType: 'GITIGNORE',
                description: 'Environment files (.env) are present in your project but not listed in .gitignore. They WILL be committed to Git!',
                fixSuggestion: 'Add .env, .env.local, and .env.*.local to your .gitignore file immediately.',
            });
        }

        if (highMissing.length > 0) {
            vulnerabilities.push({
                ruleId: 'gitignore-validation',
                file: gitignoreInBatch.path,
                line: 1,
                severity: 'HIGH',
                message: `Missing important patterns in .gitignore: ${highMissing.map(p => p.name).join(', ')}`,
                codeSnippet: '# .gitignore is missing dependency/log patterns',
                vulnType: 'GITIGNORE',
                description: 'Dependencies and log files should not be committed as they bloat the repository and may contain sensitive information.',
                fixSuggestion: 'Add node_modules/ and *.log to your .gitignore file.',
            });
        }

        if (mediumMissing.length > 0) {
            vulnerabilities.push({
                ruleId: 'gitignore-validation', // Fixed typo
                file: gitignoreInBatch.path,
                line: 1,
                severity: 'MEDIUM',
                message: `Missing recommended patterns in .gitignore: ${mediumMissing.map(p => p.name).join(', ')}`,
                codeSnippet: '# .gitignore is missing build/IDE patterns',
                vulnType: 'GITIGNORE',
                description: 'Build artifacts and IDE configurations should not be committed to keep the repository clean.',
                fixSuggestion: 'Add build directories (dist/, build/, .next/) and IDE configs (.vscode/, .idea/) to .gitignore.',
            });
        }

        return vulnerabilities;
    },
};
