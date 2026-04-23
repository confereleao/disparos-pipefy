import { PrismaClient, Role, TemplateCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Admin padrão
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@empresa.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const adminName = process.env.ADMIN_NAME || 'Administrador';

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: adminName,
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin criado: ${admin.email}`);

  // Usuário operador de exemplo
  const operatorPassword = await bcrypt.hash('Operador@123', 12);
  await prisma.user.upsert({
    where: { email: 'operador@empresa.com' },
    update: {},
    create: {
      email: 'operador@empresa.com',
      name: 'Operador Padrão',
      password: operatorPassword,
      role: Role.OPERATOR,
    },
  });
  console.log('✅ Operador criado: operador@empresa.com');

  // Templates de mensagem padrão
  const templates = [
    {
      name: 'Boas-vindas Comercial',
      category: TemplateCategory.COMMERCIAL,
      content:
        'Olá, {{nome}}! 👋\n\nSomos da *{{empresa}}* e ficamos felizes em ter você conosco.\n\nSeu processo está na fase: *{{fase}}*.\n\nQualquer dúvida, estamos à disposição!\n\nAtenciosamente,\n{{responsavel}}',
      variables: ['nome', 'empresa', 'fase', 'responsavel'],
    },
    {
      name: 'Cobrança Amigável',
      category: TemplateCategory.BILLING,
      content:
        'Olá, {{nome}}! 😊\n\nPassando para avisar que identificamos uma pendência financeira em seu cadastro.\n\nSe já realizou o pagamento, desconsidere esta mensagem.\n\nPara mais informações, entre em contato conosco.\n\nAtt,\n{{responsavel}}',
      variables: ['nome', 'responsavel'],
    },
    {
      name: 'Follow-up de Proposta',
      category: TemplateCategory.FOLLOW_UP,
      content:
        'Olá, {{nome}}!\n\nGostaríamos de saber se você teve a oportunidade de analisar nossa proposta para *{{empresa}}*.\n\nEstamos disponíveis para esclarecer qualquer dúvida ou ajustar o que for necessário.\n\nAguardamos seu retorno!\n\n{{responsavel}}',
      variables: ['nome', 'empresa', 'responsavel'],
    },
    {
      name: 'Lembrete de Reunião',
      category: TemplateCategory.REMINDER,
      content:
        'Olá, {{nome}}! ⏰\n\nLembramos que você tem uma reunião agendada.\n\nQualquer imprevisto, nos avise com antecedência.\n\nObrigado!\n{{responsavel}}',
      variables: ['nome', 'responsavel'],
    },
    {
      name: 'Suporte - Ticket Aberto',
      category: TemplateCategory.SUPPORT,
      content:
        'Olá, {{nome}}!\n\nSeu chamado de suporte foi registrado com sucesso.\n\nNossa equipe irá analisar e retornará em breve.\n\nObrigado pela paciência!\n\nEquipe de Suporte',
      variables: ['nome'],
    },
  ];

  for (const template of templates) {
    await prisma.messageTemplate.upsert({
      where: { id: template.name },
      update: {},
      create: template,
    }).catch(async () => {
      // upsert por nome não funciona direto, verifica se existe
      const exists = await prisma.messageTemplate.findFirst({
        where: { name: template.name },
      });
      if (!exists) {
        await prisma.messageTemplate.create({ data: template });
      }
    });
  }
  console.log(`✅ ${templates.length} templates criados`);

  // Configurações padrão do sistema
  const settings = [
    { key: 'send_interval_ms', value: '2000', label: 'Intervalo entre envios (ms)', group: 'rate_limit' },
    { key: 'daily_limit', value: '500', label: 'Limite diário de envios', group: 'rate_limit' },
    { key: 'allowed_hours_start', value: '8', label: 'Hora início permitida (0-23)', group: 'schedule' },
    { key: 'allowed_hours_end', value: '20', label: 'Hora fim permitida (0-23)', group: 'schedule' },
    { key: 'allowed_days', value: '1,2,3,4,5', label: 'Dias permitidos (0=Dom, 6=Sab)', group: 'schedule' },
    { key: 'max_retries', value: '3', label: 'Máximo de tentativas por mensagem', group: 'queue' },
    { key: 'retry_delay_minutes', value: '30', label: 'Delay entre tentativas (min)', group: 'queue' },
    { key: 'sync_interval_minutes', value: '15', label: 'Intervalo de sync do Pipefy (min)', group: 'pipefy' },
    { key: 'webhook_enabled', value: 'true', label: 'Webhook habilitado', group: 'pipefy' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`✅ ${settings.length} configurações criadas`);

  console.log('\n✨ Seed concluído com sucesso!');
  console.log('\n📋 Credenciais de acesso:');
  console.log(`   Admin:    ${adminEmail} / ${adminPassword}`);
  console.log('   Operador: operador@empresa.com / Operador@123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
