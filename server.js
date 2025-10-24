import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import resumeRoute from './routes/resumeRoute.js'
import connectDB from './config/mongoDB.js';



const app = express();
const port = 5000
dotenv.config();
connectDB();

app.use(express.json())
app.use(cors())

app.use("/", resumeRoute);

app.listen(port ,()=> console.log('server started on port: '+ port))
