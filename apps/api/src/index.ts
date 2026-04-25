import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// import { RitaABI } from '@rita/shared'; // Example shared import

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Rita API is running' });
});

// Acts as a high-speed cache for the blockchain.
// Listens for WillCreated events and indexes them.
app.listen(port, () => {
  console.log(`API Server running on port ${port}`);
});
