const mongoose = require("mongoose");

const authorSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
});

const PostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Author",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  comments: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now(),
  },
  updated_at: {
    type: Date,
    default: Date.now(),
  },
});

const CommentSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Author",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now(),
  },
  updated_at: {
    type: Date,
    default: Date.now(),
  },
});

const ReplySchema = new mongoose.Schema({
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Author",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now(),
  },
  updated_at: {
    type: Date,
    default: Date.now(),
  },
});

const Post = mongoose.model("Post", PostSchema);
const Comment = mongoose.model("Comment", CommentSchema);
const Reply = mongoose.model("Reply", ReplySchema);

const Author = mongoose.model("Author", authorSchema);
// const Post = mongoose.model("Post", postSchema);

module.exports = {
  Author,
  Post,
};
