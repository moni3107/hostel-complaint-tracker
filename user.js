const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    room: String
});

module.exports = mongoose.model("User", userSchema);