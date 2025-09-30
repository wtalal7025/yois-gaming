/**
 * Supabase Storage Initialization Script
 * Creates storage buckets and uploads initial game assets
 */

import { config } from 'dotenv'
import { join } from 'path'

// Reason: Load environment variables FIRST before any other imports from root .env
const envPath = join(process.cwd(), '.env')
console.log('🔍 Debug - Environment file path:', envPath)

try {
  const result = config({ path: envPath })
  console.log('🔍 Debug - Dotenv result:', result.error ? result.error : 'Success')
} catch (error) {
  console.log('🔍 Debug - Dotenv error:', error)
}

// Debug: Check if environment variables are loaded
console.log('🔍 Environment Variables Check (After dotenv):')
console.log('- Process CWD:', process.cwd())
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing')
console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing')
console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing')

// Debug: Show first few chars of env vars if they exist
if (process.env.SUPABASE_URL) {
  console.log('- SUPABASE_URL preview:', process.env.SUPABASE_URL.substring(0, 20) + '...')
}

import { readdir } from 'fs/promises'
import { StorageService } from '../services/storage/StorageService'

// Create storage service instance after environment variables are loaded
const storageService = new StorageService()

/**
 * Initialize Supabase Storage buckets and upload game thumbnails
 */
export async function initializeStorage(): Promise<void> {
  try {
    console.log('🔄 Initializing Supabase Storage...')
    
    // Step 1: Initialize storage buckets
    await storageService.initializeBuckets()
    
    // Step 2: Upload existing game thumbnails
    await uploadGameThumbnails()
    
    console.log('✅ Supabase Storage initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize Supabase Storage:', error)
    throw error
  }
}

/**
 * Upload existing game thumbnails to Supabase Storage
 */
async function uploadGameThumbnails(): Promise<void> {
  try {
    // Path to local game thumbnails
    const thumbnailsPath = join(process.cwd(), '../../apps/web/public/images/games')
    
    console.log('🔄 Uploading game thumbnails...')
    console.log('📁 Looking for thumbnails in:', thumbnailsPath)
    
    try {
      const files = await readdir(thumbnailsPath)
      console.log('📋 Found files:', files)
      
      const thumbnailFiles = files.filter(file => 
        file.endsWith('-thumbnail.jpg') || file.endsWith('-thumbnail.jpeg') || file.endsWith('-thumbnail.png')
      )
      
      if (thumbnailFiles.length === 0) {
        console.log('⚠️ No game thumbnail files found')
        return
      }
      
      console.log('🖼️ Found thumbnail files:', thumbnailFiles)
      
      // Upload each thumbnail
      for (const fileName of thumbnailFiles) {
        const localPath = join(thumbnailsPath, fileName)
        const storagePath = StorageService.generateGameAssetPath(fileName)
        
        console.log(`📤 Uploading ${fileName}...`)
        
        const result = await storageService.uploadLocalFile(
          localPath,
          storagePath,
          'gameAssets'
        )
        
        if (result.success) {
          console.log(`✅ Uploaded ${fileName} -> ${result.publicUrl}`)
        } else {
          console.error(`❌ Failed to upload ${fileName}:`, result.error)
        }
      }
      
      console.log('✅ Game thumbnails upload completed')
    } catch (readError) {
      console.warn('⚠️ Could not read thumbnails directory:', readError instanceof Error ? readError.message : String(readError))
      console.log('ℹ️ This is normal if running from a different location or if thumbnails are not present')
    }
  } catch (error) {
    console.error('❌ Error uploading game thumbnails:', error)
  }
}

/**
 * Run storage initialization if called directly
 */
if (require.main === module) {
  initializeStorage()
    .then(() => {
      console.log('✅ Storage initialization completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Storage initialization failed:', error)
      process.exit(1)
    })
}