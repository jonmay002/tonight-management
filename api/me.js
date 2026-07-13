const { verifyToken, tokenFromRequest } = require("./_auth");

module.exports = async (req, res) => {
  const session = verifyToken(tokenFromRequest(req));
  if (!session) {
    return res.status(401).json({ error: "Not signed in" });
  }
  return res.status(200).json({ email: session.e });
};
