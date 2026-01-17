import { ASTRule, Vulnerability, FileContext } from '../../types';
import {
    walkAST,
    getNodeLocation,
    getNodeSnippet,
    AST_NODE_TYPES,
    type ASTNode,
    type ASTProgram,
    type CallExpressionNode,
    type MemberExpressionNode,
    type IdentifierNode,
    type BinaryExpressionNode,
    type TemplateLiteralNode,
} from '../../ast/astParser';

// Common SQL query method names
const SQL_METHODS = ['query', 'execute', 'exec', 'raw', 'prepare', 'run'];

/**
 * SQL Injection Rule
 * 
 * Detects SQL queries built with:
 * - String concatenation: "SELECT * FROM users WHERE id = " + userId
 * - Template literals with expressions: `SELECT * FROM users WHERE id = ${userId}`
 * 
 * Ignores:
 * - Parameterized queries (with placeholders like ? or $1)
 * - Template literals with only literal parts
 */
export const sqlInjectionRule: ASTRule = {
    id: 'sql-injection',
    name: 'SQL Injection',
    description: 'Detects SQL queries built with string concatenation or unsafe template literals.',
    severity: 'CRITICAL',
    fileTypes: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],

    check: (ast: ASTProgram, context: FileContext): Vulnerability[] => {
        const vulnerabilities: Vulnerability[] = [];

        walkAST(ast, (node: ASTNode) => {
            // Look for call expressions: db.query(...), connection.execute(...), etc.
            if (node.type !== AST_NODE_TYPES.CallExpression) return;

            const callExpr = node as CallExpressionNode;

            // Check if this is a method call on a database-like object
            if (callExpr.callee.type !== AST_NODE_TYPES.MemberExpression) return;

            const memberExpr = callExpr.callee as MemberExpressionNode;
            const property = memberExpr.property;

            // Get method name
            let methodName: string | null = null;
            if (property.type === AST_NODE_TYPES.Identifier) {
                methodName = (property as IdentifierNode).name;
            }

            if (!methodName || !SQL_METHODS.includes(methodName.toLowerCase())) return;

            // Check the first argument (the SQL query)
            const firstArg = callExpr.arguments[0];
            if (!firstArg) return;

            // Check for dangerous patterns
            let isDangerous = false;
            let reason = '';

            // Pattern 1: Binary expression (string concatenation)
            if (firstArg.type === AST_NODE_TYPES.BinaryExpression) {
                const hasNonLiteral = containsNonLiteral(firstArg);
                if (hasNonLiteral && looksLikeSQL(context.content, firstArg)) {
                    isDangerous = true;
                    reason = 'SQL query built with string concatenation';
                }
            }

            // Pattern 2: Template literal with expressions
            if (firstArg.type === AST_NODE_TYPES.TemplateLiteral) {
                const template = firstArg as TemplateLiteralNode;
                if (template.expressions.length > 0 && looksLikeSQLTemplate(template)) {
                    isDangerous = true;
                    reason = 'SQL query built with template literal expressions';
                }
            }

            if (isDangerous) {
                const loc = getNodeLocation(node);
                vulnerabilities.push({
                    ruleId: 'sql-injection',
                    file: context.path,
                    line: loc.line,
                    column: loc.column,
                    severity: 'CRITICAL',
                    message: 'Potential SQL Injection vulnerability',
                    codeSnippet: getNodeSnippet(context.content, node),
                    vulnType: 'OTHER',
                    description: `${reason}. Attackers can manipulate the query logic to access or modify unauthorized data.`,
                    fixSuggestion: 'Use parameterized queries: db.query("SELECT * FROM users WHERE id = ?", [userId])',
                });
            }
        });

        return vulnerabilities;
    },
};

/**
 * Check if a binary expression contains any non-literal values
 */
function containsNonLiteral(node: ASTNode): boolean {
    if (node.type === AST_NODE_TYPES.Literal) return false;
    if (node.type === AST_NODE_TYPES.Identifier) return true;
    if (node.type === AST_NODE_TYPES.MemberExpression) return true;
    if (node.type === AST_NODE_TYPES.CallExpression) return true;

    if (node.type === AST_NODE_TYPES.BinaryExpression) {
        const binExpr = node as BinaryExpressionNode;
        return containsNonLiteral(binExpr.left) || containsNonLiteral(binExpr.right);
    }

    return false;
}

/**
 * Check if a binary expression looks like it contains SQL
 */
function looksLikeSQL(content: string, node: ASTNode): boolean {
    const snippet = getNodeSnippet(content, node).toUpperCase();
    const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM', 'WHERE', 'JOIN', 'DROP', 'CREATE', 'ALTER'];
    return sqlKeywords.some(keyword => snippet.includes(keyword));
}

/**
 * Check if a template literal looks like SQL
 */
function looksLikeSQLTemplate(template: TemplateLiteralNode): boolean {
    // Check the quasi parts (literal parts of the template)
    for (const quasi of template.quasis) {
        const value = quasi.value.raw.toUpperCase();
        const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM', 'WHERE', 'JOIN'];
        if (sqlKeywords.some(keyword => value.includes(keyword))) {
            return true;
        }
    }
    return false;
}
