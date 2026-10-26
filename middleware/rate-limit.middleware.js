/**
 * Minimal in-memory rate limiter. Serverless instances are isolated, so this
 * is a per-instance speed bump against credential stuffing, not a global quota.
 */
const buckets = new Map();
const MAX_BUCKETS = 5000;

export const rateLimit = ({ windowMs = 60_000, max = 10, keyPrefix = "default" } = {}) => {
    return (req, res, next) => {
        const now = Date.now();
        const key = `${keyPrefix}:${req.ip || req.socket?.remoteAddress || "unknown"}`;

        if (buckets.size > MAX_BUCKETS) {
            for (const [bucketKey, bucket] of buckets) {
                if (bucket.resetAt <= now) buckets.delete(bucketKey);
            }
            if (buckets.size > MAX_BUCKETS) buckets.clear();
        }

        let bucket = buckets.get(key);
        if (!bucket || bucket.resetAt <= now) {
            bucket = { count: 0, resetAt: now + windowMs };
            buckets.set(key, bucket);
        }

        bucket.count += 1;
        res.setHeader("X-RateLimit-Limit", max);
        res.setHeader("X-RateLimit-Remaining", Math.max(0, max - bucket.count));
        res.setHeader("X-RateLimit-Reset", Math.ceil(bucket.resetAt / 1000));

        if (bucket.count > max) {
            const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
            res.setHeader("Retry-After", retryAfter);
            return res.status(429).json({
                success: false,
                message: `Too many requests. Try again in ${retryAfter} seconds.`,
            });
        }

        return next();
    };
};
