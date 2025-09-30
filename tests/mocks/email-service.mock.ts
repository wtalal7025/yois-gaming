/**
 * Email Service Mock for Testing
 * Provides mock implementations of email functionality
 */

export interface EmailMessage {
  id: string;
  to: string;
  from: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: EmailAttachment[];
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate?: string;
}

/**
 * Mock email service for testing
 * Simulates email sending without actually sending emails
 */
export class MockEmailService {
  private sentEmails: EmailMessage[] = [];
  private templates: Map<string, EmailTemplate> = new Map();
  private shouldFailNext: boolean = false;
  private failureReason: string = 'Email sending failed';

  constructor() {
    this.loadDefaultTemplates();
  }

  /**
   * Configure mock to fail next operation (for error testing)
   */
  setNextOperationFailure(reason: string = 'Mock email failure'): void {
    this.shouldFailNext = true;
    this.failureReason = reason;
  }

  /**
   * Reset mock to normal operation
   */
  resetToNormalOperation(): void {
    this.shouldFailNext = false;
    this.failureReason = 'Email sending failed';
  }

  /**
   * Send email
   */
  async sendEmail(email: Omit<EmailMessage, 'id' | 'sentAt' | 'status'>): Promise<EmailMessage> {
    const emailId = `mock-email-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    const emailMessage: EmailMessage = {
      id: emailId,
      ...email,
      sentAt: new Date(),
      status: this.shouldFailNext ? 'failed' : 'sent'
    };

    // Simulate sending time
    await new Promise(resolve => setTimeout(resolve, 50));

    this.sentEmails.push(emailMessage);

    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      emailMessage.status = 'failed';
      throw new Error(this.failureReason);
    }

    return emailMessage;
  }

  /**
   * Send email using template
   */
  async sendTemplatedEmail(
    templateName: string, 
    to: string, 
    variables: Record<string, string>,
    from: string = 'noreply@stakegames.com'
  ): Promise<EmailMessage> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Replace template variables
    let htmlBody = template.htmlTemplate;
    let subject = template.subject;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      htmlBody = htmlBody.replace(new RegExp(placeholder, 'g'), value);
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
    }

    return this.sendEmail({
      to,
      from,
      subject,
      htmlBody,
      textBody: template.textTemplate?.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '')
    });
  }

  /**
   * Get all sent emails (for testing verification)
   */
  getSentEmails(): EmailMessage[] {
    return [...this.sentEmails];
  }

  /**
   * Get emails sent to specific address
   */
  getEmailsTo(emailAddress: string): EmailMessage[] {
    return this.sentEmails.filter(email => email.to === emailAddress);
  }

  /**
   * Get emails with specific subject
   */
  getEmailsWithSubject(subject: string): EmailMessage[] {
    return this.sentEmails.filter(email => email.subject.includes(subject));
  }

  /**
   * Clear all sent emails
   */
  clearSentEmails(): void {
    this.sentEmails = [];
  }

  /**
   * Add email template
   */
  addTemplate(template: EmailTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Get template by name
   */
  getTemplate(name: string): EmailTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Load default email templates for testing
   */
  private loadDefaultTemplates(): void {
    const templates: EmailTemplate[] = [
      {
        id: 'welcome',
        name: 'welcome',
        subject: 'Welcome to {{siteName}}!',
        htmlTemplate: `
          <h1>Welcome {{username}}!</h1>
          <p>Thanks for joining {{siteName}}. Your account is now ready to use.</p>
          <p><a href="{{loginUrl}}">Click here to login</a></p>
        `,
        textTemplate: 'Welcome {{username}}! Thanks for joining {{siteName}}. Login at: {{loginUrl}}'
      },
      {
        id: 'password-reset',
        name: 'password-reset',
        subject: 'Reset Your Password',
        htmlTemplate: `
          <h1>Password Reset Request</h1>
          <p>Hi {{username}},</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="{{resetUrl}}">Reset Password</a></p>
          <p>This link expires in 1 hour.</p>
        `,
        textTemplate: 'Hi {{username}}, reset your password: {{resetUrl}} (expires in 1 hour)'
      },
      {
        id: 'email-verification',
        name: 'email-verification',
        subject: 'Verify Your Email Address',
        htmlTemplate: `
          <h1>Verify Your Email</h1>
          <p>Hi {{username}},</p>
          <p>Please verify your email address by clicking the link below:</p>
          <p><a href="{{verificationUrl}}">Verify Email</a></p>
        `,
        textTemplate: 'Hi {{username}}, verify your email: {{verificationUrl}}'
      },
      {
        id: 'deposit-confirmation',
        name: 'deposit-confirmation',
        subject: 'Deposit Confirmation',
        htmlTemplate: `
          <h1>Deposit Successful</h1>
          <p>Hi {{username}},</p>
          <p>Your deposit of {{amount}} {{currency}} has been successfully processed.</p>
          <p>Transaction ID: {{transactionId}}</p>
        `,
        textTemplate: 'Hi {{username}}, your deposit of {{amount}} {{currency}} was successful. ID: {{transactionId}}'
      },
      {
        id: 'withdrawal-confirmation',
        name: 'withdrawal-confirmation',
        subject: 'Withdrawal Confirmation',
        htmlTemplate: `
          <h1>Withdrawal Processed</h1>
          <p>Hi {{username}},</p>
          <p>Your withdrawal of {{amount}} {{currency}} has been processed.</p>
          <p>Transaction ID: {{transactionId}}</p>
        `,
        textTemplate: 'Hi {{username}}, your withdrawal of {{amount}} {{currency}} was processed. ID: {{transactionId}}'
      }
    ];

    templates.forEach(template => this.addTemplate(template));
  }

  /**
   * Simulate bounce or delivery failure
   */
  async simulateBounce(emailId: string): Promise<void> {
    const email = this.sentEmails.find(e => e.id === emailId);
    if (email) {
      email.status = 'bounced';
    }
  }

  /**
   * Get email statistics for testing
   */
  getEmailStats(): {
    totalSent: number;
    successful: number;
    failed: number;
    bounced: number;
    pending: number;
  } {
    const stats = {
      totalSent: this.sentEmails.length,
      successful: 0,
      failed: 0,
      bounced: 0,
      pending: 0
    };

    this.sentEmails.forEach(email => {
      stats[email.status]++;
    });

    return stats;
  }
}

/**
 * Pre-configured test email scenarios
 */
export const emailTestScenarios = {
  welcomeEmail: {
    templateName: 'welcome',
    variables: {
      username: 'TestUser',
      siteName: 'Stake Games',
      loginUrl: 'https://stakegames.com/login'
    }
  },
  passwordReset: {
    templateName: 'password-reset',
    variables: {
      username: 'TestUser',
      resetUrl: 'https://stakegames.com/reset-password?token=test-token'
    }
  },
  emailVerification: {
    templateName: 'email-verification',
    variables: {
      username: 'TestUser',
      verificationUrl: 'https://stakegames.com/verify-email?token=test-token'
    }
  }
};

// Export singleton instance for testing
export const mockEmailService = new MockEmailService();