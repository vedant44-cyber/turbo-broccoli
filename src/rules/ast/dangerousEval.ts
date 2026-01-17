import { ASTRule, Vulnerability, FileContext } from '../../types';
import {
    walkAST,
    getNodeLocation,
    getNodeSnippet,
    isCallTo,
    AST_NODE_TYPES,
    type ASTNode,
    type ASTProgram,
    type CallExpressionNode,
    type NewExpressionNode,
    type IdentifierNode,
    type LiteralNode,
    type MemberExpressionNode,
} from '../../ast/astParser';

/**
 * Dangerous Eval Rule
 * 
 * Detects usage of:
 * - eval()
 * - new Function('...')
 * - setTimeout/setInterval with string arguments (XSS vector)
 * 
 * These are dangerous because they can execute arbitrary code,
 * especially if user input flows into them.
 */
export const dangerousEvalRule: ASTRule = {
    id: 'dangerous-eval',
    name: 'Dangerous Code Execution',
    description: 'Detects eval(), new Function(), and string-based timers that can execute arbitrary code.',
    severity: 'CRITICAL',
    fileTypes: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],

    check: (ast: ASTProgram, context: FileContext): Vulnerability[] => {
        const vulnerabilities: Vulnerability[] = [];

        walkAST(ast, (node: ASTNode) => {
            // Check for eval() calls
            if (isCallTo(node, 'eval')) {
                const loc = getNodeLocation(node);
                vulnerabilities.push({
                    ruleId: 'dangerous-eval',
                    file: context.path,
                    line: loc.line,
                    column: loc.column,
                    severity: 'CRITICAL',
                    message: 'Dangerous eval() detected',
                    codeSnippet: getNodeSnippet(context.content, node),
                    vulnType: 'OTHER',
                    description: 'eval() executes arbitrary code. If user input reaches this, attackers can run any JavaScript.',
                    fixSuggestion: 'Replace eval() with JSON.parse() for data, or restructure logic to avoid dynamic code execution.',
                });
            }

            // Check for new Function('...')
            if (node.type === AST_NODE_TYPES.NewExpression) {
                const newExpr = node as NewExpressionNode;
                if (
                    newExpr.callee.type === AST_NODE_TYPES.Identifier &&
                    (newExpr.callee as IdentifierNode).name === 'Function'
                ) {
                    const loc = getNodeLocation(node);
                    vulnerabilities.push({
                        ruleId: 'dangerous-eval',
                        file: context.path,
                        line: loc.line,
                        column: loc.column,
                        severity: 'CRITICAL',
                        message: 'Dangerous new Function() detected',
                        codeSnippet: getNodeSnippet(context.content, node),
                        vulnType: 'OTHER',
                        description: 'new Function() is equivalent to eval() and can execute arbitrary code.',
                        fixSuggestion: 'Avoid dynamic function creation. Use predefined functions or a safe expression parser.',
                    });
                }
            }

            // Check for setTimeout/setInterval with string argument
            if (isCallTo(node, 'setTimeout') || isCallTo(node, 'setInterval')) {
                const callExpr = node as CallExpressionNode;
                const firstArg = callExpr.arguments[0];

                // String literal or template literal as first argument is dangerous
                if (firstArg) {
                    const isStringArg =
                        (firstArg.type === AST_NODE_TYPES.Literal && typeof (firstArg as LiteralNode).value === 'string') ||
                        firstArg.type === AST_NODE_TYPES.TemplateLiteral;

                    if (isStringArg) {
                        let functionName = 'setTimeout/setInterval';
                        if (callExpr.callee.type === AST_NODE_TYPES.Identifier) {
                            functionName = (callExpr.callee as IdentifierNode).name;
                        } else if (callExpr.callee.type === AST_NODE_TYPES.MemberExpression) {
                            const prop = (callExpr.callee as MemberExpressionNode).property;
                            if (prop.type === AST_NODE_TYPES.Identifier) {
                                functionName = (prop as IdentifierNode).name;
                            }
                        }

                        const loc = getNodeLocation(node);
                        vulnerabilities.push({
                            ruleId: 'dangerous-eval',
                            file: context.path,
                            line: loc.line,
                            column: loc.column,
                            severity: 'HIGH',
                            message: `${functionName}() with string argument detected`,
                            codeSnippet: getNodeSnippet(context.content, node),
                            vulnType: 'OTHER',
                            description: `${functionName}() with a string argument evaluates the string as code (like eval). This is an XSS vector.`,
                            fixSuggestion: `Pass a function reference instead: ${functionName}(() => { ... }, delay)`,
                        });
                    }
                }
            }
        });

        return vulnerabilities;
    },
};
