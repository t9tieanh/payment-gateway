export const mailConfig = {
  gmailUser: process.env.GMAIL_USER || '',
  gmailPass: process.env.GMAIL_PASS || '',
  alertTo: (process.env.ALERT_MAIL_TO || '')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean),
}
