export default async function handler(req, res) {
  return res.status(200).json({
    message: "Verification route is reachable",
    hasResendKey: Boolean(process.env.RESEND_API_KEY),
    hasRedisUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    hasRedisToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    emailFrom:
      process.env.EMAIL_FROM ||
      process.env.RESEND_FROM ||
      null,
  });
}