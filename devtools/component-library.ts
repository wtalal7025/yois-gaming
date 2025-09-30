/**
 * Component library documentation and examples
 * Provides comprehensive documentation and interactive examples for all components
 */

// Types for component library system
interface ComponentInfo {
  name: string;
  category: string;
  description: string;
  props: PropInfo[];
  examples: ComponentExample[];
  usage: string;
  accessibility: AccessibilityInfo;
  variants: ComponentVariant[];
  dependencies: string[];
  version: string;
}

interface PropInfo {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description: string;
  validation?: string;
  examples?: any[];
}

interface ComponentExample {
  name: string;
  description: string;
  code: string;
  props: Record<string, any>;
  preview?: string;
  interactive: boolean;
}

interface AccessibilityInfo {
  roles: string[];
  keyboardNavigation: string[];
  screenReader: string;
  colorContrast: boolean;
  focusManagement: string;
}

interface ComponentVariant {
  name: string;
  description: string;
  props: Record<string, any>;
  preview: string;
}

interface DesignToken {
  name: string;
  value: string;
  category: 'color' | 'spacing' | 'typography' | 'shadow' | 'border' | 'animation';
  description: string;
  usage: string[];
}

/**
 * Component documentation parser
 */
class ComponentDocParser {
  private components: Map<string, ComponentInfo> = new Map();

  public parseComponent(componentCode: string, componentName: string): ComponentInfo | null {
    try {
      // Extract component information from code
      const info = this.extractComponentInfo(componentCode, componentName);
      
      if (info) {
        this.components.set(componentName, info);
        return info;
      }
      
      return null;
    } catch (error) {
      console.error(`Error parsing component ${componentName}:`, error);
      return null;
    }
  }

  private extractComponentInfo(code: string, name: string): ComponentInfo {
    // Extract props from TypeScript interfaces/types
    const props = this.extractProps(code);
    
    // Extract JSDoc comments for descriptions
    const description = this.extractDescription(code);
    
    // Extract examples from comments or separate files
    const examples = this.extractExamples(code);
    
    // Determine category based on file path or naming
    const category = this.determineCategory(name, code);
    
    // Extract accessibility information
    const accessibility = this.extractAccessibilityInfo(code);
    
    // Extract variants
    const variants = this.extractVariants(code);

    return {
      name,
      category,
      description,
      props,
      examples,
      usage: this.generateUsageExample(name, props),
      accessibility,
      variants,
      dependencies: this.extractDependencies(code),
      version: '1.0.0'
    };
  }

  private extractProps(code: string): PropInfo[] {
    const props: PropInfo[] = [];
    
    // RegExp to match TypeScript interface props
    const interfaceRegex = /interface\s+\w+Props\s*{([^}]+)}/gs;
    const propRegex = /(\w+)(\?)?\s*:\s*([^;]+);?\s*(?:\/\*\*(.*?)\*\/)?/gs;

    const interfaceMatch = interfaceRegex.exec(code);
    if (interfaceMatch) {
      const interfaceBody = interfaceMatch[1];
      let propMatch;
      
      while ((propMatch = propRegex.exec(interfaceBody)) !== null) {
        const [, name, optional, type, comment] = propMatch;
        
        props.push({
          name,
          type: type.trim(),
          required: !optional,
          description: this.parseComment(comment || ''),
          validation: this.extractValidation(type.trim()),
          examples: this.generatePropExamples(name, type.trim())
        });
      }
    }

    return props;
  }

  private extractDescription(code: string): string {
    // Look for JSDoc comment above component declaration
    const jsdocRegex = /\/\*\*(.*?)\*\/\s*(?:export\s+)?(?:const|function|class)\s+\w+/s;
    const match = jsdocRegex.exec(code);
    
    if (match) {
      return this.parseComment(match[1]);
    }
    
    return 'No description available';
  }

  private extractExamples(code: string): ComponentExample[] {
    const examples: ComponentExample[] = [];
    
    // Look for example comments
    const exampleRegex = /@example\s+(.*?)(?=@|\*\/|$)/gs;
    let match;
    let index = 0;
    
    while ((match = exampleRegex.exec(code)) !== null) {
      examples.push({
        name: `Example ${++index}`,
        description: `Usage example ${index}`,
        code: match[1].trim(),
        props: this.parseExampleProps(match[1]),
        interactive: true
      });
    }

    // Add default example if none found
    if (examples.length === 0) {
      examples.push({
        name: 'Basic Usage',
        description: 'Basic component usage',
        code: `<${code.match(/(?:const|function|class)\s+(\w+)/)?.[1] || 'Component'} />`,
        props: {},
        interactive: true
      });
    }

    return examples;
  }

  private determineCategory(name: string, code: string): string {
    const categoryKeywords = {
      'layout': ['layout', 'container', 'grid', 'flex', 'box'],
      'form': ['form', 'input', 'button', 'select', 'checkbox', 'radio'],
      'navigation': ['nav', 'menu', 'breadcrumb', 'tab', 'link'],
      'feedback': ['alert', 'toast', 'notification', 'badge', 'progress'],
      'display': ['card', 'table', 'list', 'avatar', 'image'],
      'overlay': ['modal', 'popup', 'tooltip', 'dropdown'],
      'game': ['game', 'board', 'slot', 'mines', 'crash']
    };

    const lowerName = name.toLowerCase();
    const lowerCode = code.toLowerCase();

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => 
        lowerName.includes(keyword) || lowerCode.includes(keyword)
      )) {
        return category;
      }
    }

    return 'misc';
  }

  private extractAccessibilityInfo(code: string): AccessibilityInfo {
    const roles: string[] = [];
    const keyboardNavigation: string[] = [];
    let screenReader = '';
    let colorContrast = false;
    let focusManagement = '';

    // Extract ARIA roles
    const roleMatches = code.match(/role=['"]([^'"]+)['"]/g);
    if (roleMatches) {
      roleMatches.forEach(match => {
        const role = match.match(/role=['"]([^'"]+)['"]/)?.[1];
        if (role && !roles.includes(role)) {
          roles.push(role);
        }
      });
    }

    // Extract keyboard event handlers
    const keyboardEvents = ['onKeyDown', 'onKeyUp', 'onKeyPress'];
    keyboardEvents.forEach(event => {
      if (code.includes(event)) {
        keyboardNavigation.push(event);
      }
    });

    // Check for screen reader attributes
    if (code.includes('aria-label') || code.includes('aria-labelledby')) {
      screenReader = 'Supports screen readers with ARIA labels';
    }

    // Check for focus management
    if (code.includes('useRef') && code.includes('focus')) {
      focusManagement = 'Implements programmatic focus management';
    }

    return {
      roles,
      keyboardNavigation,
      screenReader,
      colorContrast,
      focusManagement
    };
  }

  private extractVariants(code: string): ComponentVariant[] {
    const variants: ComponentVariant[] = [];
    
    // Look for variant props or types
    const variantRegex = /variant\s*:\s*['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = variantRegex.exec(code)) !== null) {
      variants.push({
        name: match[1],
        description: `${match[1]} variant`,
        props: { variant: match[1] },
        preview: `<Component variant="${match[1]}" />`
      });
    }

    return variants;
  }

  private extractDependencies(code: string): string[] {
    const dependencies: string[] = [];
    
    // Extract import statements
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(code)) !== null) {
      const dep = match[1];
      if (!dep.startsWith('.') && !dep.startsWith('/')) {
        dependencies.push(dep);
      }
    }

    return dependencies;
  }

  private parseComment(comment: string): string {
    return comment
      .replace(/^\s*\*\s?/gm, '') // Remove leading * from JSDoc
      .replace(/^\s*\/\*+\s?/, '') // Remove opening /**
      .replace(/\s*\*+\/\s*$/, '') // Remove closing */
      .trim();
  }

  private generateUsageExample(name: string, props: PropInfo[]): string {
    const requiredProps = props.filter(p => p.required);
    const propsString = requiredProps
      .map(prop => `${prop.name}={${this.getExampleValue(prop)}}`)
      .join(' ');
    
    return `<${name}${propsString ? ' ' + propsString : ''} />`;
  }

  private getExampleValue(prop: PropInfo): string {
    switch (prop.type) {
      case 'string': return '"example"';
      case 'number': return '42';
      case 'boolean': return 'true';
      case 'Function': return '() => {}';
      default: return '{}';
    }
  }

  private extractValidation(type: string): string {
    if (type.includes('|')) {
      return `One of: ${type}`;
    }
    if (type.includes('[]')) {
      return 'Array type';
    }
    return type;
  }

  private generatePropExamples(name: string, type: string): any[] {
    const examples: any[] = [];
    
    if (type.includes('|')) {
      // Union type - extract options
      const options = type.split('|').map(t => t.trim().replace(/['"]/g, ''));
      return options.slice(0, 3); // First 3 options
    }
    
    switch (type) {
      case 'string':
        examples.push('example', 'sample', 'test');
        break;
      case 'number':
        examples.push(0, 1, 100);
        break;
      case 'boolean':
        examples.push(true, false);
        break;
    }
    
    return examples;
  }

  private parseExampleProps(exampleCode: string): Record<string, any> {
    const props: Record<string, any> = {};
    
    // Simple prop extraction from JSX
    const propRegex = /(\w+)=\{([^}]+)\}/g;
    let match;
    
    while ((match = propRegex.exec(exampleCode)) !== null) {
      const [, name, value] = match;
      try {
        props[name] = eval(value);
      } catch {
        props[name] = value;
      }
    }
    
    return props;
  }

  public getComponent(name: string): ComponentInfo | undefined {
    return this.components.get(name);
  }

  public getAllComponents(): ComponentInfo[] {
    return Array.from(this.components.values());
  }

  public getComponentsByCategory(category: string): ComponentInfo[] {
    return this.getAllComponents().filter(comp => comp.category === category);
  }

  public searchComponents(query: string): ComponentInfo[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllComponents().filter(comp =>
      comp.name.toLowerCase().includes(lowerQuery) ||
      comp.description.toLowerCase().includes(lowerQuery) ||
      comp.category.toLowerCase().includes(lowerQuery)
    );
  }
}

/**
 * Design token manager
 */
class DesignTokenManager {
  private tokens: Map<string, DesignToken> = new Map();

  public addToken(token: DesignToken): void {
    this.tokens.set(token.name, token);
  }

  public getToken(name: string): DesignToken | undefined {
    return this.tokens.get(name);
  }

  public getTokensByCategory(category: DesignToken['category']): DesignToken[] {
    return Array.from(this.tokens.values()).filter(token => token.category === category);
  }

  public getAllTokens(): DesignToken[] {
    return Array.from(this.tokens.values());
  }

  public loadFromCSS(cssContent: string): void {
    // Parse CSS custom properties
    const customPropRegex = /--([^:]+):\s*([^;]+);/g;
    let match;

    while ((match = customPropRegex.exec(cssContent)) !== null) {
      const [, name, value] = match;
      const category = this.determineCategoryFromName(name);
      
      this.addToken({
        name: `--${name}`,
        value: value.trim(),
        category,
        description: `Design token for ${name}`,
        usage: []
      });
    }
  }

  private determineCategoryFromName(name: string): DesignToken['category'] {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('color') || lowerName.includes('bg') || lowerName.includes('text')) {
      return 'color';
    }
    if (lowerName.includes('space') || lowerName.includes('gap') || lowerName.includes('margin')) {
      return 'spacing';
    }
    if (lowerName.includes('font') || lowerName.includes('text')) {
      return 'typography';
    }
    if (lowerName.includes('shadow')) {
      return 'shadow';
    }
    if (lowerName.includes('border') || lowerName.includes('radius')) {
      return 'border';
    }
    if (lowerName.includes('duration') || lowerName.includes('ease')) {
      return 'animation';
    }
    
    return 'color';
  }

  public generateTokenDocumentation(): string {
    const categories = ['color', 'spacing', 'typography', 'shadow', 'border', 'animation'] as const;
    
    let documentation = '# Design Tokens\n\n';
    
    categories.forEach(category => {
      const tokens = this.getTokensByCategory(category);
      if (tokens.length === 0) return;
      
      documentation += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
      
      tokens.forEach(token => {
        documentation += `### ${token.name}\n`;
        documentation += `- **Value**: \`${token.value}\`\n`;
        documentation += `- **Description**: ${token.description}\n`;
        if (token.usage.length > 0) {
          documentation += `- **Usage**: ${token.usage.join(', ')}\n`;
        }
        documentation += '\n';
      });
    });
    
    return documentation;
  }
}

/**
 * Interactive example runner
 */
class ExampleRunner {
  private container: HTMLElement;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with ID ${containerId} not found`);
    }
    this.container = container;
  }

  public renderExample(example: ComponentExample): void {
    // Create example container
    const exampleContainer = document.createElement('div');
    exampleContainer.className = 'component-example';
    
    // Create title
    const title = document.createElement('h3');
    title.textContent = example.name;
    exampleContainer.appendChild(title);
    
    // Create description
    const description = document.createElement('p');
    description.textContent = example.description;
    exampleContainer.appendChild(description);
    
    // Create code display
    const codeContainer = document.createElement('div');
    codeContainer.className = 'code-container';
    
    const codeElement = document.createElement('pre');
    codeElement.innerHTML = `<code>${this.highlightCode(example.code)}</code>`;
    codeContainer.appendChild(codeElement);
    
    exampleContainer.appendChild(codeContainer);
    
    // Create preview (placeholder)
    const previewContainer = document.createElement('div');
    previewContainer.className = 'preview-container';
    previewContainer.innerHTML = '<p>Interactive preview would be rendered here</p>';
    exampleContainer.appendChild(previewContainer);
    
    this.container.appendChild(exampleContainer);
  }

  private highlightCode(code: string): string {
    // Simple syntax highlighting
    return code
      .replace(/(&lt;\/?[^&]+&gt;)/g, '<span class="jsx-tag">$1</span>')
      .replace(/(\w+)=/g, '<span class="jsx-prop">$1</span>=')
      .replace(/{([^}]+)}/g, '{<span class="jsx-expression">$1</span>}');
  }

  public clear(): void {
    this.container.innerHTML = '';
  }
}

/**
 * Main component library manager
 */
export class ComponentLibrary {
  private static instance: ComponentLibrary;
  
  private parser: ComponentDocParser;
  private tokenManager: DesignTokenManager;
  private exampleRunner?: ExampleRunner;
  private searchIndex: Map<string, ComponentInfo[]> = new Map();

  private constructor() {
    this.parser = new ComponentDocParser();
    this.tokenManager = new DesignTokenManager();
    this.buildSearchIndex();
  }

  public static getInstance(): ComponentLibrary {
    if (!ComponentLibrary.instance) {
      ComponentLibrary.instance = new ComponentLibrary();
    }
    return ComponentLibrary.instance;
  }

  public parseComponentsFromDirectory(components: { name: string; code: string }[]): void {
    components.forEach(({ name, code }) => {
      this.parser.parseComponent(code, name);
    });
    
    this.buildSearchIndex();
  }

  public loadDesignTokens(cssContent: string): void {
    this.tokenManager.loadFromCSS(cssContent);
  }

  public initializeExampleRunner(containerId: string): void {
    this.exampleRunner = new ExampleRunner(containerId);
  }

  public getDocumentation(): {
    components: ComponentInfo[];
    tokens: DesignToken[];
    categories: string[];
  } {
    const components = this.parser.getAllComponents();
    const tokens = this.tokenManager.getAllTokens();
    const categories = [...new Set(components.map(c => c.category))];

    return { components, tokens, categories };
  }

  public generateFullDocumentation(): string {
    const { components, tokens, categories } = this.getDocumentation();
    
    let doc = '# Component Library Documentation\n\n';
    
    // Table of contents
    doc += '## Table of Contents\n\n';
    categories.forEach(category => {
      doc += `- [${category}](#${category.toLowerCase()})\n`;
    });
    doc += '- [Design Tokens](#design-tokens)\n\n';
    
    // Components by category
    categories.forEach(category => {
      const categoryComponents = this.parser.getComponentsByCategory(category);
      if (categoryComponents.length === 0) return;
      
      doc += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
      
      categoryComponents.forEach(component => {
        doc += this.generateComponentDocumentation(component);
      });
    });
    
    // Design tokens
    doc += this.tokenManager.generateTokenDocumentation();
    
    return doc;
  }

  private generateComponentDocumentation(component: ComponentInfo): string {
    let doc = `### ${component.name}\n\n`;
    doc += `${component.description}\n\n`;
    
    // Props table
    if (component.props.length > 0) {
      doc += '#### Props\n\n';
      doc += '| Name | Type | Required | Default | Description |\n';
      doc += '|------|------|----------|---------|-------------|\n';
      
      component.props.forEach(prop => {
        doc += `| ${prop.name} | ${prop.type} | ${prop.required ? 'Yes' : 'No'} | ${prop.defaultValue || '-'} | ${prop.description} |\n`;
      });
      doc += '\n';
    }
    
    // Usage example
    doc += '#### Usage\n\n';
    doc += '```tsx\n';
    doc += component.usage;
    doc += '\n```\n\n';
    
    // Examples
    if (component.examples.length > 0) {
      doc += '#### Examples\n\n';
      component.examples.forEach(example => {
        doc += `**${example.name}**\n\n`;
        doc += `${example.description}\n\n`;
        doc += '```tsx\n';
        doc += example.code;
        doc += '\n```\n\n';
      });
    }
    
    // Accessibility
    if (component.accessibility.roles.length > 0 || component.accessibility.screenReader) {
      doc += '#### Accessibility\n\n';
      if (component.accessibility.roles.length > 0) {
        doc += `- **ARIA Roles**: ${component.accessibility.roles.join(', ')}\n`;
      }
      if (component.accessibility.screenReader) {
        doc += `- **Screen Reader**: ${component.accessibility.screenReader}\n`;
      }
      if (component.accessibility.keyboardNavigation.length > 0) {
        doc += `- **Keyboard Navigation**: ${component.accessibility.keyboardNavigation.join(', ')}\n`;
      }
      doc += '\n';
    }
    
    return doc;
  }

  public searchComponents(query: string): ComponentInfo[] {
    const cached = this.searchIndex.get(query.toLowerCase());
    if (cached) return cached;
    
    const results = this.parser.searchComponents(query);
    this.searchIndex.set(query.toLowerCase(), results);
    return results;
  }

  private buildSearchIndex(): void {
    this.searchIndex.clear();
    // Pre-populate common searches
    const categories = ['form', 'layout', 'navigation', 'feedback', 'display', 'overlay', 'game'];
    categories.forEach(category => {
      const components = this.parser.getComponentsByCategory(category);
      this.searchIndex.set(category, components);
    });
  }

  public renderExamples(componentName: string): void {
    if (!this.exampleRunner) return;
    
    const component = this.parser.getComponent(componentName);
    if (!component) return;
    
    this.exampleRunner.clear();
    component.examples.forEach(example => {
      this.exampleRunner!.renderExample(example);
    });
  }

  public exportDocumentation(format: 'markdown' | 'json' | 'html'): string {
    const documentation = this.getDocumentation();
    
    switch (format) {
      case 'markdown':
        return this.generateFullDocumentation();
      case 'json':
        return JSON.stringify(documentation, null, 2);
      case 'html':
        return this.generateHTMLDocumentation(documentation);
      default:
        return this.generateFullDocumentation();
    }
  }

  private generateHTMLDocumentation(documentation: any): string {
    // Simplified HTML generation
    return `
      <html>
        <head>
          <title>Component Library</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .component { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; }
            .props-table { width: 100%; border-collapse: collapse; }
            .props-table th, .props-table td { border: 1px solid #ddd; padding: 8px; }
            pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <h1>Component Library Documentation</h1>
          ${documentation.components.map((comp: ComponentInfo) => `
            <div class="component">
              <h2>${comp.name}</h2>
              <p>${comp.description}</p>
              <!-- Component details would be rendered here -->
            </div>
          `).join('')}
        </body>
      </html>
    `;
  }
}

// Global component library instance
export const componentLibrary = ComponentLibrary.getInstance();

// Development helper
if (process.env.NODE_ENV !== 'production') {
  (window as any).componentLibrary = componentLibrary;
  console.log('📚 Component Library loaded. Available: window.componentLibrary');
}