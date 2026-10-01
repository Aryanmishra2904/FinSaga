import express from "express";
import dotenv from "dotenv";
import { connectDB,disconnectDB } from "./db/db.js";

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 3002;

app.get("/",(req,res)=>{
    res.send("account service is running ")
})

app.listen(PORT,()=>{
    console.log(`account service is running on port ${PORT} `)
})

process.on("unhandledRejection",async(err)=>{
    console.error(`Unhandled Rejection: ${err.message}`);
    await disconnectDB();
    process.exit(1);
})

process.on("uncaughtException",async(err)=>{
    console.error(`Uncaught Exception: ${err.message}`);
    await disconnectDB();
    process.exit(1);
})

process.on("SIGTERM",async()=>{
    console.log("SIGTERM received, shutting down gracefully");
    await disconnectDB();
    process.exit(0);
})