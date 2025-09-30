/**
 * Webpack Bundle Analyzer Configuration
 * Analyzes bundle size, identifies optimization opportunities, and provides recommendations
 * 
 * @fileoverview Bundle analysis tool for identifying optimization opportunities
 * @author Gaming Platform Team
 * @version 1.0.0
 */

const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const path = require('path');
const fs = require('fs');

/**
 * Bundle analysis configuration and utilities
 */
class BundleAnalyzer {
  constructor(options = {}) {
    this.options = {
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json',
      logLevel: 'info',
      ...options
    };
  }

  /**
   * Creates webpack plugin configuration for bundle analysis
   * @returns {BundleAnalyzerPlugin} Configured plugin instance
   */
  createPlugin() {
    return new BundleAnalyzerPlugin({
      analyzerMode: this.options.analyzerMode,
      openAnalyzer: this.options.openAnalyzer,
      reportFilename: this.options.reportFilename,
      generateStatsFile: this.options.generateStatsFile,
      statsFilename: this.options.statsFilename,
      logLevel: this.options.logLevel,
    });
  }

  /**
   * Analyzes bundle statistics and provides optimization recommendations
   * @param {string} statsFile - Path to bundle stats JSON file
   * @returns {Promise<Object>} Analysis results with recommendations
   */
  async analyzeBundle(statsFile) {
    try {
      const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
      const analysis = {
        totalSize: 0,
        chunks: [],
        assets: [],
        modules: [],
        recommendations: []
      };

      // Analyze chunks
      analysis.chunks = stats.chunks.map(chunk => ({
        id: chunk.id,
        names: chunk.names,
        size: chunk.size,
        files: chunk.files,
        parents: chunk.parents,
        children: chunk.children
      }));

      // Analyze assets
      analysis.assets = stats.assets.map(asset => ({
        name: asset.name,
        size: asset.size,
        chunks: asset.chunks,
        chunkNames: asset.chunkNames
      }));

      // Calculate total size
      analysis.totalSize = analysis.assets.reduce((total, asset) => total + asset.size, 0);

      // Analyze modules for large dependencies
      analysis.modules = stats.modules
        .filter(module => module.size > 10000) // Only modules > 10KB
        .map(module => ({
          name: module.name,
          size: module.size,
          chunks: module.chunks
        }))
        .sort((a, b) => b.size - a.size);

      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      return analysis;
    } catch (error) {
      console.error('Failed to analyze bundle:', error);
      throw error;
    }
  }

  /**
   * Generates optimization recommendations based on bundle analysis
   * @param {Object} analysis - Bundle analysis data
   * @returns {Array} Array of recommendation objects
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Check for large bundles
    const largeBundleThreshold = 250000; // 250KB
    const largeAssets = analysis.assets.filter(asset => asset.size > largeBundleThreshold);
    
    if (largeAssets.length > 0) {
      recommendations.push({
        type: 'bundle-size',
        severity: 'high',
        title: 'Large Bundle Detected',
        description: `Found ${largeAssets.length} asset(s) larger than 250KB`,
        assets: largeAssets.map(asset => asset.name),
        solution: 'Consider code splitting, lazy loading, or removing unused dependencies'
      });
    }

    // Check for duplicate modules
    const moduleNames = analysis.modules.map(m => m.name);
    const duplicates = moduleNames.filter((name, index) => moduleNames.indexOf(name) !== index);
    
    if (duplicates.length > 0) {
      recommendations.push({
        type: 'duplicates',
        severity: 'medium',
        title: 'Duplicate Modules Found',
        description: `Found ${duplicates.length} potentially duplicate modules`,
        modules: [...new Set(duplicates)],
        solution: 'Use webpack optimization.splitChunks to deduplicate common modules'
      });
    }

    // Check for large third-party libraries
    const largeLibraries = analysis.modules
      .filter(module => 
        module.name.includes('node_modules') && 
        module.size > 50000 // > 50KB
      );

    if (largeLibraries.length > 0) {
      recommendations.push({
        type: 'large-dependencies',
        severity: 'medium',
        title: 'Large Third-Party Dependencies',
        description: `Found ${largeLibraries.length} large third-party dependencies`,
        libraries: largeLibraries.map(lib => ({
          name: lib.name.match(/node_modules\/([^\/]+)/)?.[1] || lib.name,
          size: lib.size
        })),
        solution: 'Consider using lighter alternatives or dynamic imports for large libraries'
      });
    }

    // Check chunk distribution
    const totalChunks = analysis.chunks.length;
    if (totalChunks < 3) {
      recommendations.push({
        type: 'code-splitting',
        severity: 'low',
        title: 'Limited Code Splitting',
        description: `Only ${totalChunks} chunks found - consider more aggressive code splitting`,
        solution: 'Implement route-based code splitting and dynamic imports for better caching'
      });
    }

    return recommendations;
  }

  /**
   * Generates a detailed analysis report
   * @param {Object} analysis - Bundle analysis data
   * @returns {string} HTML report content
   */
  generateReport(analysis) {
    const report = `
<!DOCTYPE html>
<html>
<head>
    <title>Bundle Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .recommendation { 
            border-left: 4px solid #007bff; 
            padding: 10px; 
            margin: 10px 0; 
            background: #f8f9fa; 
        }
        .high { border-left-color: #dc3545; }
        .medium { border-left-color: #ffc107; }
        .low { border-left-color: #28a745; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Bundle Analysis Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Bundle Size:</strong> ${(analysis.totalSize / 1024).toFixed(2)} KB</p>
        <p><strong>Number of Chunks:</strong> ${analysis.chunks.length}</p>
        <p><strong>Number of Assets:</strong> ${analysis.assets.length}</p>
        <p><strong>Large Modules (>10KB):</strong> ${analysis.modules.length}</p>
    </div>

    <div class="recommendations">
        <h2>Recommendations</h2>
        ${analysis.recommendations.map(rec => `
            <div class="recommendation ${rec.severity}">
                <h3>${rec.title}</h3>
                <p>${rec.description}</p>
                <p><strong>Solution:</strong> ${rec.solution}</p>
            </div>
        `).join('')}
    </div>

    <div class="assets">
        <h2>Largest Assets</h2>
        <table>
            <thead>
                <tr>
                    <th>Asset Name</th>
                    <th>Size (KB)</th>
                    <th>Chunks</th>
                </tr>
            </thead>
            <tbody>
                ${analysis.assets
                  .sort((a, b) => b.size - a.size)
                  .slice(0, 10)
                  .map(asset => `
                    <tr>
                        <td>${asset.name}</td>
                        <td>${(asset.size / 1024).toFixed(2)}</td>
                        <td>${asset.chunkNames.join(', ')}</td>
                    </tr>
                  `).join('')}
            </tbody>
        </table>
    </div>

    <div class="modules">
        <h2>Largest Modules</h2>
        <table>
            <thead>
                <tr>
                    <th>Module Name</th>
                    <th>Size (KB)</th>
                </tr>
            </thead>
            <tbody>
                ${analysis.modules
                  .slice(0, 20)
                  .map(module => `
                    <tr>
                        <td>${module.name}</td>
                        <td>${(module.size / 1024).toFixed(2)}</td>
                    </tr>
                  `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>
    `;

    return report;
  }

  /**
   * Runs complete bundle analysis and generates reports
   * @param {string} webpackConfig - Path to webpack config file
   * @returns {Promise<Object>} Complete analysis results
   */
  async runAnalysis(webpackConfig) {
    console.log('🔍 Starting bundle analysis...');
    
    try {
      // Load webpack config and add analyzer plugin
      const config = require(path.resolve(webpackConfig));
      config.plugins = config.plugins || [];
      config.plugins.push(this.createPlugin());

      // Run webpack build with analysis
      const webpack = require('webpack');
      const compiler = webpack(config);

      return new Promise((resolve, reject) => {
        compiler.run(async (err, stats) => {
          if (err) {
            reject(err);
            return;
          }

          try {
            // Wait for stats file to be generated
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Analyze the generated stats
            const analysis = await this.analyzeBundle(this.options.statsFilename);
            
            // Generate HTML report
            const reportHtml = this.generateReport(analysis);
            fs.writeFileSync('bundle-analysis-report.html', reportHtml);

            console.log('✅ Bundle analysis complete!');
            console.log(`📊 Total bundle size: ${(analysis.totalSize / 1024).toFixed(2)} KB`);
            console.log(`📦 Number of chunks: ${analysis.chunks.length}`);
            console.log(`⚠️  Recommendations: ${analysis.recommendations.length}`);
            
            resolve(analysis);
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error);
      throw error;
    }
  }
}

// Export for use in webpack config or as standalone tool
module.exports = BundleAnalyzer;

// CLI usage example
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  const webpackConfigPath = process.argv[2] || './webpack.config.js';
  
  analyzer.runAnalysis(webpackConfigPath)
    .then(analysis => {
      console.log('\n📋 Analysis Summary:');
      analysis.recommendations.forEach(rec => {
        console.log(`  ${rec.severity.toUpperCase()}: ${rec.title}`);
      });
    })
    .catch(error => {
      console.error('Analysis failed:', error);
      process.exit(1);
    });
}