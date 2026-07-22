import { NextResponse, type NextRequest } from "next/server";

const httpsProtocol = "https";
const disabledFlag = "true";
const strictTransportSecurityValue = "max-age=31536000; includeSubDomains";

export function proxy(request: NextRequest) {
  const protocol = getRequestProtocol(request);

  if (!shouldEnforceHttps()) {
    return withSecurityHeaders(NextResponse.next(), protocol);
  }

  if (protocol === httpsProtocol) {
    return withSecurityHeaders(NextResponse.next(), protocol);
  }

  const url = request.nextUrl.clone();
  url.protocol = `${httpsProtocol}:`;
  const forwardedHost = getForwardedHost(request);

  if (forwardedHost) {
    url.host = forwardedHost;
  }

  return withSecurityHeaders(NextResponse.redirect(url, 308), httpsProtocol);
}

function shouldEnforceHttps() {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.DISABLE_HTTPS_REDIRECT !== disabledFlag
  );
}

function getRequestProtocol(request: NextRequest) {
  return (
    request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim()
      .toLowerCase() || request.nextUrl.protocol.replace(":", "")
  );
}

function getForwardedHost(request: NextRequest) {
  return request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
}

function withSecurityHeaders(response: NextResponse, protocol: string) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );

  if (process.env.NODE_ENV === "production" && protocol === httpsProtocol) {
    response.headers.set("Strict-Transport-Security", strictTransportSecurityValue);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
