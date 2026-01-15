import { NextResponse } from 'next/server';
import { FixGenerator } from '@/fixer/FixGenerator';
import { Vulnerability } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const vuln = body.vuln as Vulnerability;

    if (!vuln) {
      return NextResponse.json({ success: false, error: 'No vulnerability provided' }, { status: 400 });
    }

    const fixCode = await FixGenerator.generateFix(vuln);

    if (!fixCode) {
      return NextResponse.json({ success: false, error: 'No fix available' }, { status: 404 });
    }

    // Generate Patch Format
    const patchContent = `
/* 🛡️ DeployGuard Fix Suggestion
 * File: ${vuln.file}
 * Issue: ${vuln.message}
 * ----------------------------------------------------------------
 * Instructions: Manually replace the vulnerable code in your file 
 * with the code below.
 */

${fixCode}
`;

    return NextResponse.json({ success: true, patch: patchContent });
  } catch (error) {
    console.error('Fix failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate fix' },
      { status: 500 }
    );
  }
}
