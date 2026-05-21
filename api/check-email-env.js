export default async function handler(req, res) {
  return res.status(200).json({
    ok: true,
    hasResendKey: Boolean(process.env.RESEND_API_KEY),
    hasRedisUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    hasRedisToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
  });
}