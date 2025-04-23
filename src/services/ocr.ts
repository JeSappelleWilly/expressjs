import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

export async function extractDataWithOmniAI(fileUrl: string, templateId: string): Promise<any | null> {
    try {
        const apiKey = process.env.OMNI_AI_API_KEY;
        if (!apiKey) {
            console.error("OMNI_AI_API_KEY environment variable not set.");
            return null;
        }

        const formData = new FormData();

        // Determine if the fileUrl is a URL or a local path
        if (fileUrl.startsWith('http') || fileUrl.startsWith('https')) {
            // For URLs, just pass the URL
            formData.append('url', fileUrl);
        } else {
            // For local files
            const filePath = path.resolve(fileUrl);
            if (!fs.existsSync(filePath)) {
                console.error(`File not found at: ${filePath}`);
                return null;
            }
            
            // Create a read stream from the file and append it to form data
            const fileStream = fs.createReadStream(filePath);
            formData.append('file', fileStream, path.basename(filePath));
        }

        formData.append('templateId', templateId);

        const response = await fetch('https://api.getomni.ai/extract', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                ...formData.getHeaders() // This works with the form-data package
            },
            body: formData
        });

        if (!response.ok) {
            console.error(`Omni AI API error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        console.log("Omni AI OCR Result:", data);
        return data;
    } catch (error) {
        console.error("Error during Omni AI OCR request:", error);
        return null;
    }
}
