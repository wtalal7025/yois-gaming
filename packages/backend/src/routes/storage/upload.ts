/**
 * Storage Upload Routes
 * Handles file uploads to Supabase Storage
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { StorageService } from '../../services/storage/StorageService'
import { z } from 'zod'

// Validation schemas
const UploadAvatarSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().positive()
})

/**
 * Context for storage routes
 */
interface StorageContext {
  storageService: StorageService
}

/**
 * Upload avatar endpoint
 */
export async function uploadRoutes(fastify: FastifyInstance, context: StorageContext): Promise<void> {
  const { storageService } = context

  /**
   * Upload user avatar
   * POST /storage/avatar
   */
  fastify.post('/avatar', {
    schema: {
      description: 'Upload user avatar image',
      tags: ['Storage'],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            url: { type: 'string' },
            message: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: Add authentication middleware to get user ID
      // For now, using placeholder user ID
      const userId = 'placeholder-user-id'

      // Handle multipart form data
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: 'No file provided'
        })
      }

      // Validate file
      const buffer = await data.toBuffer()
      const fileName = data.filename || 'avatar.jpg'
      
      // Generate storage path
      const storagePath = StorageService.generateAvatarPath(userId, fileName)
      
      // Upload to Supabase Storage
      const result = await storageService.uploadBuffer(
        buffer,
        storagePath,
        'avatars',
        data.mimetype
      )

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error || 'Upload failed'
        })
      }

      return reply.send({
        success: true,
        url: result.publicUrl,
        message: 'Avatar uploaded successfully'
      })
    } catch (error) {
      console.error('Avatar upload error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Upload game asset (admin only)
   * POST /storage/game-asset
   */
  fastify.post('/game-asset', {
    schema: {
      description: 'Upload game asset (thumbnails, etc.)',
      tags: ['Storage', 'Admin'],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            url: { type: 'string' },
            path: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: Add admin authentication middleware
      
      // Handle multipart form data
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: 'No file provided'
        })
      }

      const buffer = await data.toBuffer()
      const fileName = data.filename || 'game-asset.jpg'
      
      // Generate storage path
      const storagePath = StorageService.generateGameAssetPath(fileName)
      
      // Upload to Supabase Storage
      const result = await storageService.uploadBuffer(
        buffer,
        storagePath,
        'gameAssets',
        data.mimetype
      )

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error || 'Upload failed'
        })
      }

      return reply.send({
        success: true,
        url: result.publicUrl,
        path: result.path,
        message: 'Game asset uploaded successfully'
      })
    } catch (error) {
      console.error('Game asset upload error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Get file public URL
   * GET /storage/url/:bucket/:path
   */
  fastify.get('/url/:bucket/*', {
    schema: {
      description: 'Get public URL for a file',
      tags: ['Storage'],
      params: {
        type: 'object',
        properties: {
          bucket: { type: 'string' },
          '*': { type: 'string' }
        },
        required: ['bucket']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            url: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { bucket: string, '*': string } }>, reply: FastifyReply) => {
    try {
      const { bucket } = request.params
      const filePath = request.params['*']
      
      if (!bucket || !filePath) {
        return reply.status(400).send({
          success: false,
          error: 'Missing bucket or file path'
        })
      }

      const url = storageService.getPublicUrl(bucket, filePath)
      
      return reply.send({
        success: true,
        url
      })
    } catch (error) {
      console.error('Get URL error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  /**
   * Delete file (authenticated users only)
   * DELETE /storage/:bucket/*
   */
  fastify.delete('/:bucket/*', {
    schema: {
      description: 'Delete a file from storage',
      tags: ['Storage'],
      params: {
        type: 'object',
        properties: {
          bucket: { type: 'string' },
          '*': { type: 'string' }
        },
        required: ['bucket']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { bucket: string, '*': string } }>, reply: FastifyReply) => {
    try {
      // TODO: Add authentication and authorization middleware
      
      const { bucket } = request.params
      const filePath = request.params['*']
      
      if (!bucket || !filePath) {
        return reply.status(400).send({
          success: false,
          error: 'Missing bucket or file path'
        })
      }

      const result = await storageService.deleteFile(bucket, filePath)
      
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: result.error || 'Delete failed'
        })
      }

      return reply.send({
        success: true,
        message: 'File deleted successfully'
      })
    } catch (error) {
      console.error('Delete file error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })
}