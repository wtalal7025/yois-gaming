/**
 * Storage Service for Supabase Storage
 * Handles file uploads, downloads, and management for game assets and user content
 */

import { supabaseService } from '../../database/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { extname, basename } from 'path'

/**
 * Supported file types and configurations
 */
export interface FileUploadConfig {
  maxSize: number // in bytes
  allowedTypes: string[]
  bucket: string
}

/**
 * File upload result
 */
export interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
  publicUrl?: string
}

/**
 * File validation result
 */
export interface ValidationResult {
  valid: boolean
  error?: string
  size?: number
  type?: string
}

/**
 * Storage service class for managing files in Supabase Storage
 */
export class StorageService {
  private client: SupabaseClient
  
  // Reason: Configuration for different file types
  private static readonly FILE_CONFIGS: Record<string, FileUploadConfig> = {
    gameAssets: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['.jpg', '.jpeg', '.png', '.webp'],
      bucket: 'game-assets'
    },
    avatars: {
      maxSize: 2 * 1024 * 1024, // 2MB  
      allowedTypes: ['.jpg', '.jpeg', '.png', '.webp'],
      bucket: 'user-avatars'
    }
  }

  constructor(client?: SupabaseClient) {
    this.client = client || supabaseService
  }

  /**
   * Initialize storage buckets if they don't exist
   */
  async initializeBuckets(): Promise<void> {
    try {
      // Reason: Create buckets for game assets and user avatars
      const buckets = ['game-assets', 'user-avatars']
      
      for (const bucketName of buckets) {
        const { data: bucket } = await this.client.storage.getBucket(bucketName)
        
        if (!bucket) {
          const { error } = await this.client.storage.createBucket(bucketName, {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
            fileSizeLimit: bucketName === 'game-assets' ? 5242880 : 2097152 // 5MB or 2MB
          })
          
          if (error) {
            console.error(`Failed to create bucket ${bucketName}:`, error)
          } else {
            console.log(`✅ Created storage bucket: ${bucketName}`)
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize storage buckets:', error)
    }
  }

  /**
   * Upload file from local filesystem to Supabase Storage
   */
  async uploadLocalFile(
    localPath: string,
    storagePath: string,
    fileType: 'gameAssets' | 'avatars' = 'gameAssets'
  ): Promise<UploadResult> {
    try {
      const config = StorageService.FILE_CONFIGS[fileType]
      if (!config) {
        return { success: false, error: `Invalid file type: ${fileType}` }
      }
      
      // Reason: Validate file before upload
      const validation = await this.validateLocalFile(localPath, config)
      if (!validation.valid) {
        return { success: false, error: validation.error || 'Validation failed' }
      }

      // Reason: Read file as buffer for upload
      const fileBuffer = await this.readFileAsBuffer(localPath)
      const fileName = basename(localPath)
      const fileExt = extname(fileName)
      
      // Reason: Upload to Supabase Storage
      const { data, error } = await this.client.storage
        .from(config.bucket)
        .upload(storagePath, fileBuffer, {
          contentType: this.getMimeType(fileExt),
          upsert: true // Reason: Allow overwriting existing files
        })

      if (error) {
        return { success: false, error: error.message }
      }

      // Reason: Get public URL for the uploaded file
      const { data: { publicUrl } } = this.client.storage
        .from(config.bucket)
        .getPublicUrl(data.path)

      return {
        success: true,
        path: data.path,
        url: publicUrl,
        publicUrl
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Upload file buffer to Supabase Storage
   */
  async uploadBuffer(
    buffer: Buffer,
    storagePath: string,
    fileType: 'gameAssets' | 'avatars' = 'avatars',
    contentType?: string
  ): Promise<UploadResult> {
    try {
      const config = StorageService.FILE_CONFIGS[fileType]
      if (!config) {
        return { success: false, error: `Invalid file type: ${fileType}` }
      }
      
      // Reason: Validate buffer size
      if (buffer.length > config.maxSize) {
        return {
          success: false,
          error: `File size ${buffer.length} exceeds maximum ${config.maxSize} bytes`
        }
      }

      // Reason: Upload buffer to Supabase Storage
      const { data, error } = await this.client.storage
        .from(config.bucket)
        .upload(storagePath, buffer, {
          contentType: contentType || 'application/octet-stream',
          upsert: true
        })

      if (error) {
        return { success: false, error: error.message }
      }

      // Reason: Get public URL for uploaded file
      const { data: { publicUrl } } = this.client.storage
        .from(config.bucket)
        .getPublicUrl(data.path)

      return {
        success: true,
        path: data.path,
        url: publicUrl,
        publicUrl
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get public URL for a file in storage
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.client.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  /**
   * Delete file from storage
   */
  async deleteFile(bucket: string, path: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.client.storage.from(bucket).remove([path])
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * List files in a bucket/folder
   */
  async listFiles(bucket: string, folder?: string): Promise<any[]> {
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .list(folder, {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' }
        })

      if (error) {
        throw new Error(error.message)
      }

      return data || []
    } catch (error) {
      console.error('Failed to list files:', error)
      return []
    }
  }

  /**
   * Validate local file before upload
   */
  private async validateLocalFile(filePath: string, config: FileUploadConfig): Promise<ValidationResult> {
    try {
      const stats = await stat(filePath)
      const fileExt = extname(filePath).toLowerCase()
      
      // Reason: Check file size
      if (stats.size > config.maxSize) {
        return {
          valid: false,
          error: `File size ${stats.size} exceeds maximum ${config.maxSize} bytes`
        }
      }
      
      // Reason: Check file type
      if (!config.allowedTypes.includes(fileExt)) {
        return {
          valid: false,
          error: `File type ${fileExt} not allowed. Allowed types: ${config.allowedTypes.join(', ')}`
        }
      }
      
      return {
        valid: true,
        size: stats.size,
        type: fileExt
      }
    } catch (error) {
      return {
        valid: false,
        error: `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Read local file as buffer
   */
  private async readFileAsBuffer(filePath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const stream = createReadStream(filePath)
      
      stream.on('data', (chunk) => {
        // Reason: Handle both string and Buffer chunks
        const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
        chunks.push(buffer)
      })
      stream.on('end', () => resolve(Buffer.concat(chunks)))
      stream.on('error', reject)
    })
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    }
    
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream'
  }

  /**
   * Generate storage path for game assets
   */
  static generateGameAssetPath(fileName: string): string {
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '-').toLowerCase()
    return `games/${sanitizedName}`
  }

  /**
   * Generate storage path for user avatars
   */
  static generateAvatarPath(userId: string, fileName: string): string {
    const timestamp = Date.now()
    const fileExt = extname(fileName)
    return `users/${userId}/avatar-${timestamp}${fileExt}`
  }
}

// Reason: Export singleton instance for use across the application
export const storageService = new StorageService()