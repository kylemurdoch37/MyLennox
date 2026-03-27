import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

async function generateImage() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: 'A photorealistic, professional ID style portrait photo of a man named Duncan, neutral background, front facing, passport photo style, well lit, high quality.',
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4",
        }
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        const buffer = Buffer.from(base64EncodeString, 'base64');
        fs.writeFileSync(path.join(process.cwd(), 'public', 'duncan.jpg'), buffer);
        console.log("Successfully generated and saved duncan.jpg");
        return;
      }
    }
  } catch (error) {
    console.error("Failed to generate image:", error);
  }
}

generateImage();
