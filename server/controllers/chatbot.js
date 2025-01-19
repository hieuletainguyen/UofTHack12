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
    You can modify the following attributes for virtual objects: height, width, length, radius, baseLength, baseWidth, scale, unfold, fold, and shape.
    You need to modify the current state of the object based on the user's input.

    **Rules:**
    1. The height, width, and length can only be integers between 1 and 5. These values must always be placed inside the "dimensions" object.
    2. The scale can only range between 0.5 and 2 (inclusive).
    3. The object can be in one of two states: unfolded (true) or folded (false).
    4. The shape is a string that describes the object (e.g., "sphere", "cube", "pyramid").
    5. You must always answer in JSON format. Responses must accurately reference changes or queries about the object's state.

    **Current State of the Object:**
    ${JSON.stringify(currentState)}

    **Examples of JSON Responses:**
    - User: "Set the height to 4."
      Response: {
        "response": {
          "dimensions": { "height": 4 }
        },
        "speak": "Sir, I have set the height to 4."
      }

    - User: "Change the scale to 1.5."
      Response: {
        "response": { "scale": 1.5 },
        "speak": "Sir, I have set the scale to 1.5."
      }

    - User: "Set the height to 6."
      Response: {
        "response": "Error: Height must be between 1 and 5.",
        "speak": "Error: Height must be between 1 and 5."
      }

    - User: "Fold the object."
      Response: {
        "response": { "unfolded": false },
        "speak": "Sir, I have folded the object."
      }

    - User: "What's the current state?"
      Response: {
        "response": ${JSON.stringify(currentState)},
        "speak": "Sir, the current state is height 1, width 1, length 1, scale 1.0, unfolded false, shape default."
      }

    - User: "Set the height to 3, width to 5, and scale to 2."
      Response: {
        "response": {
          "dimensions": { "height": 3, "width": 5 },
          "scale": 2
        },
        "speak": "Sir, I have set the height to 3, width to 5, and scale to 2."
      }

    **Edge Cases:**
    1. **Invalid Values**: If a value is out of range, respond with an error message. Example:
      {
        "response": "Error: Width must be between 1 and 5.",
        "speak": "Error: Width must be between 1 and 5."
      }
    2. **Ambiguous Requests**: If the user's request is unclear or ambiguous, respond with:
      {
        "response": "Invalid request or unable to understand the command.",
        "speak": "Invalid request or unable to understand the command."
      }
    3. **Query Without Changes**: If the user asks for the current state without making changes, provide the full current state in JSON format.

    **Additional Notes:**
    - All height, width, and length changes must always appear in the "dimensions" object, even if only one is modified.
    - Ensure the response is concise and always in JSON format.

    **Key Requirements:**
    - Maintain consistency in responses.
    - Always include a "speak" key in the response for verbal feedback.
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
      return res.status(200).json(JSON.parse(content));
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
