// lib/cors.ts

const ALLOWED_ORIGINS = new Set([
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
]);

export function getCorsHeaders(
  request: Request
): Record<string, string> {
  const origin = request.headers.get("origin");

  const allowedOrigin =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "";

  return {
    ...(allowedOrigin
      ? {
          "Access-Control-Allow-Origin":
            allowedOrigin,
        }
      : {}),

    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS, PATCH, DELETE",

    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",

    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}