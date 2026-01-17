
import { Vulnerability } from '../../types';

export const gitExposureRule = {
    id: 'git-exposure',
    name: 'Git Repository Exposure',
    check: async (url: string): Promise<Vulnerability | null> => {
        try {
            // Check for .git/config
            const target = `${url}/.git/config`;
            const res = await fetch(target);

            if (res.status === 200) {
                const text = await res.text();
                // verify it logic looks like a git config
                if (text.includes('[core]') || text.includes('[remote "origin"]')) {
                    return {
                        ruleId: 'git-exposure',
                        file: target,
                        line: 0,
                        severity: 'CRITICAL',
                        message: 'Publicly Exposed .git Directory',
                        codeSnippet: target,
                        description: 'The .git folder is accessible over the network. This allows attackers to download your entire source code history.',
                        vulnType: 'OTHER',
                        fixSuggestion: 'Configure your web server to deny access to .git directories.'
                    };
                }
            }
        } catch (e) {
            // Ignore
        }
        return null;
    }
};
