const { checkCredentials, signToken, sessionCookie, SESSION_DAYS } = require("./_auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  const em = checkCredentials(email, password);
  if (!em) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  res.setHeader("Set-Cookie", sessionCookie(signToken(em), SESSION_DAYS * 86400));
  return res.status(200).json({ ok: true, email: em });
};
