import axios, { AxiosError } from 'axios';

// https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
interface OfficialSendMessageResult {
  messaging_product: 'whatsapp';
  contacts: {
    input: string;
    wa_id: string;
  }[];
  messages: {
    id: string;
  }[];
}

export interface SendMessageResult {
  messageId: string;
  phoneNumber: string;
  whatsappId: string;
}

const defaultLogger = (obj: any) => {
  console.log(obj);
  return Promise.resolve();
};

export const sendRequestHelper =
  (
    fromPhoneNumberId: string,
    accessToken: string,
    responseLogger: (obj: {
      fromPhoneNumberId: string;
      requestBody: any;
      responseSummary: SendMessageResult;
    }) => Promise<void> = defaultLogger,
    version = 'v22.0'
  ) =>
  async <T>(data: T): Promise<SendMessageResult> => {
    try {
      const url = `https://graph.facebook.com/${version}/${fromPhoneNumberId}/messages`;
      console.warn("payload", data);
      console.warn("url", url);

      const { data: rawResult } = await axios({
        method: 'post',
        url,
        data,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      const result = rawResult as OfficialSendMessageResult;

      const returnObject: SendMessageResult = {
        messageId: result.messages?.[0]?.id,
        phoneNumber: result.contacts?.[0]?.input,
        whatsappId: result.contacts?.[0]?.wa_id,
      };

      try {
        await responseLogger({
          fromPhoneNumberId,
          requestBody: data,
          responseSummary: returnObject,
        });
      } catch (err: unknown) {
        // eslint-disable-next-line no-console
        console.log(err);
      }

      return returnObject;
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if ((err as any).response) {
        throw (err as AxiosError)?.response?.data;
        // } else if ((err as any).request) {
        //   throw (err as AxiosError)?.request;
      } else if (err instanceof Error) {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw err.message;
      } else {
        throw err;
      }
    }
  };
