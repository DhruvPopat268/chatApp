const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/adminModel");
const router = express.Router();

// Admin signup
router.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username and password are required" });
  try {
    const existing = await Admin.findOne({ username });
    if (existing)
      return res.status(400).json({ error: "Username already taken" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await Admin.create({ username, password: hashedPassword });
    res.status(201).json({ admin: { username: newAdmin.username, id: newAdmin._id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username and password are required" });
  try {
    const admin = await Admin.findOne({ username });
    if (!admin)
      return res.status(400).json({ error: "Invalid username or password" });
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(400).json({ error: "Invalid username or password" });
    const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, admin: { id: admin._id, username: admin.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router; 