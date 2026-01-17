
import { NextResponse } from 'next/server';
import { DynamicScanner } from '../../../scanner/DynamicScanner';
import { verifyAdminRouteRule } from '../../../rules/dynamic/verifyAdminRoute';
import { securityHeadersRule } from '../../../rules/dynamic/securityHeaders';
import { gitExposureRule } from '../../../rules/dynamic/gitExposure';

export async function POST(req: Request) {
    try {
        const { url, routes } = await req.json();

        if (!url) {
            return NextResponse.json({ success: false, error: 'Target URL is required' }, { status: 400 });
        }

        const scanner = new DynamicScanner([
            verifyAdminRouteRule,
            securityHeadersRule,
            gitExposureRule
        ]);

        const result = await scanner.scan(url, routes || []);

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('Dynamic scan failed:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
