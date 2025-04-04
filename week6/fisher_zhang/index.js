const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mongoose = require("mongoose")
const { Schema } = mongoose;

// Message schema with sender type
const messageSchema = new Schema({
  content: { type: String },
  sender: { type: String, default: 'user' }, // 'user' or 'bot'
  timestamp: { type: Date, default: Date.now }
})

const messageModel = mongoose.model("Message", messageSchema)

// Chatbot functions
const chatbot = {
  commands: {
    '/help': 'Available commands: /help, /time, /echo [message], /roll',
    '/time': () => `Current time is ${new Date().toLocaleTimeString()}`,
    '/echo': (msg) => msg,
    '/roll': () => `🎲 You rolled a ${Math.floor(Math.random() * 6) + 1}!`
  },

  processMessage: function(msg) {
    if (!msg.startsWith('/')) return null;
    
    const args = msg.split(' ');
    const command = args[0].toLowerCase();
    const rest = args.slice(1).join(' ');

    if (command === '/echo' && rest) {
      return this.commands[command](rest);
    }
    
    return this.commands[command] 
      ? (typeof this.commands[command] === 'function' 
          ? this.commands[command]() 
          : this.commands[command])
      : "Unknown command. Type /help for available commands.";
  }
};

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', async (socket) => {
  console.log('a user connected');
  
  try {
    const messages = await messageModel.find().sort({ _id: 1 });
    socket.emit('load previous messages', messages);
  } catch (err) {
    console.error('Error loading previous messages:', err);
  }
  
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('chat message', async (msg) => {
    // Save user message
    const userMessage = new messageModel({
      content: msg,
      sender: 'user'
    });
    
    try {
      await userMessage.save();
      io.emit('chat message', { content: msg, sender: 'user' });

      // Check for bot response
      const botResponse = chatbot.processMessage(msg);
      if (botResponse) {
        const botMessage = new messageModel({
          content: botResponse,
          sender: 'bot'
        });
        await botMessage.save();
        io.emit('chat message', { content: botResponse, sender: 'bot' });
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  });
});

server.listen(3000, async () => {
  await mongoose.connect("mongodb+srv://fisher262425:tWxoPOMjjeJgjpLD@cluster0.5e75z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
  console.log('listening on *:3000');
}); 