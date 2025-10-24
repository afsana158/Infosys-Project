from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
import re
import datetime
import spacy
import fitz
from docx import Document
from sentence_transformers import SentenceTransformer, util
import torch

# Load NLP model
nlp = spacy.load("en_core_web_sm")


# Load BERT embedding model
bert_model = SentenceTransformer('all-MiniLM-L6-v2')


SECTION_HEADERS = [
    "objective", "summary", "education", "experience", "work experience",
    "projects", "skills", "certifications", "certificates", "achievements"
]

ROLE_SKILLS = {
    "frontend developer": [
        "html", "css", "javascript", "react", "redux", "typescript",
        "next.js", "vue", "angular", "tailwind", "bootstrap",
        "responsive design", "git", "rest api", "webpack"
    ],
    "backend developer": [
        "python", "java", "node.js", "express", "django", "flask",
        "sql", "postgresql", "mysql", "mongodb", "aws", "docker",
        "rest api", "graphql", "linux", "git", "redis", "kubernetes"
    ],
    "ai engineer": [
        "python", "tensorflow", "pytorch", "machine learning", "deep learning",
        "nlp", "opencv", "pandas", "numpy", "scikit-learn", "transformers",
        "data preprocessing", "computer vision", "model deployment", "api"
    ],
    "data analyst": [
        "python", "sql", "excel", "pandas", "numpy", "matplotlib",
        "seaborn", "power bi", "tableau", "data visualization",
        "data cleaning", "statistics", "dashboard", "reporting", "excel"
    ]
}


# Utilities

def extract_text_from_file(file: UploadFile) -> str:
    """Extract text content from PDF, DOCX, or TXT file."""
    if file.filename.endswith(".pdf"):
        text = ""
        pdf = fitz.open(stream=file.file.read(), filetype="pdf")
        for page in pdf:
            text += page.get_text()
        return text
    elif file.filename.endswith(".docx"):
        doc = Document(file.file)
        return "\n".join([para.text for para in doc.paragraphs])
    elif file.filename.endswith(".txt"):
        return file.file.read().decode("utf-8", errors="ignore")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")


# Section Splitting

def simple_section_split(text: str) -> Dict[str, str]:
    text_lower = text.lower()
    header_pattern = r"(^|\n)\s{0,20}(" + "|".join(SECTION_HEADERS) + r")\s*[:\-\n]"
    parts = {}
    matches = list(re.finditer(header_pattern, text_lower, flags=re.IGNORECASE | re.MULTILINE))
    if matches:
        indices = [(m.start(), m.group(2).strip().lower()) for m in matches]
        indices_sorted = sorted(indices, key=lambda x: x[0])
        for i, (start, header) in enumerate(indices_sorted):
            next_start = indices_sorted[i + 1][0] if i + 1 < len(indices_sorted) else len(text)
            content = text[start:next_start].strip()
            content_lines = content.splitlines()
            if len(content_lines) > 1 and header in content_lines[0].lower():
                content = "\n".join(content_lines[1:]).strip()
            parts[header] = parts.get(header, "") + ("\n\n" + content if parts.get(header) else content)
        return parts
    return {"objective": text}

def normalize_skill(skill: str) -> str:
    return re.sub(r"[^\w]", "", skill.lower())

def extract_skills(section_text: str) -> List[str]:
    found = set()
    candidates = re.split(r"[,\n;•]+", section_text)
    for cand in candidates:
        cand = cand.strip()
        if len(cand) <= 40 and cand:
            if len(cand.split()) <= 4:
                found.add(cand)
    return sorted(found)

def extract_education(section_text: str) -> List[Dict[str, str]]:
    results = []
    degree_keywords = ["bachelor", "b.sc", "b.tech", "m.sc", "master", "ms", "mba", "phd", "beng", "b.e", "bachelor of", "master of"]
    lines = [l.strip() for l in section_text.splitlines() if l.strip()]
    for l in lines:
        l_low = l.lower()
        if any(k in l_low for k in degree_keywords) or re.search(r"\b(20\d{2}|19\d{2})\b", l):
            ents = [ent.text for ent in nlp(l).ents if ent.label_ in ("ORG", "GPE")]
            institution = ents[0] if ents else ""
            results.append({"line": l, "institution": institution})
    return results

def extract_experience(section_text: str) -> List[Dict[str, str]]:
    lines = [l.strip() for l in section_text.splitlines() if l.strip()]
    experiences = []
    current = None
    for l in lines:
        if re.search(r"\b(at|intern|developer|engineer)\b", l.lower()):
            experiences.append({"title": l, "description": ""})
            current = experiences[-1]
        elif current:
            current["description"] += " " + l
    return experiences

def extract_projects(section_text: str) -> List[Dict[str, str]]:
    lines = [l.strip() for l in section_text.splitlines() if l.strip()]
    projects = []
    current = None
    for l in lines:
        if len(l.split()) < 10:
            projects.append({"title": l, "description": ""})
            current = projects[-1]
        elif current:
            current["description"] += " " + l
    return projects

def extract_certifications(section_text: str) -> List[str]:
    lines = [l.strip() for l in section_text.splitlines() if l.strip()]
    return [l for l in lines if "cert" in l.lower() or "aws" in l.lower()]


# BERT Fit Score

def compute_fit_score_with_bert(resume_text: str, job_role: str):
    job_role_lower = job_role.strip().lower()
    role_skills = ROLE_SKILLS.get(job_role_lower, [])
    job_text = " ".join(role_skills)

    resume_emb = bert_model.encode(resume_text, convert_to_tensor=True)
    job_emb = bert_model.encode(job_text, convert_to_tensor=True)

    cosine_sim = util.pytorch_cos_sim(resume_emb, job_emb).item()
    fit_score = round(cosine_sim * 100, 2)
    return fit_score

def compute_resume_score(parsed: Dict, job_role: str) -> Dict:
    resume_text = " ".join([
        parsed.get("objective", ""),
        " ".join(parsed.get("skills_extracted", [])),
        " ".join([exp.get("title","") + " " + exp.get("description","") for exp in parsed.get("experience_parsed",[])]),
        " ".join([proj.get("title","") + " " + proj.get("description","") for proj in parsed.get("projects_parsed",[])]),
        " ".join([edu.get("line","") for edu in parsed.get("education_parsed",[])]),
    ])

    fit_score = compute_fit_score_with_bert(resume_text, job_role)

    skills_lower = {s.lower() for s in parsed.get("skills_extracted", [])}
    role_skills_lower = {s.lower() for s in ROLE_SKILLS.get(job_role.lower(), [])}
    skills_matched = list(skills_lower.intersection(role_skills_lower))
    skills_missing = list(role_skills_lower.difference(skills_lower))

    return {
        "fit_score": fit_score,
        "skills_matched": sorted(skills_matched),
        "skills_missing": sorted(skills_missing)
    }


# Feedback Generator

def generate_feedback(parsed, score_info, job_role: str):
    feedback = []

    if score_info["fit_score"] < 50:
        feedback.append("Your resume seems incomplete or lacks relevant details.")
    elif 50 <= score_info["fit_score"] < 75:
        feedback.append("Good start! You have some relevant skills, but you can strengthen your resume.")
    else:
        feedback.append("Your resume looks strong and aligned with the expected profile.")

    if not parsed.get("experience_parsed"):
        feedback.append("Add professional or internship experience.")
    if not parsed.get("projects_parsed"):
        feedback.append("Include at least 2 key projects with technologies used.")

    if score_info.get("skills_missing"):
        feedback.append(f"You're missing some key {job_role.title()} skills such as {', '.join(score_info['skills_missing'][:5])}.")

    return " ".join(feedback)

# FastAPI Endpoint
@app.post("/review")
async def review_resume(file: UploadFile = File(...), job_role: str = Form("frontend developer")):
    text = extract_text_from_file(file)
    sections = simple_section_split(text)

    parsed = {
        "objective": sections.get("objective", ""),
        "education_parsed": extract_education(sections.get("education", "")),
        "experience_parsed": extract_experience(sections.get("experience", "")),
        "projects_parsed": extract_projects(sections.get("projects", "")),
        "skills_extracted": extract_skills(text),
        "certifications_extracted": extract_certifications(sections.get("certifications", "")),
    }

    score_info = compute_resume_score(parsed, job_role)
    feedback = generate_feedback(parsed, score_info, job_role)

    return {
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "fit_score": score_info["fit_score"],
        "skills_matched": score_info["skills_matched"],
        "skills_missing": score_info["skills_missing"],
        "parsed": parsed,
        "job_role": job_role,
        "feedback": feedback
    }

