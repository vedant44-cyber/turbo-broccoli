
import { DynamicRule, ScanResult, Vulnerability } from '../types';

export class DynamicScanner {
    private rules: DynamicRule[];

    constructor(rules: DynamicRule[]) {
        this.rules = rules;
    }

    async scan(baseUrl: string, detectedRoutes: string[]): Promise<ScanResult> {
        const startTime = Date.now();
        const vulnerabilities: Vulnerability[] = [];

        // Normalize baseUrl (remove trailing slash)
        const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

        // 1. Run global checks that just need the base URL
        for (const rule of this.rules) {
            if (rule.id === 'security-headers' || rule.id === 'git-exposure') {
                try {
                    const vuln = await rule.check(normalizedBaseUrl);
                    if (vuln) vulnerabilities.push(vuln);
                } catch (err) {
                    console.error(`Error running dynamic rule ${rule.id}:`, err);
                }
            }
        }

        // 2. Run route-specific checks on ALL discovered routes
        const globalRuleIds = ['security-headers', 'git-exposure'];

        for (const route of detectedRoutes) {
            for (const rule of this.rules) {
                // Skip global rules (already ran above)
                if (globalRuleIds.includes(rule.id)) continue;

                try {
                    // Construct full target URL for this specific route
                    const fullUrl = `${normalizedBaseUrl}${route.startsWith('/') ? '' : '/'}${route}`;
                    const vuln = await rule.check(fullUrl);
                    if (vuln) vulnerabilities.push(vuln);
                } catch (err) {
                    console.error(`Error running dynamic rule ${rule.id} on ${route}:`, err);
                }
            }
        }

        return {
            vulnerabilities,
            scannedFiles: 0, // Not applicable for dynamic, or could be count of endpoints
            durationMs: Date.now() - startTime
        };
    }
}
