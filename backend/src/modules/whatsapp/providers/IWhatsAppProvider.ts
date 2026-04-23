export interface SendMessageParams {
  to: string;        // número normalizado com DDI
  message: string;
  instanceName?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  rawResponse?: unknown;
  error?: string;
}

export interface ValidateNumberResult {
  valid: boolean;
  formatted?: string;
}

export interface IWhatsAppProvider {
  name: string;
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>;
  validateNumber(phone: string, instanceName?: string): Promise<ValidateNumberResult>;
  getInstanceStatus(instanceName?: string): Promise<{ connected: boolean; status: string }>;
}
