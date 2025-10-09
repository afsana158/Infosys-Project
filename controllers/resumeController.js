import axios from "axios";
import { createRequire } from "module";
import mammoth from "mammoth";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse"); 

export const reviewResume = async (req, res) => {
  try {

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { jobRole } = req.body;
    const fileBuffer = req.file.buffer;
    const mimetype = req.file.mimetype;

    let resumeContent = "";

    if (mimetype === "application/pdf") {   
      const data = await pdfParse(fileBuffer);
      resumeContent = data.text;
    } else if (
      mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      resumeContent = result.value;
    } else {
      resumeContent = fileBuffer.toString("utf8");
    }

    const aiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert resume reviewer." },
          {
            role: "user",
            content: `Please review and analyze the following resume for a ${jobRole} role:\n\n${resumeContent}`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const review = aiResponse.data.choices[0].message.content;
    res.json({ review });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to review resume" });
  }
};
