
import { Vulnerability } from '../../types';

export const securityHeadersRule = {
    id: 'security-headers',
    name: 'Missing Security Headers',
    check: async (url: string): Promise<Vulnerability | null> => {
        try {
            const res = await fetch(url, { method: 'HEAD' });
            const headers = res.headers;

            const missingHeaders = [];
            if (!headers.get('X-Frame-Options')) missingHeaders.push('X-Frame-Options');
            if (!headers.get('Content-Security-Policy')) missingHeaders.push('Content-Security-Policy');
            if (!headers.get('Strict-Transport-Security') && url.startsWith('https')) missingHeaders.push('Strict-Transport-Security');
            if (!headers.get('X-Content-Type-Options')) missingHeaders.push('X-Content-Type-Options');

            if (missingHeaders.length > 0) {
                return {
                    ruleId: 'security-headers',
                    file: url,
                    line: 0,
                    severity: 'MEDIUM',
                    message: `Missing Security Headers: ${missingHeaders.join(', ')}`,
                    codeSnippet: '',
                    description: 'The application response is missing critical security headers that protect against clickjacking, XSS, and MIME-sniffing.',
                    vulnType: 'OTHER',
                    fixSuggestion: 'Configure your web server or application framework (e.g., next.config.js) to send these headers.'
                };
            }
        } catch (e) {
            // Ignore connection errors, handled by caller or assumed safe
        }
        return null;
    }
};
