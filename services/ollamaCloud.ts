// Ollama Cloud API Service for Resume Parsing
// Using kimi-k2-thinking model to extract structured data from resumes

const OLLAMA_API_KEY = import.meta.env.EBURON_CLOUD_API_KEY;
const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate'; // Local Ollama
const MODEL_NAME = 'kimi-k2-thinking:cloud';

export interface ParsedResume {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  role: string;
  summary: string;
  experience: string;
  education: Array<{
    school: string;
    degree: string;
    year: string;
  }>;
  skills: string[];
}

export async function parseResumeWithAI(resumeText: string): Promise<ParsedResume> {
  const prompt = `You are a resume parsing expert. Extract structured information from the following resume text and return ONLY valid JSON with no additional text or explanation.

Resume Text:
${resumeText}

Extract and return JSON in this exact format:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "location": "City, Country",
  "role": "Professional Title/Role",
  "summary": "Professional summary or objective",
  "experience": "Brief experience summary",
  "education": [
    {
      "school": "University Name",
      "degree": "Degree Title",
      "year": "2020-2024"
    }
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3"]
}

Return ONLY the JSON object, no markdown formatting, no explanation.`;

  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(OLLAMA_API_KEY && { 'Authorization': `Bearer ${OLLAMA_API_KEY}` })
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.response || '';

    // Extract JSON from response
    let jsonStr = aiResponse.trim();
    
    // Remove markdown code blocks if present
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Find JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and normalize the response
    return {
      name: parsed.name || '',
      email: parsed.email || '',
      phone: parsed.phone || '',
      location: parsed.location || '',
      role: parsed.role || parsed.professional_title || '',
      summary: parsed.summary || parsed.professional_summary || '',
      experience: parsed.experience || '',
      education: Array.isArray(parsed.education) ? parsed.education : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : []
    };
  } catch (error) {
    console.error('AI parsing error:', error);
    throw new Error('Failed to parse resume with AI. Please try again or fill manually.');
  }
}

// Extract text from PDF buffer
export async function extractTextFromPDF(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Use pdfjs-dist to extract text
        const pdfjsLib = await import('pdfjs-dist');
        
        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
        
        const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n';
        }
        
        resolve(fullText);
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// Extract first image from PDF (likely profile photo)
export async function extractPhotoFromPDF(file: File): Promise<Blob | null> {
  try {
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
          
          const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
          const page = await pdf.getPage(1); // First page only
          
          const operatorList = await page.getOperatorList();
          
          // Look for image operations
          for (let i = 0; i < operatorList.fnArray.length; i++) {
            if (operatorList.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
              const imageName = operatorList.argsArray[i][0];
              const image = await page.objs.get(imageName);
              
              if (image) {
                // Convert to canvas and then to blob
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                
                if (ctx) {
                  const imageData = ctx.createImageData(image.width, image.height);
                  imageData.data.set(image.data);
                  ctx.putImageData(imageData, 0, 0);
                  
                  const blob = await new Promise<Blob | null>((res) => {
                    canvas.toBlob(res, 'image/jpeg', 0.9);
                  });
                  
                  resolve(blob);
                  return;
                }
              }
            }
          }
          
          resolve(null); // No image found
        } catch (err) {
          console.error('Photo extraction error:', err);
          resolve(null);
        }
      };
      
      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    console.error('Failed to extract photo:', error);
    return null;
  }
}
