const express = require("express");
const jwt = require("jsonwebtoken");
const Contact = require("../models/contactModel");
const User = require("../models/authModel");
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

// Get all contacts for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user.userId })
      .populate('contactId', 'username email _id')
      .select('-__v');
    
    res.json(contacts.map(contact => ({
      id: contact.contactId._id,
      name: contact.contactId.username,
      email: contact.contactId.email,
      avatar: "/placeholder.svg?height=40&width=40",
      lastMessage: "",
      timestamp: "Just now",
      online: false,
      unread: 0
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// Add a contact
router.post('/', authenticateToken, async (req, res) => {
  const { contactId } = req.body;
  
  if (!contactId) {
    return res.status(400).json({ error: "Contact ID is required" });
  }

  try {
    // Check if contact exists
    const contactUser = await User.findById(contactId);
    if (!contactUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already a contact
    const existingContact = await Contact.findOne({
      userId: req.user.userId,
      contactId: contactId
    });

    if (existingContact) {
      return res.status(400).json({ error: "User is already in your contacts" });
    }

    // Add contact (mutual relationship)
    const newContact = await Contact.create({
      userId: req.user.userId,
      contactId: contactId
    });

    // Also add the reverse relationship
    const reverseContact = await Contact.create({
      userId: contactId,
      contactId: req.user.userId
    });

    res.status(201).json({ 
      message: "Contact added successfully",
      contact: {
        id: contactUser._id,
        name: contactUser.username,
        email: contactUser.email,
        avatar: "/placeholder.svg?height=40&width=40"
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add contact" });
  }
});

// Remove a contact
router.delete('/:contactId', authenticateToken, async (req, res) => {
  const { contactId } = req.params;

  try {
    // Remove both directions of the relationship
    await Contact.deleteMany({
      $or: [
        { userId: req.user.userId, contactId: contactId },
        { userId: contactId, contactId: req.user.userId }
      ]
    });

    res.json({ message: "Contact removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove contact" });
  }
});

module.exports = router; 