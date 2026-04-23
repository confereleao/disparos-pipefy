import { prisma } from '../../config/prisma';

export class SettingsService {
  private cache = new Map<string, string>();

  async getValue(key: string): Promise<string | null> {
    if (this.cache.has(key)) return this.cache.get(key)!;

    const setting = await prisma.setting.findUnique({ where: { key } });
    if (setting) {
      this.cache.set(key, setting.value);
      return setting.value;
    }
    return null;
  }

  async getAll() {
    return prisma.setting.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] });
  }

  async getByGroup(group: string) {
    return prisma.setting.findMany({ where: { group }, orderBy: { key: 'asc' } });
  }

  async set(key: string, value: string) {
    this.cache.delete(key);
    return prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async setBulk(updates: Record<string, string>) {
    this.cache.clear();
    const ops = Object.entries(updates).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    );
    return Promise.all(ops);
  }
}

export const settingsService = new SettingsService();
