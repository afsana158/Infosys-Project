import React, { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "./style.css";

function ResumeUpload() {
  const [resume, setResume] = useState(null);
  const [jobRole, setJobRole] = useState("");
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => setResume(e.target.files[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resume || !jobRole) {
      alert("Upload a resume and enter job role");
      return;
    }

    const formData = new FormData();
    formData.append("file", resume);
    formData.append("jobRole", jobRole);

    try {
      setLoading(true);
      const res = await axios.post(
        "http://localhost:5000/api/review",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setReview(res.data.review);
    } catch (err) {
      console.error(err);
      alert("Error reviewing resume");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="card">
        <h2 className="title">Resume Review</h2>

        <form onSubmit={handleSubmit} className="form">
          <label className="file-upload">
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.docx,.txt"
              className="hidden-input"
            />
            {resume ? resume.name : "Choose Resume File"}
          </label>

          <input
            type="text"
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
            placeholder="Enter Job Role"
            className="input"
          />

          <button type="submit" className="btn">
            {loading ? "Reviewing..." : "Review Resume"}
          </button>
        </form>

        {review && (
          <div className="review-box">
            <h3 className="review-title">AI Review:</h3>
            <div className="review-text">
              <ReactMarkdown>{review}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResumeUpload;
