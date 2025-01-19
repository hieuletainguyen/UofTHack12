import dotenv from 'dotenv';
import { OpenAI } from 'openai';
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default object state
const defaultState = {
  height: 1,
  width: 1,
  length: 1,
  scale: 1.0,
  unfolded: false,
  shape: "default",
};

/**
 * Chat with GPT for Virtual New Education Assistant
 * @param {string} userInput - The user's input or command.
 * @param {object} currentState - The current state of the object.
 * @returns {Promise<string>} - GPT's response in JSON format.
 */
const chatWithEducationAssistant = async (req, res) => {
  const { userInput, currentState } = req.body;
  console.log("Current State:", currentState);
  console.log("User Input:", userInput);

  const systemPrompt = `
    You are a virtual assistant for the Virtual New Education system. 
    You can modify the following attributes for virtual objects: height, width, length, scale, unfold, fold, and shape.
    You need to modify the current state of the object based on the user's input.

    **Rules:**
    1. The height, width, and length can only be integers between 1 and 5.
    2. The scale can only range between 0.5 and 2 (inclusive).
    3. The object can be unfolded or folded (boolean states).
    4. The shape is a string that can describe the object (e.g., "sphere", "cube", "pyramid").
    5. You must answer in JSON format, referencing changes or queries about the object's state.

    **Current State of the Object:**
    ${JSON.stringify(currentState)}

    **Examples of JSON responses:**
    - User: "Set the height to 4."
    Response: {"response": {height: 4}, "speak": "Height set to 4."}

    - User: "Change the scale to 1.5."
    Response: {"response": {scale: 1.5}, "speak": "Scale set to 1.5."}

    - User: "Set the height to 6."
    Response: {"response": "Error: Height must be between 1 and 5.", "speak": "Error: Height must be between 1 and 5."}

    - User: "Fold the object."
    Response: {"response": {unfolded: false}, "speak": "Object folded."}

    - User: "What's the current state?"
    Response: {"response": ${JSON.stringify(currentState)}, "speak": "Current state: height 1, width 1, length 1, scale 1.0, unfolded false, shape default."}

    - User: "Set the height to 3, width to 5, and scale to 2."
    Response: {"response": {height: 3, width: 5, scale: 2}, "speak": "Height set to 3, width set to 5, and scale set to 2."}

    **Edge Cases:**
    1. If the user provides an invalid value, respond with an error message like: 
    {"response": "Error: Height must be between 1 and 5.", "speak": "Error: Height must be between 1 and 5."}
    2. If the request is ambiguous, respond with: {"response": "Invalid request or unable to understand the command."}
    3. If no changes are requested but the user asks for the current state, return the full current state in JSON format.

  `;

  const messages = [
    { role: "system", content: systemPrompt.trim() },
    { role: "user", content: userInput.trim() },
  ];

  try {
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
    });
    console.log(`Current State: ${JSON.stringify(currentState)}`);

    if (response && response.choices && response.choices.length > 0) {
      const content = response.choices[0].message.content;
      console.log("Response from OpenAI:", content);
      return res.status(200).json({ result: content });
    } else {
      console.error("Unexpected response format from OpenAI:", response);
      return res.status(500).json({ error: "Unexpected response format from OpenAI." });
    }
  } catch (error) {
    console.error("Error in GPT interaction:", error);

    // Return detailed error message to aid debugging (you can suppress this in production)
    return res.status(500).json({
      error: "Failed to fetch response from OpenAI.",
      details: error.message,
    });
  }
};

export default { chatWithEducationAssistant };
