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
    type AssignmentExpressionNode,
    type LiteralNode,
} from '../../ast/astParser';

// Dangerous property names that should never be dynamically accessed
const DANGEROUS_PROPS = ['__proto__', 'constructor', 'prototype'];

/**
 * Unsafe Object Access Rule
 * 
 * Detects patterns that could lead to:
 * - Prototype pollution: obj[userInput] = value
 * - Arbitrary property access: obj[req.query.key]
 * - Dangerous Object.assign with untrusted source
 * 
 * These are dangerous because they can modify object prototypes
 * or access unintended properties.
 */
export const unsafeObjectAccessRule: ASTRule = {
    id: 'unsafe-object-access',
    name: 'Unsafe Object Access',
    description: 'Detects prototype pollution vectors and unsafe dynamic property access.',
    severity: 'HIGH',
    fileTypes: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],

    check: (ast: ASTProgram, context: FileContext): Vulnerability[] => {
        const vulnerabilities: Vulnerability[] = [];

        walkAST(ast, (node: ASTNode) => {
            // Pattern 1: Dynamic property assignment - obj[expr] = value
            if (node.type === AST_NODE_TYPES.AssignmentExpression) {
                const assignment = node as AssignmentExpressionNode;

                if (assignment.left.type === AST_NODE_TYPES.MemberExpression) {
                    const memberExpr = assignment.left as MemberExpressionNode;

                    // Check if it's computed access with a non-literal key
                    if (memberExpr.computed && !isLiteralKey(memberExpr.property)) {
                        // Check if the key comes from potentially untrusted source
                        if (looksUntrusted(memberExpr.property, context.content)) {
                            const loc = getNodeLocation(node);
                            vulnerabilities.push({
                                ruleId: 'unsafe-object-access',
                                file: context.path,
                                line: loc.line,
                                column: loc.column,
                                severity: 'HIGH',
                                message: 'Dynamic property assignment (Prototype Pollution risk)',
                                codeSnippet: getNodeSnippet(context.content, node),
                                vulnType: 'OTHER',
                                description: 'Setting properties with user-controlled keys can pollute Object.prototype, affecting all objects.',
                                fixSuggestion: 'Validate the key: if (ALLOWED_KEYS.includes(key) && !["__proto__", "constructor", "prototype"].includes(key)) { obj[key] = value; }',
                            });
                        }
                    }
                }
            }

            // Pattern 2: Object.assign with potentially untrusted source
            if (node.type === AST_NODE_TYPES.CallExpression) {
                const callExpr = node as CallExpressionNode;

                if (
                    callExpr.callee.type === AST_NODE_TYPES.MemberExpression &&
                    (callExpr.callee as MemberExpressionNode).object.type === AST_NODE_TYPES.Identifier &&
                    ((callExpr.callee as MemberExpressionNode).object as IdentifierNode).name === 'Object' &&
                    (callExpr.callee as MemberExpressionNode).property.type === AST_NODE_TYPES.Identifier &&
                    ((callExpr.callee as MemberExpressionNode).property as IdentifierNode).name === 'assign'
                ) {
                    // Check if any source argument looks untrusted
                    for (let i = 1; i < callExpr.arguments.length; i++) {
                        const arg = callExpr.arguments[i];
                        if (looksUntrusted(arg, context.content)) {
                            const loc = getNodeLocation(node);
                            vulnerabilities.push({
                                ruleId: 'unsafe-object-access',
                                file: context.path,
                                line: loc.line,
                                column: loc.column,
                                severity: 'HIGH',
                                message: 'Object.assign with potentially untrusted source',
                                codeSnippet: getNodeSnippet(context.content, node),
                                vulnType: 'OTHER',
                                description: 'Object.assign() can be used for prototype pollution if the source contains __proto__ or constructor properties.',
                                fixSuggestion: 'Use a safe merge function that filters dangerous keys, or use Object.assign({}, safeDefaults, JSON.parse(JSON.stringify(userObj))).',
                            });
                            break;
                        }
                    }
                }

                // Also check for spread in Object constructor variants like lodash merge
                const callee = callExpr.callee;
                if (
                    callee.type === AST_NODE_TYPES.MemberExpression &&
                    (callee as MemberExpressionNode).property.type === AST_NODE_TYPES.Identifier
                ) {
                    const methodName = ((callee as MemberExpressionNode).property as IdentifierNode).name;
                    if (['merge', 'extend', 'defaults', 'defaultsDeep'].includes(methodName)) {
                        for (const arg of callExpr.arguments) {
                            if (looksUntrusted(arg, context.content)) {
                                const loc = getNodeLocation(node);
                                vulnerabilities.push({
                                    ruleId: 'unsafe-object-access',
                                    file: context.path,
                                    line: loc.line,
                                    column: loc.column,
                                    severity: 'HIGH',
                                    message: `${methodName}() with potentially untrusted source`,
                                    codeSnippet: getNodeSnippet(context.content, node),
                                    vulnType: 'OTHER',
                                    description: `Deep merge functions like ${methodName}() are common prototype pollution vectors when used with untrusted objects.`,
                                    fixSuggestion: 'Sanitize input objects before merging, or use libraries with prototype pollution protection.',
                                });
                                break;
                            }
                        }
                    }
                }
            }

            // Pattern 3: Direct access to dangerous properties via user input
            if (node.type === AST_NODE_TYPES.MemberExpression) {
                const memberExpr = node as MemberExpressionNode;

                if (memberExpr.computed) {
                    const property = memberExpr.property;

                    // Check for direct string literals of dangerous props
                    if (
                        property.type === AST_NODE_TYPES.Literal &&
                        typeof (property as LiteralNode).value === 'string' &&
                        DANGEROUS_PROPS.includes((property as LiteralNode).value as string)
                    ) {
                        const loc = getNodeLocation(node);
                        vulnerabilities.push({
                            ruleId: 'unsafe-object-access',
                            file: context.path,
                            line: loc.line,
                            column: loc.column,
                            severity: 'CRITICAL',
                            message: `Direct access to "${(property as LiteralNode).value}" detected`,
                            codeSnippet: getNodeSnippet(context.content, node),
                            vulnType: 'OTHER',
                            description: 'Accessing __proto__, constructor, or prototype can lead to prototype pollution attacks.',
                            fixSuggestion: 'Never access these properties directly. Use Object.getPrototypeOf() if needed for legitimate purposes.',
                        });
                    }
                }
            }
        });

        return vulnerabilities;
    },
};

/**
 * Check if a node is a literal key (string or number literal)
 */
function isLiteralKey(node: ASTNode): boolean {
    return node.type === AST_NODE_TYPES.Literal;
}

/**
 * Heuristic: Check if an expression looks like it comes from untrusted input
 * (req.body, req.query, req.params, user input, etc.)
 */
function looksUntrusted(node: ASTNode, content: string): boolean {
    const snippet = getNodeSnippet(content, node).toLowerCase();

    const untrustedPatterns = [
        'req.body',
        'req.query',
        'req.params',
        'request.body',
        'request.query',
        'ctx.request',
        'event.body',
        'body.',
        'query.',
        'params.',
        'userinput',
        'user_input',
        'input',
        'data',
        'payload',
    ];

    return untrustedPatterns.some(pattern => snippet.includes(pattern));
}
