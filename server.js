const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const fs = require('fs');

const app = express();
const PORT = 5000;

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/csvdata', { useNewUrlParser: true, useUnifiedTopology: true });

const dataSchema = new mongoose.Schema({
    CreditScore: Number,
    CreditLines: Number,
});

const Data = mongoose.model('Data', dataSchema);

// Multer setup for file upload
const upload = multer({ dest: 'uploads/' });

app.use(express.json());

// Route for uploading CSV
app.post('/upload', upload.single('file'), (req, res) => {
    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            Data.insertMany(results)
                .then(() => {
                    fs.unlinkSync(req.file.path); // Remove file after processing
                    res.json({ message: 'File uploaded and data saved!' });
                })
                .catch((err) => res.status(500).json({ error: err.message }));
        });
});

// Route for fetching data with pagination
app.get('/data', async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    try {
        const data = await Data.find()
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();
        const count = await Data.countDocuments();
        res.json({
            data,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route for calculating subscription pricing
app.post('/calculate', async (req, res) => {
    const { basePrice, pricePerCreditLine, pricePerCreditScorePoint } = req.body;
    const data = await Data.find();
    const results = data.map(entry => {
        const subscriptionPrice = basePrice + (pricePerCreditLine * entry.CreditLines) + (pricePerCreditScorePoint * entry.CreditScore);
        return { ...entry._doc, subscriptionPrice };
    });
    res.json(results);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
