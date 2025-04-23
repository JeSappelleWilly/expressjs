import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

async function extractDataWithOmniAI(fileUrl: string, templateId: string): Promise<any | null> {
    try {
        const apiKey = process.env.OMNI_AI_API_KEY;
        if (!apiKey) {
            console.error("OMNI_AI_API_KEY environment variable not set.");
            return null;
        }

        const formData = new FormData();

        // Determine if the fileUrl is a URL or a local path
        if (fileUrl.startsWith('http') || fileUrl.startsWith('https')) {
            formData.append('url', fileUrl);
        } else {
            // Assume it's a local path
            const filePath = path.resolve(fileUrl); // Ensure absolute path
            if (!fs.existsSync(filePath)) {
                console.error(`File not found at: ${filePath}`);
                return null;
            }
            formData.append('url', fs.createReadStream(filePath), path.basename(filePath));
        }

        formData.append('templateId', templateId);

        const response = await fetch('https://api.getomni.ai/extract', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                ...formData.getHeaders(),
            },
            body: formData,
        });

        const data = await response.json();

        if (response.ok && data) {
            console.log("Omni AI OCR Result:", data);
            return data;
        } else {
            console.error("Omni AI OCR API Error:", response.status, data);
            return null;
        }
    } catch (error) {
        console.error("Error during Omni AI OCR request:", error);
        return null;
    }
}
