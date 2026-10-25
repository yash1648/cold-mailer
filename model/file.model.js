import mongoose from 'mongoose';
const fileSchema = new mongoose.Schema({
    filename:{
        type:String,
        trim:true,
        required:true
    },
    fileUrl:{
        type:String,
        required:true
    },
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
}, { timestamps: true });

const File=mongoose.model('File',fileSchema);
export default File;