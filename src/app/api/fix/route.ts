import { NextResponse } from 'next/server';
import { MockGitHubService } from '@/fixer/MockGitHubService';
import { Vulnerability } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const vuln = body.vuln as Vulnerability;

    if (!vuln) {
      return NextResponse.json({ success: false, error: 'No vulnerability provided' }, { status: 400 });
    }

    const prUrl = await MockGitHubService.createFixPR(vuln);

    return NextResponse.json({ success: true, prUrl });
  } catch (error) {
    console.error('Fix failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate fix PR' },
      { status: 500 }
    );
  }
}
