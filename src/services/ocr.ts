export async function extractDataWithOmniAI(fileUrl: string, templateId: string): Promise<any | null> {
    try {
        const apiKey = process.env.OMNI_AI_API_KEY;
        if (!apiKey) return null;

        const FormData = require('form-data');
        const formData = new FormData();
        
        if (fileUrl.startsWith('http')) {
            formData.append('url', fileUrl);
        } else {
            const fs = require('fs');
            const path = require('path');
            formData.append('file', fs.createReadStream(fileUrl));
        }
        
        formData.append('templateId', templateId);

        const response = await fetch('https://api.getomni.ai/extract', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                ...formData.getHeaders()
            },
            // @ts-ignore - bypass type checking for formData
            body: formData
        });

        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
}
