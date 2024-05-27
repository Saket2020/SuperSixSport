// server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csvParser = require('csv-parser');
const { Server } = require('socket.io');
const http = require('http');

const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/yourdatabase')
.then(() => {
    console.log('Connected to MongoDB');
})
.catch((err) => {
    console.error('Error connecting to MongoDB:', err);
});



const upload = multer({ dest: 'uploads/' });

// Models
const DataSchema = new mongoose.Schema({
  email: String,
  name: String,
  creditScore: Number,
  creditLines: Number,
  maskedPhoneNumber: String
});
const Data = mongoose.model('Data', DataSchema);

// Enable CORS for specific origins
app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from this origin
  methods: ['GET', 'POST'], // Allow only GET and POST requests
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers to be sent
}));


app.post('/upload', upload.single('file'), (req, res) => {
  const filePath = req.file.path;
  const results = [];

  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      Data.insertMany(results, (err, docs) => {
        if (err) return res.status(500).send(err);
        res.status(200).send(docs);
      });
    });

  // Emit progress updates to the client
  io.on('connection', (socket) => {
    socket.emit('progress', { message: 'File uploaded successfully!' });
  });
});

app.get('/data', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const data = await Data.find()
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
  res.json(data);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
