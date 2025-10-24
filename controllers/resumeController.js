import axios from "axios";
import { createRequire } from "module";
import mammoth from "mammoth";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config(); 

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse"); 

// Extract text from uploaded resume buffer
const extractResumeText = async (fileBuffer, mimetype) => {
  if (!fileBuffer) return "";

  if (mimetype === "application/pdf") {
    const data = await pdfParse(fileBuffer);
    return data.text || "";
  } else if (
    mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value || "";
  } else {
    return fileBuffer.toString("utf8");
  }
};

// NLP call 
export const reviewResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const jobRole = req.body.jobRole || "";

    const formData = new FormData();
    formData.append("file", req.file.buffer, req.file.originalname);
    formData.append("job_role", jobRole);

    const response = await axios.post(
      process.env.NLP_API_URL || "http://127.0.0.1:8000/review",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity, // in case of large resumes
      }
    );

    return res.json(response.data);
  } catch (error) {
    console.error("NLP API error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Failed to analyze resume via NLP API" });
  }
};