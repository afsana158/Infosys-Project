import mongoose from "mongoose";
const MONGODB_URI = "mongodb+srv://23052112_db_user:3YEUQ589uoF7U74i@cluster1.x7nztu4.mongodb.net/";



const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
        dbName: "Resume-Optimiser"
    });
    console.log("MongoDB connected successfully.");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

export default connectDB;
