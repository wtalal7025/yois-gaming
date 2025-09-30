/**
 * Enhanced Input Validation and Sanitization System
 * Provides comprehensive input validation, sanitization, and injection attack prevention
 */

// Types for input validation
export interface ValidationRule {
  type: ValidationType;
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  sanitizer?: (value: any) => any;
  errorMessage?: string;
}

export interface ValidationSchema {
  [field: string]: ValidationRule | ValidationRule[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedData: Record<string, any>;
  warnings: string[];
}

export interface ValidationError {
  field: string;
  value: any;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface SanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
  stripTags?: boolean;
  encodeEntities?: boolean;
  removeScripts?: boolean;
  normalizeWhitespace?: boolean;
}

export type ValidationType = 
  | 'string' 
  | 'number' 
  | 'integer' 
  | 'float' 
  | 'boolean' 
  | 'email' 
  | 'url' 
  | 'uuid' 
  | 'date' 
  | 'time' 
  | 'datetime' 
  | 'json' 
  | 'array' 
  | 'object' 
  | 'base64' 
  | 'hex' 
  | 'alphanumeric' 
  | 'ascii' 
  | 'creditCard' 
  | 'phoneNumber' 
  | 'ipAddress' 
  | 'mongoId' 
  | 'jwt' 
  | 'html' 
  | 'css' 
  | 'javascript';

export interface InjectionPattern {
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  category: 'sql' | 'xss' | 'command' | 'ldap' | 'xpath' | 'nosql';
}

/**
 * Core Validator Engine
 */
class ValidatorEngine {
  private patterns: Map<string, RegExp> = new Map();
  private injectionPatterns: InjectionPattern[] = [];

  constructor() {
    this.initializePatterns();
    this.initializeInjectionPatterns();
  }

  /**
   * Validate single value against rule
   */
  validateValue(value: any, rule: ValidationRule, fieldName = 'field'): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check required
    if (rule.required && (value === null || value === undefined || value === '')) {
      errors.push({
        field: fieldName,
        value,
        rule: 'required',
        message: rule.errorMessage || `${fieldName} is required`,
        severity: 'error'
      });
      return errors;
    }

    // Skip other validations if value is empty and not required
    if (!rule.required && (value === null || value === undefined || value === '')) {
      return errors;
    }

    // Type validation
    const typeError = this.validateType(value, rule.type, fieldName);
    if (typeError) {
      errors.push(typeError);
      return errors; // Don't continue if type is wrong
    }

    // Length/range validation
    if (rule.min !== undefined || rule.max !== undefined) {
      const lengthError = this.validateLength(value, rule.min, rule.max, fieldName);
      if (lengthError) {
        errors.push(lengthError);
      }
    }

    // Pattern validation
    if (rule.pattern) {
      const patternError = this.validatePattern(value, rule.pattern, fieldName);
      if (patternError) {
        errors.push(patternError);
      }
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        errors.push({
          field: fieldName,
          value,
          rule: 'custom',
          message: typeof customResult === 'string' ? customResult : `${fieldName} failed custom validation`,
          severity: 'error'
        });
      }
    }

    return errors;
  }

  /**
   * Sanitize value according to rule
   */
  sanitizeValue(value: any, rule: ValidationRule): any {
    if (value === null || value === undefined) {
      return value;
    }

    let sanitized = value;

    // Apply custom sanitizer first
    if (rule.sanitizer) {
      sanitized = rule.sanitizer(sanitized);
    }

    // Apply type-specific sanitization
    sanitized = this.sanitizeByType(sanitized, rule.type);

    return sanitized;
  }

  /**
   * Check for injection patterns
   */
  detectInjectionAttempts(value: string): InjectionPattern[] {
    if (typeof value !== 'string') return [];

    return this.injectionPatterns.filter(pattern => 
      pattern.pattern.test(value)
    );
  }

  private validateType(value: any, type: ValidationType, fieldName: string): ValidationError | null {
    const validators: Record<ValidationType, (val: any) => boolean> = {
      string: val => typeof val === 'string',
      number: val => typeof val === 'number' && !isNaN(val),
      integer: val => Number.isInteger(Number(val)),
      float: val => typeof val === 'number' && !isNaN(val),
      boolean: val => typeof val === 'boolean',
      email: val => typeof val === 'string' && this.patterns.get('email')!.test(val),
      url: val => typeof val === 'string' && this.patterns.get('url')!.test(val),
      uuid: val => typeof val === 'string' && this.patterns.get('uuid')!.test(val),
      date: val => !isNaN(Date.parse(val)),
      time: val => typeof val === 'string' && this.patterns.get('time')!.test(val),
      datetime: val => !isNaN(Date.parse(val)),
      json: val => {
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      array: val => Array.isArray(val),
      object: val => typeof val === 'object' && val !== null && !Array.isArray(val),
      base64: val => typeof val === 'string' && this.patterns.get('base64')!.test(val),
      hex: val => typeof val === 'string' && this.patterns.get('hex')!.test(val),
      alphanumeric: val => typeof val === 'string' && this.patterns.get('alphanumeric')!.test(val),
      ascii: val => typeof val === 'string' && this.patterns.get('ascii')!.test(val),
      creditCard: val => typeof val === 'string' && this.patterns.get('creditCard')!.test(val.replace(/\s/g, '')),
      phoneNumber: val => typeof val === 'string' && this.patterns.get('phoneNumber')!.test(val),
      ipAddress: val => typeof val === 'string' && this.patterns.get('ipAddress')!.test(val),
      mongoId: val => typeof val === 'string' && this.patterns.get('mongoId')!.test(val),
      jwt: val => typeof val === 'string' && this.patterns.get('jwt')!.test(val),
      html: val => typeof val === 'string',
      css: val => typeof val === 'string',
      javascript: val => typeof val === 'string'
    };

    const validator = validators[type];
    if (!validator || !validator(value)) {
      return {
        field: fieldName,
        value,
        rule: 'type',
        message: `${fieldName} must be of type ${type}`,
        severity: 'error'
      };
    }

    return null;
  }

  private validateLength(value: any, min?: number, max?: number, fieldName = 'field'): ValidationError | null {
    let length: number;

    if (typeof value === 'string' || Array.isArray(value)) {
      length = value.length;
    } else if (typeof value === 'number') {
      length = value;
    } else {
      return null; // Can't validate length for other types
    }

    if (min !== undefined && length < min) {
      return {
        field: fieldName,
        value,
        rule: 'min',
        message: `${fieldName} must be at least ${min} ${typeof value === 'string' ? 'characters' : 'items'} long`,
        severity: 'error'
      };
    }

    if (max !== undefined && length > max) {
      return {
        field: fieldName,
        value,
        rule: 'max',
        message: `${fieldName} must be at most ${max} ${typeof value === 'string' ? 'characters' : 'items'} long`,
        severity: 'error'
      };
    }

    return null;
  }

  private validatePattern(value: any, pattern: RegExp, fieldName: string): ValidationError | null {
    if (typeof value !== 'string' || !pattern.test(value)) {
      return {
        field: fieldName,
        value,
        rule: 'pattern',
        message: `${fieldName} does not match the required pattern`,
        severity: 'error'
      };
    }
    return null;
  }

  private sanitizeByType(value: any, type: ValidationType): any {
    if (value === null || value === undefined) return value;

    switch (type) {
      case 'string':
        return String(value).trim();
      
      case 'number':
      case 'float':
        return Number(value);
      
      case 'integer':
        return parseInt(String(value), 10);
      
      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
        }
        return Boolean(value);
      
      case 'email':
        return String(value).toLowerCase().trim();
      
      case 'url':
        return String(value).trim();
      
      case 'html':
        return this.sanitizeHTML(String(value));
      
      case 'alphanumeric':
        return String(value).replace(/[^a-zA-Z0-9]/g, '');
      
      case 'ascii':
        return String(value).replace(/[^\x20-\x7E]/g, '');
      
      default:
        return value;
    }
  }

  private sanitizeHTML(html: string, options: SanitizationOptions = {}): string {
    const defaultOptions: SanitizationOptions = {
      allowedTags: ['b', 'i', 'u', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
      allowedAttributes: ['href', 'title', 'alt'],
      stripTags: false,
      encodeEntities: true,
      removeScripts: true,
      normalizeWhitespace: true,
      ...options
    };

    let sanitized = html;

    // Remove script tags and content
    if (defaultOptions.removeScripts) {
      sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      sanitized = sanitized.replace(/javascript:/gi, '');
      sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    }

    // Encode HTML entities
    if (defaultOptions.encodeEntities) {
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }

    // Strip all tags if requested
    if (defaultOptions.stripTags) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Normalize whitespace
    if (defaultOptions.normalizeWhitespace) {
      sanitized = sanitized.replace(/\s+/g, ' ').trim();
    }

    return sanitized;
  }

  private initializePatterns(): void {
    this.patterns.set('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    this.patterns.set('url', /^https?:\/\/(?:[-\w.])+(?:[:\d]+)?(?:\/(?:[\w._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*(?:\?(?:[\w._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*)?(?:#(?:[\w._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*)?$/);
    this.patterns.set('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    this.patterns.set('time', /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/);
    this.patterns.set('base64', /^[A-Za-z0-9+/]*={0,2}$/);
    this.patterns.set('hex', /^[0-9A-Fa-f]+$/);
    this.patterns.set('alphanumeric', /^[a-zA-Z0-9]+$/);
    this.patterns.set('ascii', /^[\x20-\x7E]*$/);
    this.patterns.set('creditCard', /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$/);
    this.patterns.set('phoneNumber', /^\+?[1-9]\d{1,14}$/);
    this.patterns.set('ipAddress', /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/);
    this.patterns.set('mongoId', /^[0-9a-fA-F]{24}$/);
    this.patterns.set('jwt', /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/);
  }

  private initializeInjectionPatterns(): void {
    // SQL Injection patterns
    this.injectionPatterns.push(
      {
        name: 'SQL Union Attack',
        pattern: /\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/i,
        severity: 'critical',
        description: 'SQL injection attempt detected',
        category: 'sql'
      },
      {
        name: 'SQL Comment Attack',
        pattern: /(--|\#|\/\*|\*\/)/,
        severity: 'high',
        description: 'SQL comment injection detected',
        category: 'sql'
      },
      {
        name: 'SQL String Escape',
        pattern: /('|(\\x27)|(\\x2D\\x2D))/i,
        severity: 'high',
        description: 'SQL string escape attempt',
        category: 'sql'
      }
    );

    // XSS patterns
    this.injectionPatterns.push(
      {
        name: 'Script Tag Injection',
        pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        severity: 'critical',
        description: 'Script tag injection detected',
        category: 'xss'
      },
      {
        name: 'Event Handler Injection',
        pattern: /\bon\w+\s*=|javascript:/i,
        severity: 'high',
        description: 'Event handler injection detected',
        category: 'xss'
      },
      {
        name: 'Data URI Injection',
        pattern: /data:(?:text\/html|application\/javascript)/i,
        severity: 'high',
        description: 'Data URI injection detected',
        category: 'xss'
      }
    );

    // Command injection patterns
    this.injectionPatterns.push(
      {
        name: 'Command Injection',
        pattern: /[;&|`$(){}[\]\\]/,
        severity: 'critical',
        description: 'Command injection attempt detected',
        category: 'command'
      },
      {
        name: 'Path Traversal',
        pattern: /\.\.[\/\\]/,
        severity: 'high',
        description: 'Path traversal attempt detected',
        category: 'command'
      }
    );

    // NoSQL injection patterns
    this.injectionPatterns.push(
      {
        name: 'NoSQL Injection',
        pattern: /\$where|\$ne|\$in|\$nin|\$gt|\$lt/i,
        severity: 'high',
        description: 'NoSQL injection attempt detected',
        category: 'nosql'
      }
    );

    // LDAP injection patterns
    this.injectionPatterns.push(
      {
        name: 'LDAP Injection',
        pattern: /[()!&|=*<>~]/,
        severity: 'medium',
        description: 'LDAP injection attempt detected',
        category: 'ldap'
      }
    );
  }
}

/**
 * Schema Validator
 */
class SchemaValidator {
  private engine: ValidatorEngine;

  constructor() {
    this.engine = new ValidatorEngine();
  }

  /**
   * Validate data against schema
   */
  validate(data: Record<string, any>, schema: ValidationSchema): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const sanitizedData: Record<string, any> = {};

    // Validate each field in schema
    for (const [fieldName, fieldRules] of Object.entries(schema)) {
      const value = data[fieldName];
      const rules = Array.isArray(fieldRules) ? fieldRules : [fieldRules];

      let fieldValid = true;
      let sanitizedValue = value;

      for (const rule of rules) {
        // Validate
        const fieldErrors = this.engine.validateValue(value, rule, fieldName);
        if (fieldErrors.length > 0) {
          errors.push(...fieldErrors);
          fieldValid = false;
        }

        // Sanitize only if validation passed
        if (fieldValid) {
          sanitizedValue = this.engine.sanitizeValue(sanitizedValue, rule);
        }

        // Check for injection attempts
        if (typeof value === 'string') {
          const injections = this.engine.detectInjectionAttempts(value);
          if (injections.length > 0) {
            injections.forEach(injection => {
              errors.push({
                field: fieldName,
                value,
                rule: 'security',
                message: `Security violation: ${injection.description}`,
                severity: injection.severity === 'critical' || injection.severity === 'high' ? 'error' : 'warning'
              });
            });
            fieldValid = false;
          }
        }
      }

      sanitizedData[fieldName] = sanitizedValue;
    }

    // Check for unexpected fields
    for (const fieldName of Object.keys(data)) {
      if (!schema[fieldName]) {
        warnings.push(`Unexpected field: ${fieldName}`);
      }
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      sanitizedData,
      warnings
    };
  }

  /**
   * Validate single field
   */
  validateField(value: any, rule: ValidationRule, fieldName = 'field'): ValidationResult {
    const errors = this.engine.validateValue(value, rule, fieldName);
    const sanitizedValue = this.engine.sanitizeValue(value, rule);

    // Check for injection attempts
    const injections = typeof value === 'string' ? this.engine.detectInjectionAttempts(value) : [];
    injections.forEach(injection => {
      errors.push({
        field: fieldName,
        value,
        rule: 'security',
        message: `Security violation: ${injection.description}`,
        severity: injection.severity === 'critical' || injection.severity === 'high' ? 'error' : 'warning'
      });
    });

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      sanitizedData: { [fieldName]: sanitizedValue },
      warnings: []
    };
  }
}

/**
 * Request Validator Middleware
 */
class RequestValidator {
  private schemaValidator: SchemaValidator;
  private schemas: Map<string, ValidationSchema> = new Map();

  constructor() {
    this.schemaValidator = new SchemaValidator();
  }

  /**
   * Register validation schema for route
   */
  registerSchema(route: string, schema: ValidationSchema): void {
    this.schemas.set(route, schema);
  }

  /**
   * Express middleware
   */
  express(schema?: ValidationSchema) {
    return (req: any, res: any, next: any) => {
      const validationSchema = schema || this.schemas.get(req.path);
      if (!validationSchema) {
        return next();
      }

      const result = this.validateRequest(req, validationSchema);
      
      if (!result.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: result.errors,
          warnings: result.warnings
        });
      }

      // Replace request data with sanitized version
      req.validatedData = result.sanitizedData;
      req.validationWarnings = result.warnings;

      next();
    };
  }

  /**
   * Fastify plugin
   */
  fastify() {
    return async (fastify: any) => {
      fastify.addHook('preHandler', async (request: any, reply: any) => {
        const schema = this.schemas.get(request.routerPath);
        if (!schema) return;

        const result = this.validateRequest(request, schema);
        
        if (!result.isValid) {
          reply.code(400).send({
            error: 'Validation failed',
            details: result.errors,
            warnings: result.warnings
          });
          return;
        }

        request.validatedData = result.sanitizedData;
        request.validationWarnings = result.warnings;
      });
    };
  }

  /**
   * Validate request data
   */
  validateRequest(request: any, schema: ValidationSchema): ValidationResult {
    // Combine all request data
    const data = {
      ...request.query,
      ...request.body,
      ...request.params
    };

    return this.schemaValidator.validate(data, schema);
  }

  /**
   * Get registered schemas
   */
  getSchemas(): Map<string, ValidationSchema> {
    return new Map(this.schemas);
  }
}

/**
 * Main Input Validation Manager
 */
export class InputValidationManager {
  private static instance: InputValidationManager;
  private schemaValidator: SchemaValidator;
  private requestValidator: RequestValidator;
  private isEnabled = true;

  private constructor() {
    this.schemaValidator = new SchemaValidator();
    this.requestValidator = new RequestValidator();
  }

  static getInstance(): InputValidationManager {
    if (!InputValidationManager.instance) {
      InputValidationManager.instance = new InputValidationManager();
    }
    return InputValidationManager.instance;
  }

  /**
   * Initialize input validation
   */
  initialize(): void {
    console.log('Initializing input validation and sanitization...');
    
    this.registerCommonSchemas();
    
    console.log('Input validation and sanitization initialized');
  }

  /**
   * Get schema validator
   */
  getSchemaValidator(): SchemaValidator {
    return this.schemaValidator;
  }

  /**
   * Get request validator
   */
  getRequestValidator(): RequestValidator {
    return this.requestValidator;
  }

  /**
   * Validate data against schema
   */
  validate(data: Record<string, any>, schema: ValidationSchema): ValidationResult {
    return this.schemaValidator.validate(data, schema);
  }

  /**
   * Register validation schema
   */
  registerSchema(route: string, schema: ValidationSchema): void {
    this.requestValidator.registerSchema(route, schema);
  }

  /**
   * Create validation middleware
   */
  createMiddleware(schema?: ValidationSchema) {
    return this.requestValidator.express(schema);
  }

  /**
   * Enable/disable validation
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if validation is enabled
   */
  isValidationEnabled(): boolean {
    return this.isEnabled;
  }

  private registerCommonSchemas(): void {
    // User registration schema
    this.registerSchema('/api/auth/register', {
      email: { type: 'email', required: true, max: 255 },
      password: { type: 'string', required: true, min: 8, max: 128 },
      username: { 
        type: 'alphanumeric', 
        required: true, 
        min: 3, 
        max: 30,
        pattern: /^[a-zA-Z0-9_-]+$/
      },
      firstName: { type: 'string', max: 50, sanitizer: (v) => v?.trim() },
      lastName: { type: 'string', max: 50, sanitizer: (v) => v?.trim() }
    });

    // User login schema
    this.registerSchema('/api/auth/login', {
      email: { type: 'email', required: true },
      password: { type: 'string', required: true },
      rememberMe: { type: 'boolean' }
    });

    // Game bet schema
    this.registerSchema('/api/games/*/bet', {
      amount: { 
        type: 'number', 
        required: true, 
        min: 0.01, 
        max: 10000,
        custom: (val) => val > 0 || 'Bet amount must be positive'
      },
      gameSettings: { type: 'object' }
    });

    // Wallet transaction schema
    this.registerSchema('/api/wallet/deposit', {
      amount: { type: 'number', required: true, min: 10, max: 50000 },
      method: { 
        type: 'string', 
        required: true,
        custom: (val) => ['card', 'crypto', 'bank'].includes(val) || 'Invalid payment method'
      },
      currency: { type: 'string', pattern: /^[A-Z]{3}$/ }
    });

    // Profile update schema
    this.registerSchema('/api/user/profile', {
      firstName: { type: 'string', max: 50 },
      lastName: { type: 'string', max: 50 },
      dateOfBirth: { type: 'date' },
      phoneNumber: { type: 'phoneNumber' },
      address: {
        type: 'object',
        custom: (obj) => {
          if (!obj) return true;
          return typeof obj === 'object' && 
                 typeof obj.street === 'string' && 
                 typeof obj.city === 'string';
        }
      }
    });
  }
}

// Export convenience functions
export const inputValidator = InputValidationManager.getInstance();

export const initializeInputValidation = () => inputValidator.initialize();

export const validateData = (data: Record<string, any>, schema: ValidationSchema) =>
  inputValidator.validate(data, schema);

export const createValidationMiddleware = (schema?: ValidationSchema) =>
  inputValidator.createMiddleware(schema);

export const registerValidationSchema = (route: string, schema: ValidationSchema) =>
  inputValidator.registerSchema(route, schema);

// Common validation rules
export const commonRules = {
  email: { type: 'email' as ValidationType, required: true, max: 255 },
  password: { type: 'string' as ValidationType, required: true, min: 8, max: 128 },
  username: { type: 'alphanumeric' as ValidationType, required: true, min: 3, max: 30 },
  amount: { type: 'number' as ValidationType, required: true, min: 0.01 },
  uuid: { type: 'uuid' as ValidationType, required: true },
  id: { type: 'integer' as ValidationType, required: true, min: 1 }
};

// Default export
export default InputValidationManager;