import User from "../model/auth.model.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
export const registerUser= async(req,res) => {
    try{
        const {name,email,password,domain,skills}=req.body;
        if(!name || !email || !password){
            throw new Error("All fields are required...")
        }
        if(name.length<3){
            throw new Error("Name must be at least 3 characters long")
        }
        if(password.length<8){
            throw new Error("Password must be at least 8 characters long")
        }
        const existUser=await User.findOne({email});
        if(existUser){
            throw new Error("User already exists with this email")
        }
        const hashed_password=await bcrypt.hash(password,10);
        const user=await User.create({
            name,
            email,
            password:hashed_password,
            domain,
            skills
        })
        
        res.status(201).json({
            message:"User registered successfully",
            success:true,
            user: {
                user:user.name,
                email:user.email,
                domain:user.domain,
                skills:user.skills
            }
        })
    }catch(err){
        
        res.status(400).json({message:err.message,
            success:false
        })
    }
}


export const loginUser=async(req,res)=>{
    try{
        const {email,password}=req.body;
        if(!email || !password){
        return res.status(400).json({message:"All fields are required",success:false})
    }   
    if(password.length<8){
        return res.status(400).json({message:"Password must be at least 8 characters long",success:false})
    }
    const user=await User.findOne({email}).select("+password")
    if(!user){
        return res.status(400).json({message:"Invalid email or password",success:false})
    }
    const isMatch=await bcrypt.compare(password,user.password)
    if(!isMatch){
        return res.status(400).json({message:"Invalid password",success:false})
    }

    const token=jwt.sign({
        userId:user._id},
        
        )

    return res.status(200).json({
        message:"User logged in successfully",
        success:true,
        user:{
            user:user.name,
            email:user.email,
            domain:user.domain,
            skills:user.skills
        },
        token:token
    })



    }catch(err){
        console.log(err.message)
        res.status(500).json({message:"Internal server error",
            success:false})
    }
}
