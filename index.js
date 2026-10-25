import express from "express";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js"
const app=express()

const port=5000
app.use(express.json())
app.listen(port,()=>{
    console.log("Server is running on port "+port)
})

connectDB()

app.use("/api/auth",authRoutes);

app.get("/",(req,res)=>{
res.send("Cold Mailer API is running...")
})

