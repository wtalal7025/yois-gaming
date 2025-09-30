/**
 * Enhanced ESLint rules and code standards
 * Provides comprehensive linting configuration for consistent code quality
 */

// Types for linting configuration
interface ESLintRule {
  name: string;
  severity: 'error' | 'warn' | 'off';
  options?: any;
  description: string;
  category: string;
  fixable?: boolean;
  recommended?: boolean;
}

interface LintingConfig {
  parser: string;
  parserOptions: Record<string, any>;
  extends: string[];
  plugins: string[];
  rules: Record<string, any>;
  env: Record<string, boolean>;
  settings: Record<string, any>;
  overrides?: LintingOverride[];
}

interface LintingOverride {
  files: string[];
  parser?: string;
  rules: Record<string, any>;
  env?: Record<string, boolean>;
}

interface CodeQualityMetrics {
  complexity: number;
  maintainabilityIndex: number;
  technicalDebt: number;
  duplicateCodePercentage: number;
  testCoverage: number;
  securityScore: number;
}

interface LintingResult {
  filePath: string;
  errorCount: number;
  warningCount: number;
  messages: LintMessage[];
  fixableErrorCount: number;
  fixableWarningCount: number;
  usedDeprecatedRules: string[];
}

interface LintMessage {
  ruleId: string;
  severity: number;
  message: string;
  line: number;
  column: number;
  nodeType: string;
  messageId?: string;
  endLine?: number;
  endColumn?: number;
  fix?: {
    range: [number, number];
    text: string;
  };
}

/**
 * Custom ESLint rules for gaming platform
 */
export class CustomESLintRules {
  private static rules: Map<string, ESLintRule> = new Map();

  static {
    this.initializeRules();
  }

  private static initializeRules(): void {
    // Gaming-specific rules
    this.addRule({
      name: 'no-direct-game-state-mutation',
      severity: 'error',
      description: 'Prevent direct mutation of game state objects',
      category: 'gaming',
      fixable: false,
      recommended: true
    });

    this.addRule({
      name: 'require-game-validation',
      severity: 'error',
      description: 'Require input validation for all game actions',
      category: 'gaming',
      fixable: false,
      recommended: true
    });

    this.addRule({
      name: 'no-hardcoded-multipliers',
      severity: 'warn',
      description: 'Avoid hardcoded multiplier values',
      category: 'gaming',
      fixable: false,
      recommended: true
    });

    // Security rules
    this.addRule({
      name: 'no-client-side-balance-calculation',
      severity: 'error',
      description: 'Prevent balance calculations on client side',
      category: 'security',
      fixable: false,
      recommended: true
    });

    this.addRule({
      name: 'require-auth-middleware',
      severity: 'error',
      description: 'Require authentication middleware for protected routes',
      category: 'security',
      fixable: false,
      recommended: true
    });

    // Performance rules
    this.addRule({
      name: 'prefer-lazy-loading',
      severity: 'warn',
      description: 'Prefer lazy loading for heavy components',
      category: 'performance',
      fixable: true,
      recommended: true
    });

    this.addRule({
      name: 'no-excessive-re-renders',
      severity: 'warn',
      description: 'Detect potential excessive re-render patterns',
      category: 'performance',
      fixable: false,
      recommended: true
    });

    // Accessibility rules
    this.addRule({
      name: 'require-aria-labels',
      severity: 'error',
      description: 'Require ARIA labels for interactive elements',
      category: 'accessibility',
      fixable: false,
      recommended: true
    });

    this.addRule({
      name: 'require-focus-management',
      severity: 'warn',
      description: 'Require proper focus management for modal components',
      category: 'accessibility',
      fixable: false,
      recommended: true
    });

    // Code organization rules
    this.addRule({
      name: 'enforce-file-naming',
      severity: 'error',
      description: 'Enforce consistent file naming conventions',
      category: 'organization',
      fixable: false,
      recommended: true,
      options: {
        pattern: '^[a-z][a-zA-Z0-9]*\\.(ts|tsx|js|jsx)$',
        exceptions: ['index.ts', 'index.tsx']
      }
    });

    this.addRule({
      name: 'max-component-props',
      severity: 'warn',
      description: 'Limit the number of props in a component',
      category: 'organization',
      fixable: false,
      recommended: true,
      options: {
        max: 8
      }
    });
  }

  private static addRule(rule: ESLintRule): void {
    this.rules.set(rule.name, rule);
  }

  public static getRule(name: string): ESLintRule | undefined {
    return this.rules.get(name);
  }

  public static getAllRules(): ESLintRule[] {
    return Array.from(this.rules.values());
  }

  public static getRulesByCategory(category: string): ESLintRule[] {
    return this.getAllRules().filter(rule => rule.category === category);
  }

  public static generateESLintConfig(): Record<string, any> {
    const rules: Record<string, any> = {};
    
    this.rules.forEach((rule, name) => {
      if (rule.options) {
        rules[name] = [rule.severity, rule.options];
      } else {
        rules[name] = rule.severity;
      }
    });

    return rules;
  }
}

/**
 * ESLint configuration generator
 */
export class ESLintConfigGenerator {
  private baseConfig: LintingConfig;

  constructor() {
    this.baseConfig = this.createBaseConfig();
  }

  private createBaseConfig(): LintingConfig {
    return {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        },
        project: './tsconfig.json'
      },
      extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
        '@typescript-eslint/recommended-requiring-type-checking',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'prettier'
      ],
      plugins: [
        '@typescript-eslint',
        'react',
        'react-hooks',
        'jsx-a11y',
        'import',
        'security',
        'performance',
        'gaming-platform'
      ],
      rules: {
        // TypeScript specific
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/strict-boolean-expressions': 'error',
        
        // React specific
        'react/react-in-jsx-scope': 'off', // Not needed in React 17+
        'react/prop-types': 'off', // Using TypeScript
        'react/display-name': 'warn',
        'react/no-array-index-key': 'warn',
        'react/jsx-key': 'error',
        'react/jsx-no-bind': 'warn',
        'react-hooks/exhaustive-deps': 'warn',
        
        // Import/Export
        'import/order': ['error', {
          'groups': [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index'
          ],
          'newlines-between': 'always'
        }],
        'import/no-unresolved': 'error',
        'import/no-unused-modules': 'warn',
        
        // Security
        'security/detect-object-injection': 'error',
        'security/detect-non-literal-regexp': 'warn',
        'security/detect-unsafe-regex': 'error',
        
        // General code quality
        'no-console': 'warn',
        'no-debugger': 'error',
        'no-alert': 'error',
        'complexity': ['warn', { max: 10 }],
        'max-depth': ['warn', { max: 4 }],
        'max-lines': ['warn', { max: 300 }],
        'max-lines-per-function': ['warn', { max: 50 }],
        'max-params': ['warn', { max: 5 }],
        
        // Accessibility
        'jsx-a11y/alt-text': 'error',
        'jsx-a11y/aria-props': 'error',
        'jsx-a11y/aria-proptypes': 'error',
        'jsx-a11y/aria-unsupported-elements': 'error',
        'jsx-a11y/role-has-required-aria-props': 'error',
        'jsx-a11y/role-supports-aria-props': 'error',
        
        // Custom gaming platform rules
        ...CustomESLintRules.generateESLintConfig()
      },
      env: {
        browser: true,
        es2022: true,
        node: true,
        jest: true
      },
      settings: {
        react: {
          version: 'detect'
        },
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true,
            project: './tsconfig.json'
          }
        }
      },
      overrides: [
        {
          files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
          rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'max-lines-per-function': 'off'
          },
          env: {
            jest: true
          }
        },
        {
          files: ['**/*.config.js', '**/*.config.ts'],
          rules: {
            'import/no-default-export': 'off'
          }
        }
      ]
    };
  }

  public generateConfig(customizations?: Partial<LintingConfig>): LintingConfig {
    return {
      ...this.baseConfig,
      ...customizations,
      rules: {
        ...this.baseConfig.rules,
        ...(customizations?.rules || {})
      },
      overrides: [
        ...(this.baseConfig.overrides || []),
        ...(customizations?.overrides || [])
      ]
    };
  }

  public generateConfigForEnvironment(env: 'development' | 'production' | 'test'): LintingConfig {
    const baseConfig = this.generateConfig();

    switch (env) {
      case 'development':
        return {
          ...baseConfig,
          rules: {
            ...baseConfig.rules,
            'no-console': 'off',
            'no-debugger': 'warn'
          }
        };

      case 'production':
        return {
          ...baseConfig,
          rules: {
            ...baseConfig.rules,
            'no-console': 'error',
            'no-debugger': 'error',
            '@typescript-eslint/no-unused-vars': 'error'
          }
        };

      case 'test':
        return {
          ...baseConfig,
          rules: {
            ...baseConfig.rules,
            'max-lines-per-function': 'off',
            '@typescript-eslint/no-explicit-any': 'off'
          }
        };

      default:
        return baseConfig;
    }
  }

  public exportAsJSON(): string {
    return JSON.stringify(this.baseConfig, null, 2);
  }

  public exportAsJavaScript(): string {
    return `module.exports = ${JSON.stringify(this.baseConfig, null, 2)};`;
  }
}

/**
 * Code quality analyzer
 */
export class CodeQualityAnalyzer {
  private metrics: CodeQualityMetrics;

  constructor() {
    this.metrics = {
      complexity: 0,
      maintainabilityIndex: 0,
      technicalDebt: 0,
      duplicateCodePercentage: 0,
      testCoverage: 0,
      securityScore: 0
    };
  }

  public analyzeFile(filePath: string, content: string): CodeQualityMetrics {
    const complexity = this.calculateComplexity(content);
    const maintainabilityIndex = this.calculateMaintainabilityIndex(content);
    const duplicateCodePercentage = this.calculateDuplicateCode(content);
    const technicalDebt = this.calculateTechnicalDebt(content);
    const securityScore = this.calculateSecurityScore(content);

    return {
      complexity,
      maintainabilityIndex,
      technicalDebt,
      duplicateCodePercentage,
      testCoverage: 0, // Would be calculated separately
      securityScore
    };
  }

  private calculateComplexity(content: string): number {
    // Simple cyclomatic complexity calculation
    let complexity = 1; // Base complexity

    // Count decision points
    const decisionPoints = [
      /if\s*\(/g,
      /else\s+if/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /switch\s*\(/g,
      /case\s+/g,
      /catch\s*\(/g,
      /\?\s*:/g, // Ternary operator
      /&&/g,
      /\|\|/g
    ];

    decisionPoints.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  private calculateMaintainabilityIndex(content: string): number {
    // Simplified maintainability index calculation
    const linesOfCode = content.split('\n').filter(line => 
      line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('*')
    ).length;

    const complexity = this.calculateComplexity(content);
    const commentRatio = this.calculateCommentRatio(content);

    // Simplified formula: higher is better (0-100)
    const baseScore = Math.max(0, 100 - complexity * 2 - linesOfCode / 10);
    const commentBonus = commentRatio * 10;

    return Math.min(100, baseScore + commentBonus);
  }

  private calculateCommentRatio(content: string): number {
    const lines = content.split('\n');
    const commentLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('//') || 
             trimmed.startsWith('*') || 
             trimmed.startsWith('/*');
    }).length;

    return lines.length > 0 ? commentLines / lines.length : 0;
  }

  private calculateDuplicateCode(content: string): number {
    // Simple duplicate detection (would use more sophisticated algorithms in practice)
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//'));

    const lineOccurrences = new Map<string, number>();
    let duplicateLines = 0;

    lines.forEach(line => {
      if (line.length > 20) { // Only check substantial lines
        const count = lineOccurrences.get(line) || 0;
        lineOccurrences.set(line, count + 1);
        
        if (count === 1) { // Second occurrence
          duplicateLines += 2; // Count both occurrences
        } else if (count > 1) {
          duplicateLines += 1;
        }
      }
    });

    return lines.length > 0 ? (duplicateLines / lines.length) * 100 : 0;
  }

  private calculateTechnicalDebt(content: string): number {
    // Calculate technical debt indicators
    let debtScore = 0;

    // TODO/FIXME comments
    const todoMatches = content.match(/TODO|FIXME|HACK/gi);
    if (todoMatches) {
      debtScore += todoMatches.length * 5;
    }

    // Long functions
    const functions = content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g);
    if (functions) {
      // Estimate function length (simplified)
      debtScore += functions.length > 5 ? 10 : 0;
    }

    // Long lines
    const longLines = content.split('\n').filter(line => line.length > 120);
    debtScore += longLines.length * 2;

    // Complex expressions
    const complexExpressions = content.match(/&&.*\|\||\..*\..*\./g);
    if (complexExpressions) {
      debtScore += complexExpressions.length * 3;
    }

    return Math.min(100, debtScore);
  }

  private calculateSecurityScore(content: string): number {
    let securityIssues = 0;

    // Security anti-patterns
    const securityPatterns = [
      /eval\s*\(/g, // eval usage
      /innerHTML\s*=/g, // innerHTML usage
      /document\.write/g, // document.write usage
      /localStorage\.setItem.*password/gi, // Storing passwords in localStorage
      /sessionStorage\.setItem.*password/gi, // Storing passwords in sessionStorage
      /Math\.random\(\).*password/gi, // Using Math.random for passwords
      /btoa\(.*password/gi, // Base64 encoding passwords
      /atob\(/g, // Base64 decoding
      /\.replace\(.*password/gi // String replacement of passwords
    ];

    securityPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        securityIssues += matches.length;
      }
    });

    // Return score (higher is better)
    return Math.max(0, 100 - securityIssues * 10);
  }

  public generateQualityReport(files: { path: string; content: string }[]): {
    overall: CodeQualityMetrics;
    files: Array<{ path: string; metrics: CodeQualityMetrics }>;
    recommendations: string[];
  } {
    const fileMetrics = files.map(file => ({
      path: file.path,
      metrics: this.analyzeFile(file.path, file.content)
    }));

    // Calculate overall metrics
    const overall: CodeQualityMetrics = {
      complexity: this.average(fileMetrics.map(f => f.metrics.complexity)),
      maintainabilityIndex: this.average(fileMetrics.map(f => f.metrics.maintainabilityIndex)),
      technicalDebt: this.average(fileMetrics.map(f => f.metrics.technicalDebt)),
      duplicateCodePercentage: this.average(fileMetrics.map(f => f.metrics.duplicateCodePercentage)),
      testCoverage: 0,
      securityScore: this.average(fileMetrics.map(f => f.metrics.securityScore))
    };

    const recommendations = this.generateRecommendations(overall, fileMetrics);

    return {
      overall,
      files: fileMetrics,
      recommendations
    };
  }

  private average(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
  }

  private generateRecommendations(
    overall: CodeQualityMetrics,
    fileMetrics: Array<{ path: string; metrics: CodeQualityMetrics }>
  ): string[] {
    const recommendations: string[] = [];

    // Complexity recommendations
    if (overall.complexity > 10) {
      recommendations.push('High complexity detected. Consider breaking down complex functions.');
      
      const complexFiles = fileMetrics.filter(f => f.metrics.complexity > 15);
      if (complexFiles.length > 0) {
        recommendations.push(`Focus on these high-complexity files: ${complexFiles.map(f => f.path).join(', ')}`);
      }
    }

    // Maintainability recommendations
    if (overall.maintainabilityIndex < 60) {
      recommendations.push('Low maintainability index. Improve code organization and add documentation.');
    }

    // Technical debt recommendations
    if (overall.technicalDebt > 20) {
      recommendations.push('High technical debt detected. Address TODO/FIXME comments and refactor long functions.');
    }

    // Duplicate code recommendations
    if (overall.duplicateCodePercentage > 10) {
      recommendations.push('High duplicate code percentage. Extract common functionality into utilities.');
    }

    // Security recommendations
    if (overall.securityScore < 80) {
      recommendations.push('Security issues detected. Review code for security anti-patterns.');
    }

    return recommendations;
  }
}

// Global instances
export const eslintConfigGenerator = new ESLintConfigGenerator();
export const codeQualityAnalyzer = new CodeQualityAnalyzer();

// Development helper
if (process.env.NODE_ENV !== 'production') {
  (window as any).eslintConfigGenerator = eslintConfigGenerator;
  (window as any).codeQualityAnalyzer = codeQualityAnalyzer;
  console.log('🔍 Code Quality Tools loaded. Available: window.eslintConfigGenerator, window.codeQualityAnalyzer');
}