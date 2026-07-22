import { headers } from "next/headers";

type RateLimitInput = {
  key: string;
  maxAttempts: number;
  windowMilliseconds: number;
};

type RateLimitResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      retryAfterSeconds: number;
    };

type RateLimitBucket = {
  attempts: number;
  resetAt: number;
};

const secondsPerMillisecond = 1000;
const fallbackIpAddress = "unknown";

declare global {
  var appRateLimitBuckets: Map<string, RateLimitBucket> | undefined;
}

export async function consumeRateLimit(
  input: RateLimitInput,
): Promise<RateLimitResult> {
  const buckets = getRateLimitBuckets();
  const bucketKey = await buildBucketKey(input.key);
  const now = Date.now();
  const existingBucket = buckets.get(bucketKey);

  if (!existingBucket || existingBucket.resetAt <= now) {
    buckets.set(bucketKey, {
      attempts: 1,
      resetAt: now + input.windowMilliseconds,
    });

    return { ok: true };
  }

  if (existingBucket.attempts >= input.maxAttempts) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil(
        (existingBucket.resetAt - now) / secondsPerMillisecond,
      ),
    };
  }

  existingBucket.attempts += 1;
  return { ok: true };
}

async function buildBucketKey(key: string) {
  return `${await getRequestIpAddress()}:${key.trim().toLowerCase()}`;
}

async function getRequestIpAddress() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const realIp = requestHeaders.get("x-real-ip");

  return (
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    fallbackIpAddress
  );
}

function getRateLimitBuckets() {
  if (!globalThis.appRateLimitBuckets) {
    globalThis.appRateLimitBuckets = new Map();
  }

  return globalThis.appRateLimitBuckets;
}
