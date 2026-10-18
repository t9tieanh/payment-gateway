import nodemailer, { Transporter } from 'nodemailer'
import { mailConfig } from '~/config/mail'

export interface MailMessage {
  to: string[]
  subject: string
  text: string
  html: string
}

export class MailService {
  private readonly timeoutMs = 10_000
  private transporter: Transporter | null = null

  isConfigured(): boolean {
    return Boolean(mailConfig.gmailUser && mailConfig.gmailPass)
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      if (!this.isConfigured())
        throw new Error('Gmail is not configured (GMAIL_USER, GMAIL_PASS)')

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: mailConfig.gmailUser, pass: mailConfig.gmailPass },
        connectionTimeout: this.timeoutMs,
        greetingTimeout: this.timeoutMs,
        socketTimeout: this.timeoutMs,
      })
    }
    return this.transporter
  }

  async send(message: MailMessage): Promise<void> {
    await this.getTransporter().sendMail({
      from: { name: 'Payment Gateway', address: mailConfig.gmailUser },
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    })
  }
}

export default new MailService()
