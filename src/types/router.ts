import { Router } from 'express';
import { Message, Status } from './bot';
export interface WebhookRouterOptions {
    /**
     * The app secret is used to verify the request signature.
     * If null, the request signature will not be verified.
     */
    appSecret: string | null;
    webhookVerifyToken: string;
    onNewMessage: (message: Message) => Promise<void>;
    webhookPath?: string;
    onStatusChange?: (status: Status) => Promise<void>;
    /**
     * Log all entrant requests to console.
     * Remember that the Whatsapp servers make requests to this webhook with new incoming messages and statuses.
     * This option is useful for debugging.
     */
    logAllEntrantRequests?: boolean;
}
export declare function getWebhookRouter(options: WebhookRouterOptions): Router;
