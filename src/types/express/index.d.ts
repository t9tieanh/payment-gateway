import { Request } from 'express'
import { AppProfile } from '~/config/apps'

declare module 'express-serve-static-core' {
  interface Request {
    appProfile?: AppProfile
    data?: any
  }
}
