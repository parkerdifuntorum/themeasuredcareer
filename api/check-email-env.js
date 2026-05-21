function cleanEnv(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

export default async function handler(req, res) {
  const redisUrl = cleanEnv(process.env.UPSTASH_REDIS_REST_URL);

  return res.status(200).json({
    ok: true,
    hasResendKey: Boolean(cleanEnv(process.env.RESEND_API_KEY)),
    hasRedisUrl: Boolean(redisUrl),
    hasRedisToken: Boolean(cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN)),
    hasSiteUrl: Boolean(cleanEnv(process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL)),
    siteUrl: cleanEnv(process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL) || null,
    emailFrom:
      cleanEnv(process.env.EMAIL_FROM || process.env.RESEND_FROM) ||
      "Job Search Smarter <digest@themeasuredcareer.com>",
    redisUrlPreview: redisUrl.slice(0, 40),
    redisUrlHasQuotes: /^["']|["']$/.test(String(process.env.UPSTASH_REDIS_REST_URL || "").trim()),
  });
}
