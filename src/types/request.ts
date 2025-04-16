export interface SendMessageResult {
    messageId: string;
    phoneNumber: string;
    whatsappId: string;
}
export declare const sendRequestHelper: (fromPhoneNumberId: string, accessToken: string, responseLogger?: (obj: {
    fromPhoneNumberId: string;
    requestBody: any;
    responseSummary: SendMessageResult;
}) => Promise<void>, version?: string) => <T>(data: T) => Promise<SendMessageResult>;
