import { Router } from "express";

const router = Router();

router.post('/api/chat', (req, res) => {
    const { userInput } = req.body;
  
    // Simulate a response (Replace this with your OpenAI assistant logic)
    const response = `You said: "${userInput}"`;
    console.log("Response from backend:", response);
  
    // Return the response in the required format
    return res.status(200).json({ response });
  });

export default router;
