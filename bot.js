require("dotenv").config();

const { Telegraf } = require("telegraf");
const session = require("telegraf-session-local");
const OpenAI = require("openai");
const mongoose = require("mongoose");
const Conversation = require("./models/Conversation");

const bot = new Telegraf(process.env.TELEGRAM_API_KEY);
bot.use(new session());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB", err));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const saveConversation = async (ctx, question, answer = "") => {
  let conversation = await Conversation.findOne({ userId: ctx.from.id });
  if (!conversation) {
    conversation = new Conversation({
      userId: ctx.from.id,
      conversationLog: [],
    });
  }
  conversation.conversationLog.push({
    question,
    answer,
    timestamp: new Date(),
  });
  await conversation.save();
};

const analyzeUserData = async (familySize, income, gender) => {
  const attributes = [
    { name: "Family Size", value: familySize },
    { name: "Household Income", value: income },
    { name: "Gender", value: gender },
  ];

  const uniqueAttributes = new Set();
  attributes.forEach((attr) => uniqueAttributes.add(attr.value));

  return [...uniqueAttributes];
};

bot.start((ctx) => {
  ctx.reply("Hi! Are you looking for a health insurance plan?");
  saveConversation(ctx, "Hi! Are you looking for a health insurance plan?");
});

bot.on("text", async (ctx) => {
  const userMessage = ctx.message.text;

  if (userMessage.toLowerCase() === "yes") {
    ctx.reply("What is your family size?");
    saveConversation(
      ctx,
      "Are you looking for a health insurance plan?",
      "Yes"
    );
  } else if (userMessage.toLowerCase() === "no") {
    ctx.reply("No worries! Let me know if you need help in the future.");
    saveConversation(ctx, "Are you looking for a health insurance plan?", "No");
  } else if (!ctx.session.familySize) {
    ctx.session.familySize = userMessage;
    ctx.reply("What is your household income?");
    saveConversation(ctx, "What is your family size?", userMessage);
  } else if (!ctx.session.householdIncome) {
    ctx.session.householdIncome = userMessage;
    ctx.reply("What is your gender?");
    saveConversation(ctx, "What is your household income?", userMessage);
  } else if (!ctx.session.gender) {
    ctx.session.gender = userMessage;
    ctx.reply("Thanks for sharing! We will assist you soon.");
    saveConversation(ctx, "What is your gender?", userMessage);

    const userData = await analyzeUserData(
      ctx.session.familySize,
      ctx.session.householdIncome,
      ctx.session.gender
    );

    const response = await openai.completions.create({
      model: "gpt-3.5-turbo",
      prompt: `A user is asking for a health insurance plan. Here are the unique user details: ${userData.join(
        ", "
      )}. Provide a short response about suitable health insurance options.`,
      max_tokens: 150,
    });

    ctx.reply(response.choices[0].text.trim());
  }
});

bot.launch();
console.log("Bot is running...");
