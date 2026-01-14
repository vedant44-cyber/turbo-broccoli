import { Rule, Vulnerability, FileContext } from '../types';

export const brokenCorsRule: Rule = {
  id: 'broken-cors',
  name: 'Broken CORS Policy',
  description: 'Detects overly permissive Cross-Origin Resource Sharing (CORS) configurations.',
  severity: 'HIGH',
  check: (context: FileContext): Vulnerability[] => {
    const vulnerabilities: Vulnerability[] = [];
    
    // Check for Access-Control-Allow-Origin: *
    if (context.content.match(/Access-Control-Allow-Origin['"]?\s*:\s*['"]\*['"]/i) || 
        context.content.match(/origin\s*:\s*['"]\*['"]/)) {
      
        // If credentials are also true, it's very bad (but * + credentials is often invalid anyway, still worth flagging)
        const hasCredentials = context.content.match(/Access-Control-Allow-Credentials['"]?\s*:\s*true/i) || 
                               context.content.match(/credentials\s*:\s*true/);

        vulnerabilities.push({
            ruleId: 'broken-cors',
            file: context.path,
            line: 1,
            severity: hasCredentials ? 'CRITICAL' : 'HIGH',
            message: 'Overly permissive CORS origin (*).',
            codeSnippet: 'origin: "*"',
            vulnType: 'CORS',
            description: 'Allowing all origins (*) allows malicious sites to make requests to your API.',
            fixSuggestion: 'Restrict generic CORS to trusted domains or remove the wildcard.',
        });
    }

    return vulnerabilities;
  },
};
