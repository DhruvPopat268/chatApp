const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/authModel");
const router = express.Router();

router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: "All fields are required" });

  try {
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing)
      return res.status(400).json({ error: "Username or Email already taken" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({ token, user: { username, email, id: newUser._id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get('/', async (req, res) => {
    try {
      const users = await User.find({ }); // return only basic fields
      res.status(200).json(users);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch users', error: err.message });
    }
  });

router.post("/login", async (req, res) => {
    const { username, password } = req.body;
  
    if (!username || !password)
      return res.status(400).json({ error: "username and password are required" });
  
    try {
      const user = await User.findOne({ username });
      if (!user)
        return res.status(400).json({ error: "Invalid username or password" });
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ error: "Invalid username or password" });
  
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
  
      res.json({
        token,
        user: { id: user._id, username: user.username, email: user.email },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/logout", (req, res) => {
    // Frontend should delete token, but sending OK response
    res.json({ message: "Logged out successfully" });
  });
  

module.exports = router;
