import { Vulnerability } from '@/types';

export interface SecurityScore {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    label: string;
    color: string;
}

/**
 * Calculate a security score based on vulnerabilities found.
 * 
 * Scoring Algorithm:
 * - Start at 100 points
 * - Deduct: CRITICAL = -25, HIGH = -15, MEDIUM = -8, LOW = -3
 * - Minimum score is 0
 * 
 * Grading:
 * - A (90+): FORTRESS
 * - B (75+): SOLID
 * - C (60+): AT RISK
 * - D (40+): COMPROMISED
 * - F (<40): BREACHED
 */
export function calculateSecurityScore(vulnerabilities: Vulnerability[]): SecurityScore {
    let score = 100;

    for (const vuln of vulnerabilities) {
        switch (vuln.severity) {
            case 'CRITICAL':
                score -= 25;
                break;
            case 'HIGH':
                score -= 15;
                break;
            case 'MEDIUM':
                score -= 8;
                break;
            case 'LOW':
                score -= 3;
                break;
        }
    }

    // Clamp to 0
    score = Math.max(0, score);

    let grade: SecurityScore['grade'];
    let label: string;
    let color: string;

    if (score >= 90) {
        grade = 'A';
        label = 'FORTRESS';
        color = '#00ff88';
    } else if (score >= 75) {
        grade = 'B';
        label = 'SOLID';
        color = '#22d3ee';
    } else if (score >= 60) {
        grade = 'C';
        label = 'AT RISK';
        color = '#facc15';
    } else if (score >= 40) {
        grade = 'D';
        label = 'COMPROMISED';
        color = '#f97316';
    } else {
        grade = 'F';
        label = 'BREACHED';
        color = '#ef4444';
    }

    return { score, grade, label, color };
}
