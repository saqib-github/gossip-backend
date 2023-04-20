const jwt = require("jsonwebtoken");
const { Author } = require("./models");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const author = await Author.findOne({
      _id: decoded.authorId,
    });

    if (!author) {
      throw new Error();
    }

    req.author = author;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: "Please authenticate" });
  }
};

module.exports = auth;
