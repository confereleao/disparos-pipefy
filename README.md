# Disparos Pipefy + WhatsApp

Plataforma completa para disparos automáticos e manuais de WhatsApp integrada ao Pipefy.

## Stack

- **Backend**: Node.js + TypeScript + Express
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Banco**: PostgreSQL com Prisma ORM
- **Fila**: Worker em polling com DB (sem dependência extra)
- **Auth**: JWT com roles (ADMIN / OPERATOR / VIEWER)
- **WhatsApp**: Adaptador desacoplado — padrão Evolution API

---

## Pré-requisitos

- [Node.js](https://nodejs.org) v20+
- [Docker](https://docker.com) + Docker Compose
- (ou) PostgreSQL 15+ e Redis 7+ locais

---

## Configuração rápida (Docker)

```bash
# 1. Clone / entre na pasta
cd disparos-pipefy

# 2. Copie os arquivos de ambiente
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# 3. Edite backend/.env com suas chaves JWT e admin
nano backend/.env

# 4. Suba tudo
docker compose up -d

# 5. Execute as migrações e o seed
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx ts-node prisma/seed.ts
```

Acesse: http://localhost:3000

Credenciais padrão:
- **Admin**: admin@empresa.com / Admin@123
- **Operador**: operador@empresa.com / Operador@123

---

## Configuração manual (sem Docker)

### Backend

```bash
cd backend
npm install

# Copie o .env
cp .env.example .env
# Edite DATABASE_URL, REDIS_URL, JWT_SECRET

# Gere o cliente Prisma
npx prisma generate

# Execute as migrações
npx prisma migrate dev --name init

# Popule o banco
npx ts-node prisma/seed.ts

# Inicie em modo desenvolvimento
npm run dev
```

### Frontend

```bash
cd frontend
npm install

cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3001

npm run dev
```

---

## Variáveis de ambiente — Backend

| Variável | Descrição | Padrão |
|---|---|---|
| `DATABASE_URL` | Connection string PostgreSQL | obrigatório |
| `REDIS_URL` | URL do Redis | `redis://localhost:6379` |
| `JWT_SECRET` | Segredo para tokens JWT | obrigatório |
| `JWT_EXPIRES_IN` | Expiração do token | `7d` |
| `PORT` | Porta do servidor | `3001` |
| `ADMIN_EMAIL` | Email do admin inicial | `admin@empresa.com` |
| `ADMIN_PASSWORD` | Senha do admin inicial | `Admin@123` |

---

## Estrutura de Módulos

```
backend/src/
├── config/          # Prisma, Redis, env
├── modules/
│   ├── auth/        # Login + JWT
│   ├── users/       # CRUD usuários
│   ├── pipefy/      # Integração Pipefy (GraphQL API + webhook + polling)
│   ├── whatsapp/    # Adaptador WhatsApp (Evolution API)
│   ├── automations/ # Engine de triggers
│   ├── templates/   # Templates com variáveis
│   ├── queue/       # Fila + worker de envio
│   ├── history/     # Logs e dashboard stats
│   └── settings/    # Configurações globais
└── shared/
    ├── errors/      # AppError + errorHandler
    ├── middlewares/ # authenticate + requireRole
    └── utils/       # phone, template, audit, logger
```

---

## API Endpoints

### Auth
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Dados do usuário autenticado |

### Pipefy
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/pipefy` | Listar integrações |
| POST | `/api/pipefy` | Criar integração |
| PUT | `/api/pipefy/:id` | Editar integração |
| DELETE | `/api/pipefy/:id` | Remover integração |
| GET | `/api/pipefy/:id/phases` | Fases do pipe |
| GET | `/api/pipefy/:id/fields` | Campos do pipe |
| GET | `/api/pipefy/:id/cards` | Cards em cache |
| POST | `/api/pipefy/:id/sync` | Sincronizar cards |
| POST | `/api/pipefy/webhook/:token` | Receber webhook |

### WhatsApp
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/whatsapp` | Listar integrações |
| POST | `/api/whatsapp` | Criar integração |
| GET | `/api/whatsapp/:id/status` | Status da instância |
| POST | `/api/whatsapp/:id/test` | Enviar mensagem de teste |

### Automações
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/automations` | Listar automações |
| POST | `/api/automations` | Criar automação |
| PUT | `/api/automations/:id` | Editar automação |
| PATCH | `/api/automations/:id/toggle` | Ativar/desativar |
| DELETE | `/api/automations/:id` | Remover automação |

### Templates
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/templates` | Listar templates |
| POST | `/api/templates` | Criar template |
| PUT | `/api/templates/:id` | Editar template |
| POST | `/api/templates/:id/preview` | Preview renderizado |

### Fila
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/queue/stats` | Estatísticas da fila |
| GET | `/api/queue` | Itens da fila |
| POST | `/api/queue/dispatch` | Disparo manual |
| POST | `/api/queue/retry-all` | Reprocessar erros |
| PATCH | `/api/queue/:id/cancel` | Cancelar item |
| PATCH | `/api/queue/:id/retry` | Retentar item |

### Histórico
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/history/dashboard` | Stats do dashboard |
| GET | `/api/history/logs` | Histórico de envios |
| GET | `/api/history/audit` | Logs de auditoria |

---

## Webhook do Pipefy

Ao criar uma integração, o sistema gera um `webhookToken` único. Configure no Pipefy:

```
URL: https://seu-dominio.com/api/pipefy/webhook/{webhookToken}
Eventos: card.create, card.move, card.field_update
```

Se o webhook não estiver disponível, o sistema faz polling a cada 15 minutos automaticamente.

---

## Fluxo de Automação

1. Evento ocorre no Pipefy (webhook ou polling)
2. `AutomationsService.processWebhookEvent()` avalia triggers ativos
3. Verifica filtros de campos
4. Checa chave de idempotência (evita duplicados)
5. Renderiza mensagem com `{{variáveis}}` do card
6. Normaliza e valida telefone
7. Insere na `message_queue` com `scheduledAt`
8. `QueueWorker` processa a cada 5s dentro do horário permitido
9. Envia via `WhatsAppAdapter` (Evolution API ou outro provedor)
10. Salva resultado em `message_logs`

---

## Configurar Evolution API

No painel Evolution API, crie uma instância e copie:
- URL base (ex: `http://localhost:8080`)
- API Key global
- Nome da instância

Configure em **Configurações → WhatsApp → Nova Integração**.

---

## Variáveis de Template

Mapeie campos do Pipefy para variáveis em **Pipes → Editar → Mapeamento de Campos**:

| Variável no Template | Campo Pipefy |
|---|---|
| `{{nome}}` | field_abc123 |
| `{{telefone}}` | field_def456 |
| `{{empresa}}` | field_ghi789 |
| `{{fase}}` | Automático (fase atual) |
| `{{responsavel}}` | Automático (assignee) |

---

## Segurança

- Senhas com bcrypt (12 rounds)
- JWT com expiração configurável
- Rate limiting (500 req/15min)
- Helmet.js para headers HTTP seguros
- RBAC com 3 níveis de acesso
- Auditoria completa de ações
- Tokens de webhook únicos por integração
- Chaves de API não expostas nas listagens

---

## Desenvolvimento

```bash
# Backend com hot reload
cd backend && npm run dev

# Frontend
cd frontend && npm run dev

# Prisma Studio (visualizar banco)
cd backend && npx prisma studio

# Ver logs da fila
docker compose logs -f backend
```
