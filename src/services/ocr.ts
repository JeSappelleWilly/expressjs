import fetch from 'node-fetch';
import FormData from 'form-data';

export async function extractDataWithOmniAI(fileUrl: string, templateId: string): Promise<any | null> {
    try {
        const apiKey = process.env.OMNI_AI_API_KEY;
        if (!apiKey) return null;

        const formData = new FormData();
        
        if (fileUrl.startsWith('http')) {
            formData.append('url', fileUrl);
        } else {
            const fs = require('fs');
            const path = require('path');
            const filePath = path.resolve(fileUrl);
            if (!fs.existsSync(filePath)) return null;
            formData.append('file', fs.createReadStream(filePath), path.basename(filePath));
        }
        
        formData.append('templateId', templateId);

        // This is the key fix - cast formData as any
        const response = await fetch('https://api.getomni.ai/extract', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                ...formData.getHeaders()
            },
            body: formData as any // Type assertion to bypass type checking
        });

        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
}
