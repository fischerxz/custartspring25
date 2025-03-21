const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mongoose = require("mongoose")
const { Schema } = mongoose;

const messageSchema = new Schema({
  content: {type: String}
})

const messageModel = mongoose.model("Message", messageSchema)


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', async (socket) => {
  console.log('a user connected');
  
  try {
    // Fetch all previous messages from MongoDB
    const messages = await messageModel.find().sort({ _id: 1 });
    // Send previous messages to the newly connected user
    socket.emit('load previous messages', messages);
  } catch (err) {
    console.error('Error loading previous messages:', err);
  }
  
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('chat message', (msg) => {
    const message = new messageModel();
    message.content = msg;
    message.save().then(m => {
      io.emit('chat message', msg);
      console.log('message: ' + msg);
    }).catch(err => {
      console.error('Error saving message:', err);
    });
  });
});

server.listen(3000, async () => {
  await mongoose.connect("mongodb+srv://fisher262425:tWxoPOMjjeJgjpLD@cluster0.5e75z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
  console.log('listening on *:3000');
});

