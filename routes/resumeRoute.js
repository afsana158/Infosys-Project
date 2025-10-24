    import express from "express";
    import multer from "multer";
    import { reviewResume } from "../controllers/resumeController.js";

    const router = express.Router();


    const storage = multer.memoryStorage();
    const upload = multer({ storage });
    
    router.post("/review", upload.single("file"), reviewResume);
    
    export default router;
