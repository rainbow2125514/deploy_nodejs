const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: "Chưa đăng nhập" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // Nếu lỗi do hết hạn token
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token đã hết hạn" });
      }
      // Nếu lỗi do token không hợp lệ
      return res.status(403).json({ message: "Token không hợp lệ" });
    }
    req.user = decoded; 
    next();
  });
}

module.exports = authenticateToken;