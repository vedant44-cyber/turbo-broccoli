import { NextResponse } from 'next/server';
import { Scanner } from '@/scanner/Scanner'; // Adjust import based on aliases
import { exposedSecretsRule } from '@/rules/exposedSecrets';
import { jwtMisconfigurationRule } from '@/rules/jwtMisconfiguration';
import { brokenCorsRule } from '@/rules/brokenCors';
import { adminRouteRule } from '@/rules/adminRoutes';
import path from 'path';
import 'dotenv/config';

export async function POST() {
  try {
    const rules = [
      exposedSecretsRule,
      jwtMisconfigurationRule,
      brokenCorsRule,
      adminRouteRule
    ];

    const scanner = new Scanner(rules);
    // In a real app, you might scan a specific repo path. 
    // For this MVP, we scan the current project root to find our 'vulnerable_app_test.ts'
    const projectRoot = process.cwd();

    const result = await scanner.scan(projectRoot);

    // FILTER RESULTS FOR DEMO CLARITY
    // Only show vulnerabilities found in our "test" file to reduce noise
    const demoVulnerabilities = result.vulnerabilities.filter(v =>
      v.file.includes('vulnerable_app_test.ts')
    );

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        vulnerabilities: demoVulnerabilities
      }
    });
  } catch (error) {
    console.error('Scan failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute scan' },
      { status: 500 }
    );
  }
}
