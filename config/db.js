
import mongoose from "mongoose";

const connectDB=async()=>{
    try{
        const connection=await mongoose.connect(process.env.MONGO);

        console.log("MongoDB Connected...")
    }catch(err){
        console.error("Error connecting to MongoDB: ", err.message);
    }
}
export default connectDB;