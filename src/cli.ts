import { Scanner } from './scanner/Scanner';
import { Rule } from './types';
import * as path from 'path';

// Placeholder for rule imports
import { exposedSecretsRule } from './rules/exposedSecrets';
import { jwtMisconfigurationRule } from './rules/jwtMisconfiguration';
import { brokenCorsRule } from './rules/brokenCors';
import { adminRouteRule } from './rules/adminRoutes';

const rules: Rule[] = [
  exposedSecretsRule,
  jwtMisconfigurationRule,
  brokenCorsRule,
  adminRouteRule
];

async function main() {
  const targetDir = process.argv[2] || process.cwd();
  console.log(`🛡️  DeployGuard Scanning: ${targetDir}`);

  const scanner = new Scanner(rules);
  const result = await scanner.scan(path.resolve(targetDir));

  console.log(`\n✅ Scan Complete in ${result.durationMs}ms`);
  console.log(`📂 Scanned ${result.scannedFiles} files`);
  console.log(`⚠️  Found ${result.vulnerabilities.length} vulnerabilities`);

  if (result.vulnerabilities.length > 0) {
    console.log('\n--- Vulnerabilities Found ---\n');
    result.vulnerabilities.forEach((v, idx) => {
      console.log(`${idx + 1}. [${v.severity}] ${v.ruleId}: ${v.message}`);
      console.log(`   File: ${v.file}:${v.line}`);
      console.log(`   Snippet: "${v.codeSnippet}"\n`);
    });
    process.exit(1);
  } else {
    console.log('\n✨ No obvious vulnerabilities found.');
  }
}

main().catch(console.error);
