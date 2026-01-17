
import { Vulnerability } from '../../types';

export const verifyAdminRouteRule = {
    id: 'verify-unprotected-route',
    name: 'Unprotected Route Verification',
    check: async (url: string): Promise<Vulnerability | null> => {
        try {
            // try to access without authentication
            const res = await fetch(url, { redirect: 'manual' });

            if (res.status === 200) {
                // Check if it's a sensitive endpoint
                const text = await res.text();

                // Skip if it's clearly a public page (login, home, docs)
                const isPublicPage =
                    text.toLowerCase().includes('login') ||
                    text.toLowerCase().includes('sign in') ||
                    text.toLowerCase().includes('welcome to') ||
                    url === '/' ||
                    url.endsWith('/docs') ||
                    url.endsWith('/health');

                if (isPublicPage) {
                    // try brute force
                    if (text.toLowerCase().includes('password')) {
                        return await tryDefaultCreds(url);
                    }
                    return null;
                }

                // Check if response contains sensitive data patterns
                const hasSensitiveData =
                    text.includes('"email"') ||
                    text.includes('"password"') ||
                    text.includes('"token"') ||
                    text.includes('"api_key"') ||
                    text.includes('"secret"') ||
                    text.includes('"users"') ||
                    text.includes('"admin"');

                if (hasSensitiveData) {
                    return {
                        ruleId: 'verify-unprotected-route',
                        file: url,
                        line: 0,
                        severity: 'CRITICAL',
                        message: `Unprotected API Route Exposes Sensitive Data: ${url}`,
                        codeSnippet: text.substring(0, 200) + '...',
                        description: 'This route returned sensitive data without requiring authentication.',
                        vulnType: 'ADMIN_ROUTE',
                        fixSuggestion: 'Add authentication middleware to protect this endpoint.'
                    };
                }

                // Route accessible but not obviously sensitive - still flag as HIGH
                return {
                    ruleId: 'verify-unprotected-route',
                    file: url,
                    line: 0,
                    severity: 'HIGH',
                    message: `Potentially Unprotected Route: ${url}`,
                    codeSnippet: '',
                    description: 'This route is accessible without authentication. Verify if this is intentional.',
                    vulnType: 'ADMIN_ROUTE',
                    fixSuggestion: 'Review if this endpoint should require authentication.'
                };
            } else if (res.status === 401 || res.status === 403) {
                // Protected route - try default credentials
                return await tryDefaultCreds(url);
            }

        } catch (e) {
            // Ignore connection errors
        }
        return null;
    }
};

async function tryDefaultCreds(url: string): Promise<Vulnerability | null> {
    const CREDS = [
        { u: 'admin', p: 'admin' },
        { u: 'admin', p: 'password' },
        { u: 'root', p: 'root' },
        { u: 'admin@example.com', p: 'password' }
    ];

    for (const cred of CREDS) {
        try {
            // Try JSON POST
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: cred.u, password: cred.p, email: cred.u })
            });

            if (res.status === 200) {
                // POTENTIAL BREAK-IN
                // Heuristic: Check for "token" or redirect or "Welcome"
                const text = await res.text();
                if (text.includes('token') || text.includes('success') || text.includes('dashboard')) {
                    return {
                        ruleId: 'verify-admin-route-sige',
                        file: url,
                        line: 0,
                        severity: 'CRITICAL',
                        message: `Active Siege Successful: Default Credentials Found (${cred.u}/${cred.p})`,
                        codeSnippet: `POST ${url}\n{ username: "${cred.u}", password: "${cred.p}" }`,
                        description: 'The scanner successfully forced entry into the admin panel using weak default credentials.',
                        vulnType: 'ADMIN_ROUTE',
                        fixSuggestion: 'IMMEDIATELY change default passwords and implement rate limiting.'
                    };
                }
            }
        } catch (e) { }
    }
    return null;
}

