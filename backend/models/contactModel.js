const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  contactId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  // Ensure unique combination of userId and contactId
}, { 
  timestamps: true,
  // Compound index to ensure unique relationships
  indexes: [
    { userId: 1, contactId: 1, unique: true }
  ]
});

module.exports = mongoose.model("Contact", contactSchema); 