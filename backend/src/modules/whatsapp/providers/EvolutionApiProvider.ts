import axios, { AxiosInstance } from 'axios';
import {
  IWhatsAppProvider,
  SendMessageParams,
  SendMessageResult,
  ValidateNumberResult,
} from './IWhatsAppProvider';
import { logger } from '../../../shared/utils/logger';

export class EvolutionApiProvider implements IWhatsAppProvider {
  name = 'evolution';
  private http: AxiosInstance;

  constructor(apiUrl: string, apiKey: string) {
    this.http = axios.create({
      baseURL: apiUrl,
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const instance = params.instanceName ?? 'default';
    try {
      const { data } = await this.http.post(`/message/sendText/${instance}`, {
        number: params.to,
        text: params.message,
        delay: 1200,
      });

      logger.debug(`Evolution API: mensagem enviada para ${params.to}`, data);
      return {
        success: true,
        messageId: data?.key?.id ?? data?.message?.id,
        rawResponse: data,
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.message ?? err.message;
      logger.error(`Evolution API: falha ao enviar para ${params.to}: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        rawResponse: err.response?.data,
      };
    }
  }

  async validateNumber(phone: string, instanceName?: string): Promise<ValidateNumberResult> {
    const instance = instanceName ?? 'default';
    try {
      const { data } = await this.http.post(`/chat/whatsappNumbers/${instance}`, {
        numbers: [phone],
      });
      const result = data?.[0];
      return {
        valid: result?.exists === true,
        formatted: result?.jid ?? undefined,
      };
    } catch (err: any) {
      logger.warn(`Evolution API: falha ao validar número ${phone}: ${err.message}`);
      return { valid: false };
    }
  }

  async getInstanceStatus(instanceName?: string): Promise<{ connected: boolean; status: string }> {
    const instance = instanceName ?? 'default';
    try {
      const { data } = await this.http.get(`/instance/connectionState/${instance}`);
      const state = data?.instance?.state ?? data?.state ?? 'unknown';
      return {
        connected: state === 'open',
        status: state,
      };
    } catch (err: any) {
      return { connected: false, status: 'error' };
    }
  }
}
