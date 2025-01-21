import { Router } from "express";

const router = Router();

router.post('/api/chat', (req, res) => {
    const { userInput } = req.body;
  
    const response = `You said: "${userInput}"`;
    console.log("Response from backend:", response);
  
    return res.status(200).json({ response });
  });

export default router;
