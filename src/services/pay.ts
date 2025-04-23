export async function pay(payee: string, depositId: string, amount: string, statementDescription: string, payerMsisdn: string, orderId: string, customerEmail: string) {
  try {
    const token = process.env.PAWAPAY_TOKEN;
    if (!token) {
      console.error("PAWAPAY_TOKEN environment variable not set.");
      return;
    }

    const payload = {
      depositId: depositId,
      amount: amount,
      currency: "ZMW",
      country: "ZMB",
      correspondent: "MTN_MOMO_ZMB",
      payer: {
        type: "MSISDN",
        address: {
          value: payerMsisdn,
        },
      },
      customerTimestamp: new Date().toISOString(), // Generate timestamp dynamically
      statementDescription: statementDescription.substring(0, 22), // Enforce length limit
      // preAuthorisationCode: "<string>", // Consider if this should be dynamic
      metadata: [
        { fieldName: "orderId", fieldValue: orderId },
        { fieldName: "customerId", fieldValue: customerEmail, isPII: true },
      ],
    };

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`, // Use template literals for clarity
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload), // Stringify the payload
    };

    const response = await fetch("https://api.sandbox.pawapay.io/deposits", options);
    const data = await response.json(); // Extract JSON in a separate step
    console.log(data);

    if (!response.ok) {
      console.error(`Pawapay API error: ${response.status} - ${JSON.stringify(data)}`);
      // Optionally throw an error here to be caught by the calling function
    }
  } catch (error) {
    console.error("An error occurred during the payment process:", error);
    // Optionally re-throw the error for higher-level error handling
  }
}
