import cloudinary from "../config/cloud.config.js"
import User from "../model/auth.model.js"
import File from "../model/file.model.js"
export const uploadFile=async(req,res)=>{
    try{
        
        if(!req.file){
            return res.status(400).json({
                message: "No file uploaded",
                success:false
            })
        }
        const {filename}=req.body
        if(!filename){
            return res.status(400).json({
                message: "Filename is required",
                success:false
            })
        }

        const result=await new Promise((resolve,reject)=>{
            const stream=cloudinary.uploader.upload_stream(
                {
                    folder:"files",
                    resource_type:"auto"
                },
                (error,result)=>{
                    if(error){
                        return reject(error)
                    }
                    return resolve(result)
                }
            )

            stream.end(req.file.buffer)
        })

        const file = await File.create({
            filename,
            fileUrl:result.secure_url,
            createdBy:req.user._id
        })

        await User.findByIdAndUpdate(req.user._id,{
            $push:{files:file._id}
        })

        res.status(201).json({
            message: "File uploaded successfully",
            success:true,
            file
        })

    }catch(err){
        console.log("File upload error: "+err.message)
        res.status(500).json({message: "Internal Server Error",success:false})
    }
}