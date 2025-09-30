/**
 * Tree Shaking Optimization
 * Dead code elimination and unused import detection for optimal bundle size
 * 
 * @fileoverview Tree shaking utilities and optimization strategies
 * @author Gaming Platform Team
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Tree shaking analysis result
 */
interface TreeShakingAnalysis {
  totalModules: number;
  deadCodeFiles: string[];
  unusedExports: Array<{
    file: string;
    exports: string[];
  }>;
  unusedImports: Array<{
    file: string;
    imports: string[];
    from: string;
  }>;
  potentialSavings: number;
  recommendations: string[];
}

/**
 * Tree shaking configuration
 */
interface TreeShakingConfig {
  /** Source directories to analyze */
  sourceDirs: string[];
  /** File extensions to include */
  extensions: string[];
  /** Directories to exclude */
  excludeDirs: string[];
  /** Entry points for analysis */
  entryPoints: string[];
  /** Enable aggressive optimization */
  aggressive: boolean;
}

/**
 * Module dependency information
 */
interface ModuleDependency {
  file: string;
  exports: Set<string>;
  imports: Map<string, string[]>; // file -> imported identifiers
  isUsed: boolean;
  size: number;
}

/**
 * Tree shaking optimizer class
 */
class TreeShakingOptimizer {
  private static instance: TreeShakingOptimizer;
  private moduleGraph = new Map<string, ModuleDependency>();
  private config: TreeShakingConfig;

  constructor(config: Partial<TreeShakingConfig> = {}) {
    this.config = {
      sourceDirs: ['src'],
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      excludeDirs: ['node_modules', 'dist', 'build'],
      entryPoints: ['src/index.ts', 'src/main.ts'],
      aggressive: false,
      ...config
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<TreeShakingConfig>): TreeShakingOptimizer {
    if (!TreeShakingOptimizer.instance) {
      TreeShakingOptimizer.instance = new TreeShakingOptimizer(config);
    }
    return TreeShakingOptimizer.instance;
  }

  /**
   * Analyzes project for tree shaking opportunities
   * @param projectRoot - Root directory of the project
   * @returns Tree shaking analysis results
   */
  async analyzeProject(projectRoot: string): Promise<TreeShakingAnalysis> {
    console.log('🌳 Starting tree shaking analysis...');
    
    // Step 1: Build module graph
    await this.buildModuleGraph(projectRoot);
    
    // Step 2: Mark used modules starting from entry points
    this.markUsedModules();
    
    // Step 3: Identify unused code
    const analysis = this.identifyUnusedCode();
    
    console.log('✅ Tree shaking analysis complete!');
    return analysis;
  }

  /**
   * Builds a complete module dependency graph
   * @param projectRoot - Root directory to analyze
   */
  private async buildModuleGraph(projectRoot: string): Promise<void> {
    const files = await this.findSourceFiles(projectRoot);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const dependency = await this.analyzeFile(file, content);
        this.moduleGraph.set(file, dependency);
      } catch (error) {
        console.warn(`Failed to analyze file ${file}:`, error);
      }
    }
  }

  /**
   * Finds all source files to analyze
   * @param projectRoot - Root directory
   * @returns Array of file paths
   */
  private async findSourceFiles(projectRoot: string): Promise<string[]> {
    const files: string[] = [];
    
    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (!this.config.excludeDirs.includes(entry.name)) {
            walkDir(fullPath);
          }
        } else if (entry.isFile()) {
          // Include files with matching extensions
          const ext = path.extname(entry.name);
          if (this.config.extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    // Walk through configured source directories
    for (const sourceDir of this.config.sourceDirs) {
      const fullSourceDir = path.join(projectRoot, sourceDir);
      if (fs.existsSync(fullSourceDir)) {
        walkDir(fullSourceDir);
      }
    }

    return files;
  }

  /**
   * Analyzes a single file for exports and imports
   * @param filePath - Path to the file
   * @param content - File content
   * @returns Module dependency information
   */
  private async analyzeFile(filePath: string, content: string): Promise<ModuleDependency> {
    const exports = new Set<string>();
    const imports = new Map<string, string[]>();
    
    // Extract exports using regex patterns
    const exportPatterns = [
      /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g,
      /export\s*\{\s*([^}]+)\s*\}/g,
      /export\s*\*\s*from\s*['"]([^'"]+)['"]/g
    ];

    exportPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (pattern === exportPatterns[1]) { // Named exports
          const namedExports = match[1].split(',').map(e => e.trim());
          namedExports.forEach(exp => {
            const cleanExp = exp.split(' as ')[0].trim();
            exports.add(cleanExp);
          });
        } else {
          exports.add(match[1] || 'default');
        }
      }
    });

    // Extract imports using regex patterns
    const importPatterns = [
      /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, // Default imports
      /import\s*\{\s*([^}]+)\s*\}\s*from\s+['"]([^'"]+)['"]/g, // Named imports
      /import\s*\*\s*as\s+(\w+)\s*from\s+['"]([^'"]+)['"]/g // Namespace imports
    ];

    importPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const from = match[2];
        
        if (pattern === importPatterns[1]) { // Named imports
          const namedImports = match[1].split(',').map(i => i.trim());
          const cleanImports = namedImports.map(imp => imp.split(' as ')[0].trim());
          imports.set(from, cleanImports);
        } else {
          imports.set(from, [match[1] || 'default']);
        }
      }
    });

    // Get file size
    const stats = fs.statSync(filePath);
    
    return {
      file: filePath,
      exports,
      imports,
      isUsed: false,
      size: stats.size
    };
  }

  /**
   * Marks modules as used starting from entry points
   */
  private markUsedModules(): void {
    const visited = new Set<string>();
    
    // Start from entry points
    for (const entryPoint of this.config.entryPoints) {
      this.markModuleAsUsed(entryPoint, visited);
    }
  }

  /**
   * Recursively marks a module and its dependencies as used
   * @param filePath - File path to mark as used
   * @param visited - Set of already visited files to prevent cycles
   */
  private markModuleAsUsed(filePath: string, visited: Set<string>): void {
    if (visited.has(filePath)) return;
    visited.add(filePath);

    const module = this.moduleGraph.get(filePath);
    if (!module) return;

    module.isUsed = true;

    // Mark imported modules as used
    for (const [importPath] of module.imports) {
      const resolvedPath = this.resolveImportPath(filePath, importPath);
      if (resolvedPath && this.moduleGraph.has(resolvedPath)) {
        this.markModuleAsUsed(resolvedPath, visited);
      }
    }
  }

  /**
   * Resolves import path relative to the importing file
   * @param fromFile - File doing the import
   * @param importPath - Import path to resolve
   * @returns Resolved absolute path
   */
  private resolveImportPath(fromFile: string, importPath: string): string | null {
    // Skip external modules (node_modules)
    if (!importPath.startsWith('.')) {
      return null;
    }

    const fromDir = path.dirname(fromFile);
    let resolvedPath = path.resolve(fromDir, importPath);

    // Try different extensions if the exact path doesn't exist
    if (!fs.existsSync(resolvedPath)) {
      for (const ext of this.config.extensions) {
        const pathWithExt = resolvedPath + ext;
        if (fs.existsSync(pathWithExt)) {
          return pathWithExt;
        }
      }

      // Try index files
      const indexPath = path.join(resolvedPath, 'index');
      for (const ext of this.config.extensions) {
        const indexWithExt = indexPath + ext;
        if (fs.existsSync(indexWithExt)) {
          return indexWithExt;
        }
      }
    }

    return fs.existsSync(resolvedPath) ? resolvedPath : null;
  }

  /**
   * Identifies unused code in the module graph
   * @returns Analysis results
   */
  private identifyUnusedCode(): TreeShakingAnalysis {
    const deadCodeFiles: string[] = [];
    const unusedExports: Array<{ file: string; exports: string[] }> = [];
    const unusedImports: Array<{ file: string; imports: string[]; from: string }> = [];
    let potentialSavings = 0;

    // Find completely unused files
    for (const [filePath, module] of this.moduleGraph) {
      if (!module.isUsed) {
        deadCodeFiles.push(filePath);
        potentialSavings += module.size;
      }
    }

    // Find unused exports within used files
    for (const [filePath, module] of this.moduleGraph) {
      if (module.isUsed) {
        const usedExports = this.findUsedExports(filePath);
        const unusedFileExports = Array.from(module.exports).filter(
          exp => !usedExports.has(exp)
        );
        
        if (unusedFileExports.length > 0) {
          unusedExports.push({
            file: filePath,
            exports: unusedFileExports
          });
        }

        // Find unused imports
        for (const [importFrom, importedNames] of module.imports) {
          const unusedImportNames = importedNames.filter(name => 
            !this.isImportUsed(filePath, name)
          );
          
          if (unusedImportNames.length > 0) {
            unusedImports.push({
              file: filePath,
              imports: unusedImportNames,
              from: importFrom
            });
          }
        }
      }
    }

    const recommendations = this.generateRecommendations(
      deadCodeFiles,
      unusedExports,
      unusedImports
    );

    return {
      totalModules: this.moduleGraph.size,
      deadCodeFiles,
      unusedExports,
      unusedImports,
      potentialSavings,
      recommendations
    };
  }

  /**
   * Finds which exports from a file are actually used
   * @param filePath - File to analyze
   * @returns Set of used export names
   */
  private findUsedExports(filePath: string): Set<string> {
    const usedExports = new Set<string>();

    // Check all modules that import from this file
    for (const [otherFile, module] of this.moduleGraph) {
      if (module.isUsed && module.imports.has(filePath)) {
        const importedNames = module.imports.get(filePath) || [];
        importedNames.forEach(name => usedExports.add(name));
      }
    }

    return usedExports;
  }

  /**
   * Checks if an import is actually used in the file
   * @param filePath - File containing the import
   * @param importName - Name of the imported identifier
   * @returns True if the import is used
   */
  private isImportUsed(filePath: string, importName: string): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Simple regex check for usage (could be improved with AST)
      const usagePattern = new RegExp(`\\b${importName}\\b`, 'g');
      const matches = content.match(usagePattern) || [];
      
      // If found more than once, it's likely used (once for import, once for usage)
      return matches.length > 1;
    } catch {
      return true; // Assume used if we can't read the file
    }
  }

  /**
   * Generates optimization recommendations
   * @param deadCodeFiles - Completely unused files
   * @param unusedExports - Unused exports per file
   * @param unusedImports - Unused imports per file
   * @returns Array of recommendations
   */
  private generateRecommendations(
    deadCodeFiles: string[],
    unusedExports: Array<{ file: string; exports: string[] }>,
    unusedImports: Array<{ file: string; imports: string[]; from: string }>
  ): string[] {
    const recommendations: string[] = [];

    if (deadCodeFiles.length > 0) {
      recommendations.push(
        `Remove ${deadCodeFiles.length} unused files to reduce bundle size`
      );
    }

    if (unusedExports.length > 0) {
      const totalUnusedExports = unusedExports.reduce(
        (sum, item) => sum + item.exports.length,
        0
      );
      recommendations.push(
        `Remove ${totalUnusedExports} unused exports across ${unusedExports.length} files`
      );
    }

    if (unusedImports.length > 0) {
      const totalUnusedImports = unusedImports.reduce(
        (sum, item) => sum + item.imports.length,
        0
      );
      recommendations.push(
        `Remove ${totalUnusedImports} unused imports to improve tree shaking`
      );
    }

    recommendations.push(
      'Configure your bundler (webpack/rollup) with sideEffects: false for better tree shaking'
    );

    return recommendations;
  }

  /**
   * Generates a detailed tree shaking report
   * @param analysis - Analysis results
   * @returns HTML report
   */
  generateReport(analysis: TreeShakingAnalysis): string {
    const report = `
<!DOCTYPE html>
<html>
<head>
    <title>Tree Shaking Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .section { margin: 20px 0; }
        .file-list { background: #fff; border: 1px solid #ddd; border-radius: 4px; }
        .file-item { padding: 10px; border-bottom: 1px solid #eee; }
        .file-item:last-child { border-bottom: none; }
        .recommendations { background: #e7f3ff; padding: 15px; border-radius: 8px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric-label { font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <h1>🌳 Tree Shaking Analysis Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <div class="metric">
            <div class="metric-value">${analysis.totalModules}</div>
            <div class="metric-label">Total Modules</div>
        </div>
        <div class="metric">
            <div class="metric-value">${analysis.deadCodeFiles.length}</div>
            <div class="metric-label">Dead Code Files</div>
        </div>
        <div class="metric">
            <div class="metric-value">${(analysis.potentialSavings / 1024).toFixed(1)}KB</div>
            <div class="metric-label">Potential Savings</div>
        </div>
    </div>

    <div class="section">
        <h2>🗑️ Dead Code Files (${analysis.deadCodeFiles.length})</h2>
        <div class="file-list">
            ${analysis.deadCodeFiles.map(file => `
                <div class="file-item">${file}</div>
            `).join('')}
        </div>
    </div>

    <div class="section">
        <h2>📤 Unused Exports (${analysis.unusedExports.length} files)</h2>
        <div class="file-list">
            ${analysis.unusedExports.map(item => `
                <div class="file-item">
                    <strong>${item.file}</strong><br>
                    Unused: ${item.exports.join(', ')}
                </div>
            `).join('')}
        </div>
    </div>

    <div class="section">
        <h2>📥 Unused Imports (${analysis.unusedImports.length} files)</h2>
        <div class="file-list">
            ${analysis.unusedImports.map(item => `
                <div class="file-item">
                    <strong>${item.file}</strong><br>
                    From: ${item.from}<br>
                    Unused: ${item.imports.join(', ')}
                </div>
            `).join('')}
        </div>
    </div>

    <div class="recommendations">
        <h2>💡 Recommendations</h2>
        <ul>
            ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
</body>
</html>`;

    return report;
  }
}

/**
 * Convenience function to analyze a project for tree shaking
 */
export async function analyzeTreeShaking(
  projectRoot: string,
  config?: Partial<TreeShakingConfig>
): Promise<TreeShakingAnalysis> {
  const optimizer = TreeShakingOptimizer.getInstance(config);
  return optimizer.analyzeProject(projectRoot);
}

/**
 * Generates a tree shaking report file
 */
export async function generateTreeShakingReport(
  projectRoot: string,
  outputPath: string,
  config?: Partial<TreeShakingConfig>
): Promise<void> {
  const analysis = await analyzeTreeShaking(projectRoot, config);
  const optimizer = TreeShakingOptimizer.getInstance();
  const report = optimizer.generateReport(analysis);
  
  fs.writeFileSync(outputPath, report);
  console.log(`📊 Tree shaking report generated: ${outputPath}`);
}

// Export main class and types
export { TreeShakingOptimizer };
export type { TreeShakingAnalysis, TreeShakingConfig };

// Default export
export default TreeShakingOptimizer;