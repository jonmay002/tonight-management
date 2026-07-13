// Edge gate for /admin: anything without a valid session cookie
// gets redirected to the sign-in page. The public site is untouched.
export const config = { matcher: "/admin/:path*" };

const PUBLIC_ADMIN_PATHS = ["/admin/login.html", "/admin/admin.css"];
const enc = new TextEncoder();

async function verify(token, secret) {
  if (!token || !secret) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex !== sig) return null;
  try {
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const data = JSON.parse(atob(b64));
    if (!data.e || data.x < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export default async function middleware(req) {
  const url = new URL(req.url);
  if (PUBLIC_ADMIN_PATHS.includes(url.pathname)) return;

  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)tm_admin=([^;]+)/);
  const session = await verify(m && m[1], process.env.AUTH_SECRET);
  if (!session) {
    return Response.redirect(new URL("/admin/login.html", req.url), 302);
  }
}
