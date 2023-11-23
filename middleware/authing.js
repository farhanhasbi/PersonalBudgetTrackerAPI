const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  } else {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

const adminAccess = (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  } else if (req.session.user && req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Acccess Forbidden" });
  } else {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

module.exports = { isAuthenticated, adminAccess };
