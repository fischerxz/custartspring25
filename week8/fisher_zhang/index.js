const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mongoose = require("mongoose")
const { Schema } = mongoose;
const fetch = require('node-fetch');
require('dotenv').config();

// Message schema with room support
const messageSchema = new Schema({
  content: {type: String},
  sender: {type: String, default: 'user'},
  timeStamp: {type:Date, default: Date.now},
  room: {type: String, default: 'general'},
  username: {type: String}  // Add username field
})

const messageModel = mongoose.model("Message", messageSchema)

// Chatbot functions
const chatbot = {
  commands: {
    '/help': 'Available commands: /help, /time, /genai [your question]',
    '/time': () => `Current time is ${new Date().toLocaleTimeString()}`,
    '/genai': async (prompt) => {
      try {
        // If no prompt provided, return default message
        if (!prompt) {
          return {
            content: 'Hello! I am your AI assistant. How can I help you today?',
            sender: 'genai'
          };
        }

        console.log('Sending prompt to Llama:', prompt);
        
        // Call the API with Llama 2 model
        const response = await fetch('https://api-inference.huggingface.co/models/meta-llama/Llama-2-7b-chat-hf', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: `[INST] ${prompt} [/INST]`,
            parameters: {
              max_new_tokens: 250,
              temperature: 0.7,
              top_p: 0.95,
              repetition_penalty: 1.1,
              return_full_text: false
            }
          })
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        console.log('Received response from Llama:', result);

        return {
          content: result[0].generated_text.trim(),
          sender: 'genai'
        };
      } catch (error) {
        console.error('Error calling AI API:', error);
        return {
          content: 'Sorry, I encountered an error. Please try again later.',
          sender: 'genai'
        };
      }
    }
  },

  processMessage: function(msg) {
    if (!msg.startsWith('/')) return null;
    
    const args = msg.split(' ');
    const command = args[0].toLowerCase();
    const prompt = args.slice(1).join(' ');
    
    const response = this.commands[command] 
      ? (typeof this.commands[command] === 'function' 
          ? this.commands[command](prompt) 
          : this.commands[command])
      : "Unknown command. Type /help for available commands.";

    // If the response is a Promise (for genai), return it directly
    if (response instanceof Promise) {
      return response;
    }
    
    return {
      content: response,
      sender: 'bot'
    };
  }
};

// Serve static files
app.use(express.static(__dirname));

// Serve login page
app.get('/login.html', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

// Serve chat page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', async (socket) => {
  console.log('a user connected');
  
  // Join default room
  socket.join('general');
  
  try {
    // Fetch messages for the default room
    const messages = await messageModel.find({ room: 'general' }).sort({ _id: 1 });
    socket.emit('load previous messages', messages);
  } catch (err) {
    console.error('Error loading previous messages:', err);
  }
  
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  // Handle joining a room
  socket.on('join room', async (room) => {
    socket.leaveAll();  // Leave all current rooms
    socket.join(room);  // Join the new room
    
    try {
      // Fetch messages for the new room
      const messages = await messageModel.find({ room: room }).sort({ _id: 1 });
      socket.emit('load previous messages', messages);
      socket.emit('room joined', room);
    } catch (err) {
      console.error('Error loading room messages:', err);
    }
  });

  socket.on('chat message', async (data) => {
    const { msg, room, username } = data;
    
    // Save user message
    const userMessage = new messageModel({
      content: msg,
      sender: 'user',
      room: room,
      username: username
    });
    
    try {
      await userMessage.save();
      io.to(room).emit('chat message', { 
        content: msg, 
        sender: 'user',
        username: username
      });

      // Check for bot response
      const botResponse = chatbot.processMessage(msg);
      if (botResponse) {
        // Handle both Promise and non-Promise responses
        const finalResponse = await Promise.resolve(botResponse);
        
        const botMessage = new messageModel({
          content: finalResponse.content,
          sender: finalResponse.sender,
          room: room
        });
        
        await botMessage.save();
        io.to(room).emit('chat message', { 
          content: finalResponse.content, 
          sender: finalResponse.sender
        });
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  });
});

server.listen(3000, async () => {
  try {
    await mongoose.connect("mongodb+srv://fisher262425:tWxoPOMjjeJgjpLD@cluster0.5e75z.mongodb.net/chatapp?retryWrites=true&w=majority", {
      ssl: true
    });
    console.log('Connected to MongoDB');
    console.log('Server listening on *:3000');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
});

