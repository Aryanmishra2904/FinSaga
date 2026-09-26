import express from "express";

const app = express();
const PORT = process.env.PORT || 3002;

app.get("/",(req,res)=>{
    res.send("account service is running ")
})

app.listen(PORT,()=>{
    console.log(`account service is running on port ${PORT} `)
})