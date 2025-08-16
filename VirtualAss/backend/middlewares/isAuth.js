import jwt from "jsonwebtoken";

const isAuth = (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized, token not found" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // yahan payload ke hisaab se field lo
    req.userId = decoded.userId || decoded.id; 

    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(401).json({ message: "Unauthorized, invalid token" });
  }
};

export default isAuth;
