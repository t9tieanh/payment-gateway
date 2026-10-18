export enum PaymentAlertKind {
  OrderNotFound = 'OrderNotFound',
  AmountMismatch = 'AmountMismatch',
  AppNotConfigured = 'AppNotConfigured',
  HandlerFailed = 'HandlerFailed',
  HandlerCrashed = 'HandlerCrashed',
}
