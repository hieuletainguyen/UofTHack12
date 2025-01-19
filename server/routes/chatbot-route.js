import express from 'express';
import chatbotController from '../controllers/chatbot.js';

const router = express.Router();

router.post('/api/chat-bot', chatbotController.chatWithEducationAssistant);

export default router;