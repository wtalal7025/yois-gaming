// Backup configuration interface
export interface BackupConfig {
  enabled: boolean;
  schedule: {
    database: string; // Cron expression
    files: string; // Cron expression
    logs: string; // Cron expression
  };
  retention: {
    daily: number; // Days to keep daily backups
    weekly: number; // Weeks to keep weekly backups
    monthly: number; // Months to keep monthly backups
  };
  storage: {
    provider: 'supabase' | 'aws' | 'gcp' | 'local';
    bucket: string;
    path: string;
    encryption: boolean;
  };
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'brotli' | 'lz4';
    level: number;
  };
  verification: {
    enabled: boolean;
    checksum: 'md5' | 'sha256' | 'sha512';
    testRestore: boolean;
  };
  notifications: {
    enabled: boolean;
    onSuccess: boolean;
    onFailure: boolean;
    channels: Array<'email' | 'slack' | 'discord' | 'webhook'>;
  };
}

// Production backup configuration
export const productionBackupConfig: BackupConfig = {
  enabled: true,
  schedule: {
    database: '0 2 * * *', // Daily at 2 AM UTC
    files: '0 3 * * 0', // Weekly on Sunday at 3 AM UTC
    logs: '0 4 * * 0', // Weekly on Sunday at 4 AM UTC
  },
  retention: {
    daily: 7, // Keep 7 daily backups
    weekly: 4, // Keep 4 weekly backups
    monthly: 12, // Keep 12 monthly backups
  },
  storage: {
    provider: 'supabase',
    bucket: process.env.BACKUP_BUCKET || 'stake-games-backups',
    path: 'production',
    encryption: true,
  },
  compression: {
    enabled: true,
    algorithm: 'gzip',
    level: 6, // Balanced compression
  },
  verification: {
    enabled: true,
    checksum: 'sha256',
    testRestore: false, // Disabled to avoid resource usage
  },
  notifications: {
    enabled: true,
    onSuccess: false, // Only notify on failures in production
    onFailure: true,
    channels: ['email', 'slack'],
  },
};

// Development backup configuration
export const developmentBackupConfig: BackupConfig = {
  enabled: false, // Disabled by default in development
  schedule: {
    database: '0 12 * * *', // Daily at noon for testing
    files: '0 13 * * 0', // Weekly test
    logs: '0 14 * * 0', // Weekly test
  },
  retention: {
    daily: 3,
    weekly: 2,
    monthly: 1,
  },
  storage: {
    provider: 'local',
    bucket: 'dev-backups',
    path: 'development',
    encryption: false,
  },
  compression: {
    enabled: true,
    algorithm: 'gzip',
    level: 1, // Fast compression for development
  },
  verification: {
    enabled: true,
    checksum: 'md5',
    testRestore: true, // Test restore in development
  },
  notifications: {
    enabled: false,
    onSuccess: false,
    onFailure: false,
    channels: [],
  },
};

// Get backup configuration based on environment
export function getBackupConfig(): BackupConfig {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' ? productionBackupConfig : developmentBackupConfig;
}

// Backup metadata interface
export interface BackupMetadata {
  id: string;
  type: 'database' | 'files' | 'logs' | 'full';
  timestamp: Date;
  size: number; // Size in bytes
  checksum: string;
  compressed: boolean;
  encrypted: boolean;
  retention: 'daily' | 'weekly' | 'monthly';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
  duration?: number; // Duration in milliseconds
  filePath: string;
}

// Backup service class
export class BackupService {
  private config: BackupConfig;
  private backupHistory: BackupMetadata[] = [];
  
  constructor(config?: BackupConfig) {
    this.config = config || getBackupConfig();
  }
  
  // Create database backup
  async createDatabaseBackup(): Promise<BackupMetadata> {
    const backup: BackupMetadata = {
      id: this.generateBackupId('db'),
      type: 'database',
      timestamp: new Date(),
      size: 0,
      checksum: '',
      compressed: this.config.compression.enabled,
      encrypted: this.config.storage.encryption,
      retention: this.determineRetentionType(),
      status: 'pending',
      filePath: '',
    };
    
    try {
      backup.status = 'in_progress';
      const startTime = Date.now();
      
      // Create database dump (this would be replaced with actual database backup logic)
      const dumpCommand = this.generateDatabaseDumpCommand();
      const filePath = await this.executeDatabaseDump(dumpCommand, backup);
      
      backup.filePath = filePath;
      backup.size = await this.getFileSize(filePath);
      backup.checksum = await this.calculateChecksum(filePath);
      backup.duration = Date.now() - startTime;
      backup.status = 'completed';
      
      // Upload to storage if not local
      if (this.config.storage.provider !== 'local') {
        await this.uploadToStorage(filePath, backup);
      }
      
      this.backupHistory.push(backup);
      
      // Clean up old backups
      await this.cleanupOldBackups('database');
      
      // Send notification if configured
      if (this.config.notifications.enabled && this.config.notifications.onSuccess) {
        await this.sendNotification('success', backup);
      }
      
      return backup;
    } catch (error) {
      backup.status = 'failed';
      backup.error = error instanceof Error ? error.message : 'Unknown error';
      backup.duration = Date.now() - (backup.timestamp?.getTime() || 0);
      
      this.backupHistory.push(backup);
      
      // Send failure notification
      if (this.config.notifications.enabled && this.config.notifications.onFailure) {
        await this.sendNotification('failure', backup);
      }
      
      throw error;
    }
  }
  
  // Create file system backup
  async createFileBackup(paths: string[]): Promise<BackupMetadata> {
    const backup: BackupMetadata = {
      id: this.generateBackupId('files'),
      type: 'files',
      timestamp: new Date(),
      size: 0,
      checksum: '',
      compressed: this.config.compression.enabled,
      encrypted: this.config.storage.encryption,
      retention: this.determineRetentionType(),
      status: 'pending',
      filePath: '',
    };
    
    try {
      backup.status = 'in_progress';
      const startTime = Date.now();
      
      // Create archive of specified paths
      const archivePath = await this.createArchive(paths, backup);
      
      backup.filePath = archivePath;
      backup.size = await this.getFileSize(archivePath);
      backup.checksum = await this.calculateChecksum(archivePath);
      backup.duration = Date.now() - startTime;
      backup.status = 'completed';
      
      // Upload to storage if not local
      if (this.config.storage.provider !== 'local') {
        await this.uploadToStorage(archivePath, backup);
      }
      
      this.backupHistory.push(backup);
      await this.cleanupOldBackups('files');
      
      if (this.config.notifications.enabled && this.config.notifications.onSuccess) {
        await this.sendNotification('success', backup);
      }
      
      return backup;
    } catch (error) {
      backup.status = 'failed';
      backup.error = error instanceof Error ? error.message : 'Unknown error';
      this.backupHistory.push(backup);
      
      if (this.config.notifications.enabled && this.config.notifications.onFailure) {
        await this.sendNotification('failure', backup);
      }
      
      throw error;
    }
  }
  
  // Restore from backup
  async restoreFromBackup(backupId: string, targetPath?: string): Promise<void> {
    const backup = this.backupHistory.find(b => b.id === backupId);
    if (!backup) {
      throw new Error(`Backup with ID ${backupId} not found`);
    }
    
    if (backup.status !== 'completed') {
      throw new Error(`Cannot restore from incomplete backup: ${backup.status}`);
    }
    
    try {
      // Download from storage if needed
      let localPath = backup.filePath;
      if (this.config.storage.provider !== 'local') {
        localPath = await this.downloadFromStorage(backup);
      }
      
      // Verify checksum
      if (this.config.verification.enabled) {
        const currentChecksum = await this.calculateChecksum(localPath);
        if (currentChecksum !== backup.checksum) {
          throw new Error('Backup verification failed: checksum mismatch');
        }
      }
      
      // Perform restoration based on backup type
      if (backup.type === 'database') {
        await this.restoreDatabase(localPath);
      } else if (backup.type === 'files') {
        await this.restoreFiles(localPath, targetPath);
      }
      
    } catch (error) {
      if (this.config.notifications.enabled) {
        await this.sendNotification('restore_failure', backup, error);
      }
      throw error;
    }
  }
  
  // Get backup history
  getBackupHistory(type?: 'database' | 'files' | 'logs'): BackupMetadata[] {
    if (type) {
      return this.backupHistory.filter(b => b.type === type);
    }
    return [...this.backupHistory];
  }
  
  // Validate backup integrity
  async validateBackup(backupId: string): Promise<boolean> {
    const backup = this.backupHistory.find(b => b.id === backupId);
    if (!backup) {
      return false;
    }
    
    try {
      // Download if remote
      let localPath = backup.filePath;
      if (this.config.storage.provider !== 'local') {
        localPath = await this.downloadFromStorage(backup);
      }
      
      // Check file existence
      const fs = require('fs').promises;
      await fs.access(localPath);
      
      // Verify checksum
      const currentChecksum = await this.calculateChecksum(localPath);
      if (currentChecksum !== backup.checksum) {
        return false;
      }
      
      // Test restore if configured
      if (this.config.verification.testRestore && backup.type === 'database') {
        await this.testDatabaseRestore(localPath);
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // Private helper methods
  private generateBackupId(type: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `${type}-${timestamp}-${random}`;
  }
  
  private determineRetentionType(): 'daily' | 'weekly' | 'monthly' {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const dayOfMonth = now.getDate();
    
    // Monthly backup on the 1st of each month
    if (dayOfMonth === 1) return 'monthly';
    
    // Weekly backup on Sunday
    if (dayOfWeek === 0) return 'weekly';
    
    // Daily backup otherwise
    return 'daily';
  }
  
  private generateDatabaseDumpCommand(): string {
    const dbUrl = process.env.DATABASE_URL || '';
    // This would be customized based on database type (PostgreSQL, MySQL, etc.)
    return `pg_dump ${dbUrl} --format=custom --no-owner --no-privileges`;
  }
  
  private async executeDatabaseDump(command: string, backup: BackupMetadata): Promise<string> {
    const path = require('path');
    const fs = require('fs').promises;
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const filename = `${backup.id}.dump`;
    const filePath = path.join('/tmp', filename);
    
    // Execute dump command
    await execAsync(`${command} > ${filePath}`);
    
    // Compress if enabled
    if (this.config.compression.enabled) {
      const compressedPath = `${filePath}.gz`;
      await execAsync(`gzip -${this.config.compression.level} ${filePath}`);
      return compressedPath;
    }
    
    return filePath;
  }
  
  private async createArchive(paths: string[], backup: BackupMetadata): Promise<string> {
    const path = require('path');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const filename = `${backup.id}.tar${this.config.compression.enabled ? '.gz' : ''}`;
    const archivePath = path.join('/tmp', filename);
    
    const compressionFlag = this.config.compression.enabled ? 'z' : '';
    const command = `tar -c${compressionFlag}f ${archivePath} ${paths.join(' ')}`;
    
    await execAsync(command);
    return archivePath;
  }
  
  private async getFileSize(filePath: string): Promise<number> {
    const fs = require('fs').promises;
    const stats = await fs.stat(filePath);
    return stats.size;
  }
  
  private async calculateChecksum(filePath: string): Promise<string> {
    const crypto = require('crypto');
    const fs = require('fs');
    const hash = crypto.createHash(this.config.verification.checksum);
    const stream = fs.createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (data: Buffer) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
  
  private async uploadToStorage(filePath: string, backup: BackupMetadata): Promise<void> {
    // This would be implemented based on the storage provider
    // For now, we'll simulate the upload
    console.log(`Uploading ${backup.id} to ${this.config.storage.provider}`);
  }
  
  private async downloadFromStorage(backup: BackupMetadata): Promise<string> {
    // This would be implemented based on the storage provider
    // For now, we'll return the original path
    return backup.filePath;
  }
  
  private async restoreDatabase(backupPath: string): Promise<void> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const dbUrl = process.env.DATABASE_URL || '';
    const command = `pg_restore --clean --if-exists --no-owner --no-privileges -d ${dbUrl} ${backupPath}`;
    
    await execAsync(command);
  }
  
  private async restoreFiles(archivePath: string, targetPath: string = '/'): Promise<void> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const compressionFlag = this.config.compression.enabled ? 'z' : '';
    const command = `tar -x${compressionFlag}f ${archivePath} -C ${targetPath}`;
    
    await execAsync(command);
  }
  
  private async testDatabaseRestore(backupPath: string): Promise<void> {
    // This would create a temporary database and test the restore
    // For now, we'll just check if the file is readable
    const fs = require('fs').promises;
    await fs.access(backupPath);
  }
  
  private async cleanupOldBackups(type: 'database' | 'files' | 'logs'): Promise<void> {
    const backups = this.getBackupHistory(type);
    const now = new Date();
    
    for (const backup of backups) {
      const age = now.getTime() - backup.timestamp.getTime();
      const daysDiff = Math.floor(age / (1000 * 60 * 60 * 24));
      
      let shouldDelete = false;
      
      if (backup.retention === 'daily' && daysDiff > this.config.retention.daily) {
        shouldDelete = true;
      } else if (backup.retention === 'weekly' && daysDiff > this.config.retention.weekly * 7) {
        shouldDelete = true;
      } else if (backup.retention === 'monthly' && daysDiff > this.config.retention.monthly * 30) {
        shouldDelete = true;
      }
      
      if (shouldDelete) {
        await this.deleteBackup(backup);
      }
    }
  }
  
  private async deleteBackup(backup: BackupMetadata): Promise<void> {
    try {
      // Delete from storage
      if (this.config.storage.provider !== 'local') {
        await this.deleteFromStorage(backup);
      } else {
        const fs = require('fs').promises;
        await fs.unlink(backup.filePath);
      }
      
      // Remove from history
      const index = this.backupHistory.indexOf(backup);
      if (index > -1) {
        this.backupHistory.splice(index, 1);
      }
    } catch (error) {
      console.error(`Failed to delete backup ${backup.id}:`, error);
    }
  }
  
  private async deleteFromStorage(backup: BackupMetadata): Promise<void> {
    // This would be implemented based on the storage provider
    console.log(`Deleting ${backup.id} from ${this.config.storage.provider}`);
  }
  
  private async sendNotification(type: 'success' | 'failure' | 'restore_failure', backup: BackupMetadata, error?: any): Promise<void> {
    const message = this.formatNotificationMessage(type, backup, error);
    
    for (const channel of this.config.notifications.channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailNotification(message, type === 'success');
            break;
          case 'slack':
            await this.sendSlackNotification(message, type === 'success');
            break;
          case 'discord':
            await this.sendDiscordNotification(message, type === 'success');
            break;
          case 'webhook':
            await this.sendWebhookNotification(message, type === 'success');
            break;
        }
      } catch (notificationError) {
        console.error(`Failed to send ${channel} notification:`, notificationError);
      }
    }
  }
  
  private formatNotificationMessage(type: 'success' | 'failure' | 'restore_failure', backup: BackupMetadata, error?: any): string {
    const timestamp = backup.timestamp.toISOString();
    const size = (backup.size / (1024 * 1024)).toFixed(2); // Convert to MB
    
    switch (type) {
      case 'success':
        return `✅ Backup completed successfully
Type: ${backup.type}
ID: ${backup.id}
Size: ${size} MB
Duration: ${backup.duration}ms
Timestamp: ${timestamp}`;
        
      case 'failure':
        return `❌ Backup failed
Type: ${backup.type}
ID: ${backup.id}
Error: ${backup.error}
Timestamp: ${timestamp}`;
        
      case 'restore_failure':
        return `❌ Restore failed
Backup ID: ${backup.id}
Error: ${error instanceof Error ? error.message : 'Unknown error'}
Timestamp: ${new Date().toISOString()}`;
        
      default:
        return 'Backup notification';
    }
  }
  
  private async sendEmailNotification(message: string, isSuccess: boolean): Promise<void> {
    // This would integrate with your email service (Resend, SendGrid, etc.)
    console.log('Email notification:', message);
  }
  
  private async sendSlackNotification(message: string, isSuccess: boolean): Promise<void> {
    // This would integrate with Slack webhook
    console.log('Slack notification:', message);
  }
  
  private async sendDiscordNotification(message: string, isSuccess: boolean): Promise<void> {
    // This would integrate with Discord webhook
    console.log('Discord notification:', message);
  }
  
  private async sendWebhookNotification(message: string, isSuccess: boolean): Promise<void> {
    // This would send to a custom webhook endpoint
    console.log('Webhook notification:', message);
  }
}

// Global backup service instance
export const backupService = new BackupService();

// Backup scheduler functions
export function scheduleBackups(config?: BackupConfig): void {
  const backupConfig = config || getBackupConfig();
  
  if (!backupConfig.enabled) {
    console.log('Backups are disabled');
    return;
  }
  
  const cron = require('node-cron');
  
  // Schedule database backups
  cron.schedule(backupConfig.schedule.database, async () => {
    try {
      console.log('Starting scheduled database backup...');
      await backupService.createDatabaseBackup();
      console.log('Scheduled database backup completed');
    } catch (error) {
      console.error('Scheduled database backup failed:', error);
    }
  }, {
    timezone: 'UTC',
    scheduled: true,
  });
  
  // Schedule file backups
  cron.schedule(backupConfig.schedule.files, async () => {
    try {
      console.log('Starting scheduled file backup...');
      const paths = ['/app/uploads', '/app/assets', '/app/config'];
      await backupService.createFileBackup(paths);
      console.log('Scheduled file backup completed');
    } catch (error) {
      console.error('Scheduled file backup failed:', error);
    }
  }, {
    timezone: 'UTC',
    scheduled: true,
  });
  
  console.log('Backup schedules configured');
}

// Emergency backup function
export async function createEmergencyBackup(): Promise<{ database: BackupMetadata; files: BackupMetadata }> {
  console.log('Creating emergency backup...');
  
  const [database, files] = await Promise.all([
    backupService.createDatabaseBackup(),
    backupService.createFileBackup(['/app/uploads', '/app/assets', '/app/config', '/app/logs']),
  ]);
  
  console.log('Emergency backup completed');
  return { database, files };
}