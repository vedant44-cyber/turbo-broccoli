import * as fs from 'fs/promises';
import { Vulnerability } from '../types';
import { FixGenerator } from './FixGenerator';

export class MockGitHubService {
  static async createFixPR(vuln: Vulnerability): Promise<string> {
    const fixCode = FixGenerator.generateFix(vuln);
    if (!fixCode) {
      throw new Error('No fix available for this vulnerability.');
    }

    const branchName = `fix/${vuln.ruleId}-${Date.now()}`;
    const prTitle = `Security Fix: ${vuln.message}`;
    const prBody = `This PR fixes a critical security issue detected by DeployGuard.\n\n**Vulnerability**: ${vuln.message}\n**Fix**: Applied recommended secure pattern.`;

    // Simulate creating a PR by writing a patch file
    const patchContent = `
# 🛡️ DeployGuard Security Patch
# ----------------------------------------------------------------
# PR Title: ${prTitle}
# Branch: ${branchName}
# Target File: ${vuln.file}
# ----------------------------------------------------------------

${fixCode}
`;

    const fileName = `deployguard-patch-${Date.now()}.diff`;
    await fs.writeFile(fileName, patchContent);

    console.log(`\n[GitHub Mock] 🐙 Created PR "${prTitle}"`);
    console.log(`[GitHub Mock] 📄 Diff generated at: ./${fileName}`);
    
    const org = process.env.GITHUB_ORG || 'mock-org';
    const repo = process.env.GITHUB_REPO || 'repo';
    return `https://github.com/${org}/${repo}/pull/${Math.floor(Math.random() * 1000)}`;
  }
}
