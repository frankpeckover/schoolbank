import { NextResponse, type NextRequest } from "next/server";

const httpsProtocol = "https";
const disabledFlag = "true";

export function proxy(request: NextRequest) {
  if (!shouldEnforceHttps()) {
    return NextResponse.next();
  }

  const protocol = getRequestProtocol(request);

  if (protocol === httpsProtocol) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.protocol = `${httpsProtocol}:`;

  return NextResponse.redirect(url, 308);
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

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
