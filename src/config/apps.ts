import dotenv from 'dotenv'
import { PaymentHandlerKind } from '~/enums/paymentHandlerKind.enum'

dotenv.config()

export interface AppProfile {
  code: string
  apiKey: string
  handler: PaymentHandlerKind
  callbackUrl: string
  callbackSecret: string
}

const APP_CODE_PATTERN = /^[a-z0-9][a-z0-9_-]*$/

const envPrefixOf = (code: string) => `APP_${code.toUpperCase().replace(/-/g, '_')}_`

function readProfile(code: string): AppProfile {
  if (!APP_CODE_PATTERN.test(code))
    throw new Error(`APPS: invalid app code "${code}" (allowed: a-z, 0-9, "_", "-")`)

  const prefix = envPrefixOf(code)
  const apiKey = process.env[`${prefix}API_KEY`] || ''
  const handler = (process.env[`${prefix}HANDLER`] || PaymentHandlerKind.HTTP_CALLBACK) as PaymentHandlerKind
  const callbackUrl = process.env[`${prefix}CALLBACK_URL`] || ''
  const callbackSecret = process.env[`${prefix}CALLBACK_SECRET`] || ''

  if (!apiKey)
    throw new Error(`${prefix}API_KEY is required`)

  if (!Object.values(PaymentHandlerKind).includes(handler))
    throw new Error(`${prefix}HANDLER "${handler}" is not one of: ${Object.values(PaymentHandlerKind).join(', ')}`)

  if (handler === PaymentHandlerKind.HTTP_CALLBACK && (!/^https?:\/\//.test(callbackUrl) || !callbackSecret))
    throw new Error(`${prefix}CALLBACK_URL (http/https) and ${prefix}CALLBACK_SECRET are required for ${handler}`)

  return { code, apiKey, handler, callbackUrl, callbackSecret }
}

function loadApps(): AppProfile[] {
  const codes = (process.env.APPS || '')
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean)

  if (codes.length === 0)
    throw new Error('APPS is required: a comma separated list of app codes')

  if (new Set(codes).size !== codes.length)
    throw new Error('APPS contains a duplicated app code')

  const apps = codes.map(readProfile)

  if (new Set(apps.map((app) => app.apiKey)).size !== apps.length)
    throw new Error('Two apps share the same API key')

  return apps
}

class AppRegistry {
  private readonly apps = loadApps()

  all(): AppProfile[] {
    return this.apps
  }

  findByApiKey(apiKey: string): AppProfile | undefined {
    return this.apps.find((app) => app.apiKey === apiKey)
  }

  findByCode(code: string): AppProfile | undefined {
    return this.apps.find((app) => app.code === code)
  }
}

export const appRegistry = new AppRegistry()
