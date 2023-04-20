const { isEmpty } = require("lodash");
const { Author, Post } = require("./models");
const auth = require("./auth");

const dotenv = require("dotenv").config();
if (dotenv.error) {
  //Just in case there is no .env file throw exception
  throw "Error: Unable to load .env file";
}
const express = require("express"),
  cors = require("cors"),
  ObjectId = require("mongoose").Types.ObjectId,
  mongoose = require("mongoose"),
  bcrypt = require("bcrypt"),
  path = require("path"),
  jwt = require("jsonwebtoken"),
  bodyParser = require("body-parser"),
  endMw = require("express-end"),
  app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
//----------------------------------Middleware Ended-------------------------------

//----------------------------Middleware for capturing request is actually ended even though listener is timed out
app.use(endMw);
//----------------------------------Middleware Ended-------------------------------

//----------------------------Middleware for reading raw Body as text use req.body
app.use(bodyParser.text({ type: "text/plain", limit: "50mb" }));
//----------------------------------Middleware Ended-------------------------------

//----------------------------Middleware to Fix CORS Errors This Will Update The Incoming Request before sending to routes
app.use(cors());

// Error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Internal server error";

  res.status(status).json({ error: message });
});

app.use(express.static(path.join(__dirname, "build")));

// this will run when anyone request on app
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.post("/create-author", async (req, res, next) => {
  try {
    const { name, password, email } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Please provide name" });
    }
    if (!password) {
      return res.status(400).json({ error: "Please provide password" });
    }
    if (!email) {
      return res.status(400).json({ error: "Please provide email" });
    }
    if (name && typeof name !== "string") {
      return res.status(400).json({ error: "name type should be string" });
    }
    if (password && typeof password !== "string") {
      return res.status(400).json({ error: "password type should be string" });
    }
    if (email && typeof email !== "string") {
      return res.status(400).json({ error: "email type should be string" });
    }

    const foundAuthor = await Author.find({ email: email.toLowerCase() });

    if (!isEmpty(foundAuthor)) {
      return res.status(400).json({ error: "Author already exist" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAuthor = new Author({
      name: name,
      password: hashedPassword,
      email: email.toLowerCase(),
    });
    const data = await newAuthor.save();
    const token = jwt.sign({ authorId: data._id }, process.env.JWT_SECRET);
    res
      .status(200)
      .json({ ...data, token, message: "Account successfully created." });
  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
});

app.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Please provide email" });
    }
    if (!password) {
      return res.status(400).json({ error: "Please provide password" });
    }
    if (email && typeof email !== "string") {
      return res.status(400).json({ error: "name type should be string" });
    }
    if (password && typeof password !== "string") {
      return res.status(400).json({ error: "password type should be string" });
    }

    const author = await Author.findOne({ email });

    if (!author) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const isPasswordMatch = await bcrypt.compare(password, author.password);

    if (!isPasswordMatch) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = jwt.sign({ authorId: author._id }, process.env.JWT_SECRET);

    res.status(200).json({ token });
  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
});

app.post("/create-post", auth, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Please provide post content" });
    }
    if (content && typeof content !== "string") {
      return res.status(400).json({ error: "Content type should be string" });
    }
    const author = Author.findById(req.author._id);
    if (isEmpty(author)) {
      return res.status(400).json({ error: "Author not found" });
    }
    const newPost = new Post({ author: new ObjectId(req.author._id), content });
    const data = await newPost.save();
    res.status(200).json({ data, message: "Posted successfully" });
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: "Server Error" });
  }
});

app.get("/all-posts", auth, async (req, res, next) => {
  try {
    const perPage = 10;
    const page = parseInt(req.query.page) || 1;

    const posts = await Post.find({})
      .skip(perPage * page - perPage)
      .limit(perPage)
      .sort({ createdAt: -1 })
      .populate({
        path: "comments",
        populate: {
          path: "replies",
        },
      });

    const count = await Post.countDocuments();

    const nextPage =
      page * perPage < count ? `?page=${page + 1}&perPage=${perPage}` : null;
    const prevPage = page > 1 ? `?page=${page - 1}&perPage=${perPage}` : null;

    res.status(200).json({
      data: posts,
      nextPage,
      prevPage,
    });
  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
});

app.post("/add-comment", auth, async (req, res, next) => {
  try {
    const authorId = ObjectId(req.author._id);
    const { postId, content } = req.body;

    if (!postId) {
      return res.status(400).json({ error: "Please provide postId" });
    }
    if (!content) {
      return res.status(400).json({ error: "Please provide content" });
    }
    if (content && typeof content !== "string") {
      return res.status(400).json({ error: "Content type should be string" });
    }

    if (postId && !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid post Id" });
    }

    const foundPost = await Post.findById(postId);

    if (isEmpty(foundPost)) {
      return res.status(400).json({ error: "Post Not found" });
    }
    const foundAuthor = await Author.findById(postId);

    if (isEmpty(foundAuthor)) {
      return res.status(400).json({ error: "Author Not found" });
    }

    const newComment = new Comment({
      authorId: ObjectId(authorId),
      content,
      replies: [],
    });
    const comment = await newComment.save();

    const post = await Post.findByIdAndUpdate(
      postId,
      {
        $push: { comments: comment._id },
      },
      { new: true }
    ).populate({
      path: "comments",
      populate: {
        path: "replies",
      },
    });

    return res.status(201).json({ data: post });
  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
});

app.post("add-reply", auth, async (req, res, next) => {
  try {
    const authorId = ObjectId(req.author._id);
    const { postId, commentId, content } = req.body;
    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }
    if (!commentId) {
      return res.status(400).json({ error: "commentId is required" });
    }
    if (!authorId) {
      return res.status(400).json({ error: "author is required" });
    }
    if (!content) {
      return res.status(400).json({ error: "content is required" });
    }

    if (authorId && !mongoose.Types.ObjectId.isValid(authorId)) {
      return res.status(400).json({ error: "Invalid Author Id" });
    }

    if (postId && !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid post Id" });
    }
    if (commentId && !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: "Invalid comment Id" });
    }
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    const reply = {
      author: authorId,
      content,
    };
    comment.replies.push(reply);
    await post.save();
    res.status(201).json({ data: reply });
  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected...");
  })
  .catch((err) => console.log(err));

app.listen(8000, () => {
  console.log("server is runing on the port 8000");
});
