const crypto = require("crypto");

const DEFAULT_TOKEN_EXPIRES_IN_SECONDS = 24 * 60 * 60;

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function getAuthSecret() {
  return process.env.JWT_SECRET || process.env.AUTH_SECRET || process.env.SESSION_SECRET || "";
}

function signToken(payload, expiresInSeconds = DEFAULT_TOKEN_EXPIRES_IN_SECONDS) {
  const secret = getAuthSecret();
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(body)}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(unsignedToken)
    .digest("base64url");

  return `${unsignedToken}.${signature}`;
}

function verifyToken(token) {
  try {
    const secret = getAuthSecret();
    if (!secret || !token) return null;

    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const unsignedToken = `${header}.${payload}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(unsignedToken)
      .digest("base64url");

    const signatureBuffer = Buffer.from(signature, "base64url");
    const expectedSignatureBuffer = Buffer.from(expectedSignature, "base64url");

    if (
      signatureBuffer.length !== expectedSignatureBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
      return null;
    }

    const decoded = base64UrlDecode(payload);
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

module.exports = {
  signToken,
  verifyToken,
};
