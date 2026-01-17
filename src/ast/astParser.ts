import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

export type ASTProgram = acorn.Node;
export type ASTNode = acorn.Node;

// Extended node types with TypeScript-like properties
export interface CallExpressionNode extends acorn.Node {
    type: 'CallExpression';
    callee: ASTNode;
    arguments: ASTNode[];
}

export interface MemberExpressionNode extends acorn.Node {
    type: 'MemberExpression';
    object: ASTNode;
    property: ASTNode;
    computed: boolean;
}

export interface IdentifierNode extends acorn.Node {
    type: 'Identifier';
    name: string;
}

export interface LiteralNode extends acorn.Node {
    type: 'Literal';
    value: string | number | boolean | null | RegExp;
    raw: string;
}

export interface TemplateLiteralNode extends acorn.Node {
    type: 'TemplateLiteral';
    quasis: TemplateElementNode[];
    expressions: ASTNode[];
}

export interface TemplateElementNode extends acorn.Node {
    type: 'TemplateElement';
    value: { raw: string; cooked: string };
    tail: boolean;
}

export interface NewExpressionNode extends acorn.Node {
    type: 'NewExpression';
    callee: ASTNode;
    arguments: ASTNode[];
}

export interface BinaryExpressionNode extends acorn.Node {
    type: 'BinaryExpression';
    operator: string;
    left: ASTNode;
    right: ASTNode;
}

export interface AssignmentExpressionNode extends acorn.Node {
    type: 'AssignmentExpression';
    operator: string;
    left: ASTNode;
    right: ASTNode;
}

// Simple in-memory cache for parsed ASTs
const astCache = new Map<string, ASTProgram | null>();

/**
 * Parse source code to AST using Acorn.
 * Supports JavaScript and JSX (with loose parsing for TypeScript).
 */
export function parseToAST(content: string, filePath: string): ASTProgram | null {
    // Check cache first
    const cacheKey = `${filePath}:${content.length}:${content.slice(0, 100)}`;
    if (astCache.has(cacheKey)) {
        return astCache.get(cacheKey) || null;
    }

    try {
        // Strip TypeScript type annotations for JS parsing
        // This is a simple approach - remove common TS patterns
        let jsContent = content;

        if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            jsContent = stripTypeScript(content);
        }

        const ast = acorn.parse(jsContent, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            locations: true,
            ranges: true,
            allowReturnOutsideFunction: true,
            allowImportExportEverywhere: true,
            allowHashBang: true,
            // Be lenient with parsing errors
            onComment: () => { },
        });

        astCache.set(cacheKey, ast);
        return ast;
    } catch (error) {
        // Try again with more lenient options
        try {
            const ast = acorn.parse(stripTypeScript(content), {
                ecmaVersion: 'latest',
                sourceType: 'script',
                locations: true,
                ranges: true,
                allowReturnOutsideFunction: true,
            });
            astCache.set(cacheKey, ast);
            return ast;
        } catch {
            console.warn(`[AST Parser] Failed to parse ${filePath}:`, (error as Error).message);
            astCache.set(cacheKey, null);
            return null;
        }
    }
}

/**
 * Strip TypeScript-specific syntax for JS parsing.
 * This is a simple regex-based approach for common patterns.
 */
function stripTypeScript(content: string): string {
    return content
        // Remove type annotations after colons (basic)
        .replace(/:\s*[A-Z][a-zA-Z0-9<>[\]|&, ]*(?=[,)\]=;])/g, '')
        // Remove interface/type declarations
        .replace(/^(export\s+)?(interface|type)\s+\w+[\s\S]*?^}/gm, '')
        // Remove generic type parameters
        .replace(/<[A-Z][a-zA-Z0-9<>[\]|&, ]*>/g, '')
        // Remove 'as' type assertions
        .replace(/\s+as\s+\w+/g, '')
        // Remove non-null assertions
        .replace(/!(?=[.\[])/g, '')
        // Remove import type statements
        .replace(/import\s+type\s+.*?;/g, '')
        // Remove export type statements
        .replace(/export\s+type\s+.*?;/g, '');
}

/**
 * Get the line and column number for a node.
 */
export function getNodeLocation(node: ASTNode): { line: number; column: number } {
    if (node.loc) {
        return { line: node.loc.start.line, column: node.loc.start.column };
    }
    return { line: 1, column: 0 };
}

/**
 * Get source code snippet for a node.
 */
export function getNodeSnippet(content: string, node: ASTNode): string {
    if (node.start !== undefined && node.end !== undefined) {
        const snippet = content.slice(node.start, Math.min(node.end, node.start + 150));
        return snippet.includes('\n') ? snippet.split('\n')[0] + '...' : snippet;
    }
    return '';
}

/**
 * Recursively walk the AST and call visitor for each node.
 */
export function walkAST(
    ast: ASTProgram,
    visitor: (node: ASTNode, parent: ASTNode | null) => void
): void {
    walk.ancestor(ast as acorn.Node, {
        // Call visitor for every node type
        ...Object.fromEntries(
            [
                'Program', 'ExpressionStatement', 'CallExpression', 'MemberExpression',
                'Identifier', 'Literal', 'TemplateLiteral', 'NewExpression',
                'BinaryExpression', 'AssignmentExpression', 'VariableDeclaration',
                'VariableDeclarator', 'FunctionDeclaration', 'FunctionExpression',
                'ArrowFunctionExpression', 'BlockStatement', 'IfStatement',
                'ForStatement', 'WhileStatement', 'ReturnStatement', 'ThrowStatement',
                'TryStatement', 'CatchClause', 'ObjectExpression', 'ArrayExpression',
                'Property', 'SpreadElement', 'ConditionalExpression', 'LogicalExpression',
                'UnaryExpression', 'UpdateExpression', 'AwaitExpression', 'YieldExpression',
            ].map(type => [type, (node: ASTNode, ancestors: ASTNode[]) => {
                const parent = ancestors.length > 1 ? ancestors[ancestors.length - 2] : null;
                visitor(node, parent);
            }])
        )
    });
}

/**
 * Check if a node is a call to a specific function name.
 */
export function isCallTo(node: ASTNode, functionName: string): node is CallExpressionNode {
    if (node.type !== 'CallExpression') return false;

    const callNode = node as CallExpressionNode;
    const callee = callNode.callee;

    // Direct call: eval(...)
    if (callee.type === 'Identifier' && (callee as IdentifierNode).name === functionName) {
        return true;
    }

    // Member call: window.eval(...)
    if (callee.type === 'MemberExpression') {
        const memberExpr = callee as MemberExpressionNode;
        const property = memberExpr.property;
        if (property.type === 'Identifier' && (property as IdentifierNode).name === functionName) {
            return true;
        }
    }

    return false;
}

/**
 * Check if a template literal contains only literal parts (no expressions).
 */
export function isLiteralOnlyTemplate(node: TemplateLiteralNode): boolean {
    return node.expressions.length === 0;
}

/**
 * Check if an expression is a literal (string, number, boolean, etc.).
 */
export function isLiteralExpression(node: ASTNode): boolean {
    return node.type === 'Literal' ||
        (node.type === 'TemplateLiteral' && isLiteralOnlyTemplate(node as TemplateLiteralNode));
}

// AST Node type constants (for compatibility with existing rules)
export const AST_NODE_TYPES = {
    CallExpression: 'CallExpression',
    MemberExpression: 'MemberExpression',
    Identifier: 'Identifier',
    Literal: 'Literal',
    TemplateLiteral: 'TemplateLiteral',
    NewExpression: 'NewExpression',
    BinaryExpression: 'BinaryExpression',
    AssignmentExpression: 'AssignmentExpression',
} as const;
