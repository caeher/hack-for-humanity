import { AuthConfig } from 'convex/server'
import { requireClerkIssuerDomain } from './lib/clerkIssuer'

export default {
  providers: [
    {
      domain: requireClerkIssuerDomain(process.env.CLERK_JWT_ISSUER_DOMAIN),
      applicationID: 'convex',
    },
  ],
} satisfies AuthConfig
