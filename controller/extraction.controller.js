import { extractWithNvidia } from "../utils/ai.utils.js";
import Extraction from "../model/extraction.model.js"
export const extractContent = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
        success: false,
      });
    }
    const base64 = req.file.buffer.toString("base64");
    const image_data = `data:${req.file.mimetype};base64,${base64}`;

    const prompt = `
        Analyze this image and extract visible information. If it contains a resume, extract: - Name - Email - Phone - Skills - Education - Experience - Projects If it contains a LinkedIn recruitment post, extract: - Recruiter email, if visible - Recruiter or author name - Company - Job role - Required skills - Post content Return valid JSON. Use null for missing information. Do not invent or guess information. 
        `;
    const extract_content_with_ai= await extractWithNvidia(prompt, image_data);
    let parseData=null;
    try{
        const jsonMatch=extract_content_with_ai.match(/\{[\s\S]*\}/)
        const toParse=jsonMatch?jsonMatch[0]:extract_content_with_ai
        console.log(toParse);
        parseData=JSON.parse(toParse)
        


    }catch(err){
    console.log("Error parsing JSON: "+err.message)
    parseData={rawContent:extract_content_with_ai};
    }

    const saveExtraction= await Extraction.create({
        data:parseData,
        rawContent:extract_content_with_ai, 
        createdBy:req.user._id
    })

    return res.status(200).json({
        message: "Content extracted successfully",
        success: true,
        data: saveExtraction,
    })

  } catch (err) {
    console.error("Error in extractContent:", err);
    return res.status(500).json({
      message: "Internal Server Error from extractContent",
      success: false,
    });
  }
};
