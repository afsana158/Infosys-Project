import React, { useState } from "react";
import "./style.css";

const ResumeReviewer = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [result, setResult] = useState(null);
  const [jobRole, setJobRole] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) {
      alert("Please upload a resume first!");
      return;
    }

    if (!jobRole) {
      alert("Please select a job role!");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("job_role", jobRole);

      const response = await fetch("http://localhost:5000/review", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to review resume");

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      setResult({ error: "Error reviewing resume. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => setResult(null);

  return (
    <div className={`page ${darkMode ? "dark" : ""}`}>
      <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
        {darkMode ? "🌙" : "☀️"}
      </button>

      {!result ? (
        <>
          <h1 className="title">Resume Reviewer</h1>
          <div className="container">
            <label className="upload-box">
              <input type="file" onChange={handleFileChange} />
              <div className="upload-content">
                <span className="icon">📂</span>
                <p>Click to Upload Resume (.pdf / .docx / .txt)</p>
              </div>
            </label>

            {file && <p className="file-name">📄 {file.name}</p>}

            <select
              className="dropdown"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
            >
              <option value="">-- Select Job Role --</option>
              <option value="frontend developer">Frontend Developer</option>
              <option value="backend developer">Backend Developer</option>
              <option value="ai engineer">AI Engineer</option>
              <option value="data analyst">Data Analyst</option>
            </select>

            <button onClick={handleSubmit} className="review-btn">
              {loading ? <div className="spinner"></div> : "Review Resume"}
            </button>
          </div>
        </>
      ) : (
        <div className="result-card">
          <button className="back-btn" onClick={handleBack}>
            ← Back
          </button>

          {result.error ? (
            <p className="error-text">{result.error}</p>
          ) : (
            <div className="result-content">
              {/* Fit Score */}
              <h2 className="fit-score">
                Fit Score:{" "}
                <span className="highlight">{result.fit_score || 0}</span>
              </h2>

              {/* Skills Matched Card */}
              <div className="info-card matched-card">
                <h3>✅ Skills Matched</h3>
                {result.skills_matched && result.skills_matched.length > 0 ? (
                  <ul className="skills-list matched">
                    {result.skills_matched.map((skill, i) => (
                      <li key={i}>{skill}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No matched skills found.</p>
                )}
              </div>

              {/* Skills Missing Card */}
              <div className="info-card missing-card">
                <h3>❌ Skills Missing</h3>
                {result.skills_missing && result.skills_missing.length > 0 ? (
                  <ul className="skills-list missing">
                    {result.skills_missing.map((skill, i) => (
                      <li key={i}>{skill}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No skills missing!</p>
                )}
              </div>

              {/* Feedback Card */}
              {result.feedback && (
                <div className="info-card feedback-card">
                  <h3>💬 Feedback</h3>
                  <p className="feedback-text">{result.feedback}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumeReviewer;
