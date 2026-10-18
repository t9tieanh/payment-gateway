import { AlertNotifierService } from '../alert-notifier.service'
import { mailAlertNotifier } from './mail/mail.notifier'

class AlertNotifierFactory {
  private readonly notifiers: AlertNotifierService[] = [mailAlertNotifier]

  all(): AlertNotifierService[] {
    return this.notifiers
  }
}

export const alertNotifierFactory = new AlertNotifierFactory()
