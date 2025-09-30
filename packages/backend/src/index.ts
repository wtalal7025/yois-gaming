/**
 * Backend package main entry point
 * Exports all backend modules for use by other packages
 */

// Re-export all modules
export * from './routes';
export * from './services';
export * from './middleware';
export * from './database';
export * from './socket';
export * from './utils';
export * from './types';