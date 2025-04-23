export async function initiatePawaPayWidgetSession(
    depositId: string,
    returnUrl: string,
    statementDescription: string,
    amount: string,
    msisdn: string,
    reason: string,
    orderId: string,
    customerEmail: string
): Promise<string | null> {
    try {
        const token = process.env.PAWAPAY_TOKEN;
        if (!token) {
            console.error("PAWAPAY_TOKEN environment variable not set.");
            return null;
        }

        const payload = {
            depositId: depositId,
            returnUrl: returnUrl,
            statementDescription: statementDescription.substring(0, 22),
            amount: amount,
            msisdn: msisdn,
            language: "EN", // Hardcoding language for now, consider making it dynamic
            country: "ZMB", // Hardcoding country for now, consider making it dynamic
            reason: reason,
            metadata: [
                { fieldName: "orderId", fieldValue: orderId },
                { fieldName: "customerId", fieldValue: customerEmail, isPII: true },
            ],
        };

        const options = {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        };

        const response = await fetch("https://api.sandbox.pawapay.io/v1/widget/sessions", options);
        const data = await response.json();

        if (response.ok && data && data.sessionId && data.redirectUrl) {
            console.log("PawaPay Widget Session initiated successfully:", data);
            return data.redirectUrl;
        } else {
            console.error("Failed to initiate PawaPay Widget Session:", response.status, data);
            return null;
        }
    } catch (error) {
        console.error("An error occurred while initiating PawaPay Widget Session:", error);
        return null;
    }
}
