/**
 * Dependency security and version audit
 * Scans dependencies for security vulnerabilities and outdated versions
 */

// Types for dependency audit
interface DependencyAuditConfig {
  packageJsonPaths: string[];
  lockFilePaths: string[];
  securityDatabases: SecurityDatabase[];
  versionCheckEnabled: boolean;
  severityThreshold: 'low' | 'moderate' | 'high' | 'critical';
  excludeDevDependencies: boolean;
  excludePackages: string[];
}

interface SecurityDatabase {
  name: string;
  url: string;
  apiKey?: string;
  enabled: boolean;
}

interface PackageInfo {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency' | 'peerDependency';
  description?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  maintainers?: string[];
}

interface VulnerabilityInfo {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  cwe: string[];
  cvss: {
    score: number;
    vector: string;
  };
  range: string;
  fixedVersions: string[];
  patchedVersions: string[];
  publishedDate: string;
  modifiedDate: string;
  references: string[];
}

interface DependencyIssue {
  package: PackageInfo;
  issue: 'vulnerability' | 'outdated' | 'deprecated' | 'license' | 'security';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  description: string;
  currentVersion: string;
  recommendedVersion?: string;
  fixAction: string;
  vulnerability?: VulnerabilityInfo;
}

interface DependencyAuditResult {
  summary: {
    totalPackages: number;
    vulnerablePackages: number;
    outdatedPackages: number;
    deprecatedPackages: number;
    criticalIssues: number;
    highIssues: number;
    moderateIssues: number;
    lowIssues: number;
  };
  issues: DependencyIssue[];
  recommendations: string[];
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  auditDate: string;
  nextAuditDate: string;
}

/**
 * Package manager adapter interface
 */
interface PackageManagerAdapter {
  name: string;
  parsePackageFile(content: string): PackageInfo[];
  parseLockFile(content: string): Map<string, string>; // package -> version
  getLatestVersion(packageName: string): Promise<string | null>;
  getPackageInfo(packageName: string, version?: string): Promise<PackageInfo | null>;
}

/**
 * NPM package manager adapter
 */
class NPMAdapter implements PackageManagerAdapter {
  public readonly name = 'npm';

  public parsePackageFile(content: string): PackageInfo[] {
    const packages: PackageInfo[] = [];
    
    try {
      const packageJson = JSON.parse(content);
      
      // Parse dependencies
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
          packages.push({
            name,
            version: version as string,
            type: 'dependency',
            description: packageJson.description,
            homepage: packageJson.homepage,
            repository: packageJson.repository?.url,
            license: packageJson.license
          });
        }
      }
      
      // Parse devDependencies
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
          packages.push({
            name,
            version: version as string,
            type: 'devDependency'
          });
        }
      }
      
      // Parse peerDependencies
      if (packageJson.peerDependencies) {
        for (const [name, version] of Object.entries(packageJson.peerDependencies)) {
          packages.push({
            name,
            version: version as string,
            type: 'peerDependency'
          });
        }
      }
      
    } catch (error) {
      console.error('Failed to parse package.json:', error);
    }
    
    return packages;
  }

  public parseLockFile(content: string): Map<string, string> {
    const versionMap = new Map<string, string>();
    
    try {
      // Handle package-lock.json
      if (content.includes('"lockfileVersion"')) {
        const lockFile = JSON.parse(content);
        
        if (lockFile.packages) {
          // npm v7+ format
          for (const [path, info] of Object.entries(lockFile.packages)) {
            if (path && path !== '' && !path.startsWith('node_modules/')) {
              const packageName = path.split('/').pop() || path;
              versionMap.set(packageName, (info as any).version || '');
            }
          }
        } else if (lockFile.dependencies) {
          // npm v6 format
          this.extractVersionsFromDependencies(lockFile.dependencies, versionMap);
        }
      }
      
      // Handle pnpm-lock.yaml (simplified)
      else if (content.includes('lockfileVersion')) {
        const lines = content.split('\n');
        let currentPackage = '';
        
        for (const line of lines) {
          if (line.includes(':') && !line.startsWith(' ')) {
            const match = line.match(/^([^:]+):/);
            if (match) {
              currentPackage = match[1].trim().replace(/'/g, '');
            }
          } else if (line.includes('version:') && currentPackage) {
            const match = line.match(/version:\s*([^\s]+)/);
            if (match) {
              versionMap.set(currentPackage, match[1].trim());
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to parse lock file:', error);
    }
    
    return versionMap;
  }

  private extractVersionsFromDependencies(dependencies: any, versionMap: Map<string, string>): void {
    for (const [name, info] of Object.entries(dependencies)) {
      versionMap.set(name, (info as any).version || '');
      
      // Recursively process nested dependencies
      if ((info as any).dependencies) {
        this.extractVersionsFromDependencies((info as any).dependencies, versionMap);
      }
    }
  }

  public async getLatestVersion(packageName: string): Promise<string | null> {
    try {
      // In a real implementation, this would make an API call to npm registry
      // For this example, we'll simulate it
      const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
      const data = await response.json();
      return data.version || null;
    } catch (error) {
      console.warn(`Failed to get latest version for ${packageName}:`, error);
      return null;
    }
  }

  public async getPackageInfo(packageName: string, version?: string): Promise<PackageInfo | null> {
    try {
      // In a real implementation, this would make an API call to npm registry
      const url = version 
        ? `https://registry.npmjs.org/${packageName}/${version}`
        : `https://registry.npmjs.org/${packageName}/latest`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      return {
        name: data.name,
        version: data.version,
        type: 'dependency',
        description: data.description,
        homepage: data.homepage,
        repository: data.repository?.url,
        license: data.license,
        maintainers: data.maintainers?.map((m: any) => m.name) || []
      };
    } catch (error) {
      console.warn(`Failed to get package info for ${packageName}:`, error);
      return null;
    }
  }
}

/**
 * Security vulnerability checker
 */
class SecurityChecker {
  private databases: SecurityDatabase[];

  constructor(databases: SecurityDatabase[]) {
    this.databases = databases;
  }

  public async checkVulnerabilities(packages: PackageInfo[]): Promise<Map<string, VulnerabilityInfo[]>> {
    const vulnerabilities = new Map<string, VulnerabilityInfo[]>();

    for (const database of this.databases) {
      if (!database.enabled) continue;

      try {
        const dbVulns = await this.queryDatabase(database, packages);
        
        // Merge vulnerabilities
        for (const [packageName, vulns] of dbVulns) {
          if (!vulnerabilities.has(packageName)) {
            vulnerabilities.set(packageName, []);
          }
          vulnerabilities.get(packageName)!.push(...vulns);
        }
      } catch (error) {
        console.warn(`Failed to query security database ${database.name}:`, error);
      }
    }

    return vulnerabilities;
  }

  private async queryDatabase(
    database: SecurityDatabase,
    packages: PackageInfo[]
  ): Promise<Map<string, VulnerabilityInfo[]>> {
    const vulnerabilities = new Map<string, VulnerabilityInfo[]>();

    // This is a simplified implementation
    // In a real system, you would integrate with actual security databases
    // like GitHub Advisory Database, Snyk, OWASP Dependency Check, etc.

    if (database.name === 'github-advisory') {
      // Simulate GitHub Advisory Database integration
      for (const pkg of packages) {
        if (this.isVulnerablePackage(pkg.name, pkg.version)) {
          vulnerabilities.set(pkg.name, [{
            id: 'GHSA-example-' + Math.random().toString(36).substr(2, 9),
            title: `Security vulnerability in ${pkg.name}`,
            description: `A security vulnerability has been found in ${pkg.name} version ${pkg.version}`,
            severity: 'high',
            cwe: ['CWE-79'],
            cvss: {
              score: 7.5,
              vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N'
            },
            range: `<=${pkg.version}`,
            fixedVersions: [this.getNextVersion(pkg.version)],
            patchedVersions: [this.getNextVersion(pkg.version)],
            publishedDate: '2024-01-01T00:00:00Z',
            modifiedDate: '2024-01-15T00:00:00Z',
            references: [
              'https://github.com/advisories/GHSA-example',
              'https://nvd.nist.gov/vuln/detail/CVE-example'
            ]
          }]);
        }
      }
    }

    return vulnerabilities;
  }

  private isVulnerablePackage(name: string, version: string): boolean {
    // Simplified vulnerability check
    // In reality, this would check against real vulnerability databases
    const knownVulnerablePackages = [
      'lodash', 'axios', 'moment', 'express', 'react-dom'
    ];
    
    return knownVulnerablePackages.includes(name) && Math.random() > 0.8;
  }

  private getNextVersion(version: string): string {
    const parts = version.replace(/[^\d.]/g, '').split('.');
    if (parts.length >= 3) {
      const patch = parseInt(parts[2], 10) + 1;
      return `${parts[0]}.${parts[1]}.${patch}`;
    }
    return version;
  }
}

/**
 * Version checker for outdated packages
 */
class VersionChecker {
  private adapter: PackageManagerAdapter;

  constructor(adapter: PackageManagerAdapter) {
    this.adapter = adapter;
  }

  public async checkOutdatedPackages(packages: PackageInfo[]): Promise<Map<string, { current: string; latest: string }>> {
    const outdated = new Map<string, { current: string; latest: string }>();

    for (const pkg of packages) {
      try {
        const latestVersion = await this.adapter.getLatestVersion(pkg.name);
        
        if (latestVersion && this.isOutdated(pkg.version, latestVersion)) {
          outdated.set(pkg.name, {
            current: pkg.version,
            latest: latestVersion
          });
        }
      } catch (error) {
        console.warn(`Failed to check version for ${pkg.name}:`, error);
      }
    }

    return outdated;
  }

  private isOutdated(currentVersion: string, latestVersion: string): boolean {
    // Simplified version comparison
    // In a real implementation, use semver library
    const current = this.parseVersion(currentVersion);
    const latest = this.parseVersion(latestVersion);

    return (
      latest.major > current.major ||
      (latest.major === current.major && latest.minor > current.minor) ||
      (latest.major === current.major && latest.minor === current.minor && latest.patch > current.patch)
    );
  }

  private parseVersion(version: string): { major: number; minor: number; patch: number } {
    const cleaned = version.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.').map(p => parseInt(p, 10) || 0);
    
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0
    };
  }
}

/**
 * Main dependency auditor
 */
export class DependencyAuditor {
  private config: DependencyAuditConfig;
  private adapter: PackageManagerAdapter;
  private securityChecker: SecurityChecker;
  private versionChecker: VersionChecker;

  constructor(config: DependencyAuditConfig, adapter?: PackageManagerAdapter) {
    this.config = config;
    this.adapter = adapter || new NPMAdapter();
    this.securityChecker = new SecurityChecker(config.securityDatabases);
    this.versionChecker = new VersionChecker(this.adapter);
  }

  public async auditDependencies(): Promise<DependencyAuditResult> {
    console.log('🔍 Starting dependency audit...');

    // Load and parse package files
    const packages = await this.loadPackages();
    
    // Filter packages based on config
    const filteredPackages = this.filterPackages(packages);

    // Check for security vulnerabilities
    const vulnerabilities = await this.securityChecker.checkVulnerabilities(filteredPackages);

    // Check for outdated packages
    const outdatedPackages = this.config.versionCheckEnabled 
      ? await this.versionChecker.checkOutdatedPackages(filteredPackages)
      : new Map();

    // Generate issues
    const issues = this.generateIssues(filteredPackages, vulnerabilities, outdatedPackages);

    // Calculate summary and metrics
    const summary = this.calculateSummary(filteredPackages, issues);
    const score = this.calculateScore(issues);
    const grade = this.calculateGrade(score);
    const recommendations = this.generateRecommendations(issues, summary);

    return {
      summary,
      issues,
      recommendations,
      score,
      grade,
      auditDate: new Date().toISOString(),
      nextAuditDate: this.calculateNextAuditDate()
    };
  }

  private async loadPackages(): Promise<PackageInfo[]> {
    const allPackages: PackageInfo[] = [];

    for (const packagePath of this.config.packageJsonPaths) {
      try {
        // In a real implementation, you would read the file from the filesystem
        // For this example, we'll simulate it
        const content = await this.readFile(packagePath);
        const packages = this.adapter.parsePackageFile(content);
        allPackages.push(...packages);
      } catch (error) {
        console.error(`Failed to load package file ${packagePath}:`, error);
      }
    }

    return allPackages;
  }

  private async readFile(path: string): Promise<string> {
    // Simulate file reading - in a real implementation, use fs.readFile
    // This is a mock implementation for the browser context
    return JSON.stringify({
      dependencies: {
        'lodash': '^4.17.19',
        'axios': '^0.21.0',
        'express': '^4.17.1'
      },
      devDependencies: {
        'jest': '^26.6.3',
        'typescript': '^4.3.5'
      }
    });
  }

  private filterPackages(packages: PackageInfo[]): PackageInfo[] {
    return packages.filter(pkg => {
      // Exclude dev dependencies if configured
      if (this.config.excludeDevDependencies && pkg.type === 'devDependency') {
        return false;
      }

      // Exclude specific packages
      if (this.config.excludePackages.includes(pkg.name)) {
        return false;
      }

      return true;
    });
  }

  private generateIssues(
    packages: PackageInfo[],
    vulnerabilities: Map<string, VulnerabilityInfo[]>,
    outdatedPackages: Map<string, { current: string; latest: string }>
  ): DependencyIssue[] {
    const issues: DependencyIssue[] = [];

    // Generate vulnerability issues
    for (const [packageName, vulns] of vulnerabilities) {
      const pkg = packages.find(p => p.name === packageName);
      if (!pkg) continue;

      for (const vuln of vulns) {
        // Skip if below severity threshold
        if (!this.meetsSeverityThreshold(vuln.severity)) continue;

        issues.push({
          package: pkg,
          issue: 'vulnerability',
          severity: vuln.severity,
          title: vuln.title,
          description: vuln.description,
          currentVersion: pkg.version,
          recommendedVersion: vuln.fixedVersions[0],
          fixAction: `Update to version ${vuln.fixedVersions[0] || 'latest'} or apply security patch`,
          vulnerability: vuln
        });
      }
    }

    // Generate outdated package issues
    for (const [packageName, versionInfo] of outdatedPackages) {
      const pkg = packages.find(p => p.name === packageName);
      if (!pkg) continue;

      issues.push({
        package: pkg,
        issue: 'outdated',
        severity: 'low',
        title: `${packageName} is outdated`,
        description: `Package ${packageName} has a newer version available`,
        currentVersion: versionInfo.current,
        recommendedVersion: versionInfo.latest,
        fixAction: `Update to version ${versionInfo.latest}`
      });
    }

    return issues;
  }

  private meetsSeverityThreshold(severity: string): boolean {
    const severityLevels = { low: 1, moderate: 2, high: 3, critical: 4 };
    const threshold = severityLevels[this.config.severityThreshold as keyof typeof severityLevels] || 1;
    const issueSeverity = severityLevels[severity as keyof typeof severityLevels] || 1;
    
    return issueSeverity >= threshold;
  }

  private calculateSummary(packages: PackageInfo[], issues: DependencyIssue[]): DependencyAuditResult['summary'] {
    const vulnerablePackages = new Set();
    const outdatedPackages = new Set();
    const deprecatedPackages = new Set();

    let criticalIssues = 0;
    let highIssues = 0;
    let moderateIssues = 0;
    let lowIssues = 0;

    for (const issue of issues) {
      // Count by severity
      switch (issue.severity) {
        case 'critical':
          criticalIssues++;
          break;
        case 'high':
          highIssues++;
          break;
        case 'moderate':
          moderateIssues++;
          break;
        case 'low':
          lowIssues++;
          break;
      }

      // Count by type
      switch (issue.issue) {
        case 'vulnerability':
          vulnerablePackages.add(issue.package.name);
          break;
        case 'outdated':
          outdatedPackages.add(issue.package.name);
          break;
        case 'deprecated':
          deprecatedPackages.add(issue.package.name);
          break;
      }
    }

    return {
      totalPackages: packages.length,
      vulnerablePackages: vulnerablePackages.size,
      outdatedPackages: outdatedPackages.size,
      deprecatedPackages: deprecatedPackages.size,
      criticalIssues,
      highIssues,
      moderateIssues,
      lowIssues
    };
  }

  private calculateScore(issues: DependencyIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 10;
          break;
        case 'moderate':
          score -= 5;
          break;
        case 'low':
          score -= 1;
          break;
      }
    }

    return Math.max(0, score);
  }

  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private generateRecommendations(
    issues: DependencyIssue[],
    summary: DependencyAuditResult['summary']
  ): string[] {
    const recommendations: string[] = [];

    if (summary.criticalIssues > 0) {
      recommendations.push('🚨 Address critical security vulnerabilities immediately');
    }

    if (summary.vulnerablePackages > 0) {
      recommendations.push('🔒 Update vulnerable packages to secure versions');
    }

    if (summary.outdatedPackages > 5) {
      recommendations.push('📦 Consider updating outdated packages to benefit from latest features and bug fixes');
    }

    recommendations.push('🔄 Set up automated dependency scanning in your CI/CD pipeline');
    recommendations.push('📅 Schedule regular dependency audits (weekly/monthly)');
    recommendations.push('🛡️ Enable security alerts in your repository settings');

    return recommendations;
  }

  private calculateNextAuditDate(): string {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString();
  }
}

/**
 * Predefined configurations for gaming platform
 */
export class GamingPlatformDependencyAudit {
  public static createStandardConfig(): DependencyAuditConfig {
    return {
      packageJsonPaths: [
        './package.json',
        './apps/web/package.json',
        './packages/frontend/package.json',
        './packages/backend/package.json',
        './packages/game-engine/package.json',
        './packages/shared/package.json'
      ],
      lockFilePaths: [
        './package-lock.json',
        './pnpm-lock.yaml',
        './yarn.lock'
      ],
      securityDatabases: [
        {
          name: 'github-advisory',
          url: 'https://api.github.com/advisories',
          enabled: true
        },
        {
          name: 'npm-audit',
          url: 'https://registry.npmjs.org/-/npm/v1/security/audits',
          enabled: true
        }
      ],
      versionCheckEnabled: true,
      severityThreshold: 'moderate',
      excludeDevDependencies: false,
      excludePackages: [
        '@types/node', // Type definitions rarely have security issues
        'typescript'    // Compiler tools
      ]
    };
  }

  public static createProductionConfig(): DependencyAuditConfig {
    const standardConfig = this.createStandardConfig();
    return {
      ...standardConfig,
      excludeDevDependencies: true,
      severityThreshold: 'low' // More strict for production
    };
  }
}

// Development helper
if (process.env.NODE_ENV !== 'production') {
  (window as any).DependencyAuditor = DependencyAuditor;
  (window as any).GamingPlatformDependencyAudit = GamingPlatformDependencyAudit;
  console.log('📋 Dependency Audit Tools loaded. Available: window.DependencyAuditor, window.GamingPlatformDependencyAudit');
}