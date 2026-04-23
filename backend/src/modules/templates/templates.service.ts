import { TemplateCategory } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../shared/errors/AppError';
import { extractVariables } from '../../shared/utils/template.utils';
import { renderTemplate } from '../../shared/utils/template.utils';

interface CreateTemplateDto {
  name: string;
  category?: TemplateCategory;
  content: string;
}

interface UpdateTemplateDto extends Partial<CreateTemplateDto> {
  active?: boolean;
}

export class TemplatesService {
  async findAll(category?: TemplateCategory) {
    return prisma.messageTemplate.findMany({
      where: { ...(category && { category }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const template = await prisma.messageTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundError('Template');
    return template;
  }

  async create(data: CreateTemplateDto) {
    const variables = extractVariables(data.content);
    return prisma.messageTemplate.create({
      data: { ...data, variables },
    });
  }

  async update(id: string, data: UpdateTemplateDto) {
    await this.findById(id);
    const variables = data.content ? extractVariables(data.content) : undefined;
    return prisma.messageTemplate.update({
      where: { id },
      data: { ...data, ...(variables && { variables }) },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    // Verifica se está em uso
    const inUse = await prisma.automation.count({ where: { templateId: id } });
    if (inUse > 0) {
      // Apenas desativa em vez de excluir
      return prisma.messageTemplate.update({ where: { id }, data: { active: false } });
    }
    return prisma.messageTemplate.delete({ where: { id } });
  }

  async preview(id: string, variables: Record<string, string>) {
    const template = await this.findById(id);
    const rendered = renderTemplate(template.content, variables);
    return { original: template.content, rendered, variables };
  }
}

export const templatesService = new TemplatesService();
