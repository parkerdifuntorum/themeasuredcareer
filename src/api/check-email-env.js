import { getEmailFromAddress } from "../lib/security.js";

export default async function handler(req, res) {
  return res.status(200).json({
    hasResendKey: Boolean(process.env.RESEND_API_KEY),
    hasRedisUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    hasRedisToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    hasSiteUrl: Boolean(process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL),
    siteUrl: process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || null,
    emailFrom: getEmailFromAddress(),
  });
}
