import { mailConfig } from '~/config/mail'
import { AlertChannel } from '~/enums/alertChannel.enum'
import mailService from '~/service/utils/mail.service'
import { PaymentAlert } from '~/types/payment-alert'
import { AlertNotifierService } from '~/service/alert/alert-notifier.service'
import { paymentAlertMailTemplate } from './mail-alert.template'

class MailAlertNotifier extends AlertNotifierService {
  readonly channel = AlertChannel.Mail

  isEnabled(): boolean {
    return mailService.isConfigured() && mailConfig.alertTo.length > 0
  }

  protected async deliver(alert: PaymentAlert): Promise<void> {
    await mailService.send({ to: mailConfig.alertTo, ...paymentAlertMailTemplate.render(alert) })
  }
}

export const mailAlertNotifier = new MailAlertNotifier()
