import axios, { AxiosInstance } from 'axios';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';

export class PipefyClient {
  private http: AxiosInstance;

  constructor(token: string) {
    this.http = axios.create({
      baseURL: env.PIPEFY_API_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
    try {
      const { data } = await this.http.post('', { query, variables });
      if (data.errors?.length) {
        throw new AppError(`Pipefy API: ${data.errors[0].message}`, 502, 'PIPEFY_ERROR');
      }
      return data.data as T;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        `Falha ao conectar ao Pipefy: ${err.message}`,
        502,
        'PIPEFY_CONNECTION_ERROR',
      );
    }
  }

  async listPipes() {
    const data = await this.query<any>(`
      query {
        me {
          pipes {
            id
            name
            phases {
              id
              name
              cards_count
            }
          }
        }
      }
    `);
    return data.me?.pipes ?? [];
  }

  async getPipePhases(pipeId: string) {
    const data = await this.query<any>(
      `
      query($pipeId: ID!) {
        pipe(id: $pipeId) {
          id
          name
          phases {
            id
            name
            cards_count
            fields {
              id
              label
              type
            }
          }
        }
      }
    `,
      { pipeId },
    );
    return data.pipe;
  }

  async getPipeFields(pipeId: string) {
    const data = await this.query<any>(
      `
      query($pipeId: ID!) {
        pipe(id: $pipeId) {
          start_form_fields {
            id
            label
            type
          }
          phases {
            id
            name
            fields {
              id
              label
              type
            }
          }
        }
      }
    `,
      { pipeId },
    );
    return data.pipe;
  }

  async getCards(pipeId: string, phaseId?: string, after?: string) {
    const phaseFilter = phaseId ? `, phase_id: "${phaseId}"` : '';
    const afterCursor = after ? `, after: "${after}"` : '';

    const data = await this.query<any>(
      `
      query($pipeId: ID!) {
        cards(pipe_id: $pipeId${phaseFilter}${afterCursor}, first: 50) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              current_phase { id name }
              assignees { id name email }
              createdAt
              updated_at
              fields {
                field { id label }
                value
                array_value
              }
            }
          }
        }
      }
    `,
      { pipeId },
    );
    return data.cards;
  }

  async getCard(cardId: string) {
    const data = await this.query<any>(
      `
      query($cardId: ID!) {
        card(id: $cardId) {
          id
          title
          current_phase { id name }
          assignees { id name email }
          createdAt
          updated_at
          fields {
            field { id label }
            value
            array_value
          }
        }
      }
    `,
      { cardId },
    );
    return data.card;
  }

  async validateToken(): Promise<boolean> {
    try {
      await this.query<any>(`query { me { id name } }`);
      return true;
    } catch {
      return false;
    }
  }
}
