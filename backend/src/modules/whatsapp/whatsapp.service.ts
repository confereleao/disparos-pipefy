import { prisma } from '../../config/prisma';
import { IWhatsAppProvider } from './providers/IWhatsAppProvider';
import { EvolutionApiProvider } from './providers/EvolutionApiProvider';
import { NotFoundError, AppError } from '../../shared/errors/AppError';

interface CreateWhatsAppIntegrationDto {
  name: string;
  provider?: string;
  apiUrl: string;
  apiKey: string;
  instanceName?: string;
}

interface UpdateWhatsAppIntegrationDto extends Partial<CreateWhatsAppIntegrationDto> {
  active?: boolean;
}

export class WhatsAppService {
  buildProvider(apiUrl: string, apiKey: string, provider = 'evolution'): IWhatsAppProvider {
    switch (provider) {
      case 'evolution':
      default:
        return new EvolutionApiProvider(apiUrl, apiKey);
    }
  }

  async getProviderForIntegration(integrationId: string): Promise<IWhatsAppProvider> {
    const integration = await this.getIntegrationById(integrationId);
    return this.buildProvider(integration.apiUrl, integration.apiKey, integration.provider);
  }

  async getDefaultProvider(): Promise<{ provider: IWhatsAppProvider; integration: any } | null> {
    const integration = await prisma.whatsAppIntegration.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!integration) return null;
    return {
      integration,
      provider: this.buildProvider(integration.apiUrl, integration.apiKey, integration.provider),
    };
  }

  async getAllIntegrations() {
    return prisma.whatsAppIntegration.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, provider: true, apiUrl: true,
        instanceName: true, active: true, createdAt: true,
      },
    });
  }

  async getIntegrationById(id: string) {
    const integration = await prisma.whatsAppIntegration.findUnique({ where: { id } });
    if (!integration) throw new NotFoundError('Integração WhatsApp');
    return integration;
  }

  async createIntegration(data: CreateWhatsAppIntegrationDto) {
    return prisma.whatsAppIntegration.create({ data });
  }

  async updateIntegration(id: string, data: UpdateWhatsAppIntegrationDto) {
    await this.getIntegrationById(id);
    return prisma.whatsAppIntegration.update({ where: { id }, data });
  }

  async deleteIntegration(id: string) {
    await this.getIntegrationById(id);
    await prisma.whatsAppIntegration.delete({ where: { id } });
  }

  async testConnection(id: string) {
    const integration = await this.getIntegrationById(id);
    const provider = this.buildProvider(integration.apiUrl, integration.apiKey, integration.provider);
    return provider.getInstanceStatus(integration.instanceName ?? undefined);
  }

  async sendTestMessage(id: string, phone: string, message: string) {
    const integration = await this.getIntegrationById(id);
    const provider = this.buildProvider(integration.apiUrl, integration.apiKey, integration.provider);
    return provider.sendMessage({
      to: phone,
      message,
      instanceName: integration.instanceName ?? undefined,
    });
  }
}

export const whatsappService = new WhatsAppService();
