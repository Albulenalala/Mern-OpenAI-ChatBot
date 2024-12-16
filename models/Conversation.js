const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: String,
  familySize: String,
  householdIncome: String,
  gender: String,
  conversationLog: [{ question: String, answer: String, timestamp: Date }]
});

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;
