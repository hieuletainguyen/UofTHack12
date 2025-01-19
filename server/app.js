import express from 'express';
import cors from 'cors';
import testingChatRoute from './routes/testing-chat-route.js';
import chatbotRoute from './routes/chatbot-route.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

app.use(testingChatRoute);
app.use(chatbotRoute);

app.listen(9897, () => {
    console.log('Server is running on port 9897');
});

export default app;
