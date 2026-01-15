import { NextResponse } from 'next/server';
import { Scanner } from '@/scanner/Scanner'; // Adjust import based on aliases
import { exposedSecretsRule } from '@/rules/exposedSecrets';
import { jwtMisconfigurationRule } from '@/rules/jwtMisconfiguration';
import { brokenCorsRule } from '@/rules/brokenCors';
import { adminRouteRule } from '@/rules/adminRoutes';
import { gitignoreValidationRule } from '@/rules/gitignoreValidation';
import path from 'path';


export async function POST(req: Request) {
  try {
    const rules = [
      exposedSecretsRule,
      jwtMisconfigurationRule,
      brokenCorsRule,
      adminRouteRule,
      gitignoreValidationRule
    ];

    const scanner = new Scanner(rules);

    // Check content-type to decide mode
    const contentType = req.headers.get('content-type') || '';

    let result;

    if (contentType.includes('application/json')) {
      const body = await req.json();

      // If 'files' array is present, use in-memory scan (Browser Mode)
      if (body.files && Array.isArray(body.files)) {
        console.log(`Received ${body.files.length} files from browser.`);
        result = await scanner.scanFiles(body.files, body.filePaths);
      } else {
        return NextResponse.json({ success: false, error: 'No files provided for scanning' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ success: false, error: 'Invalid content type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Scan failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute scan' },
      { status: 500 }
    );
  }
}
