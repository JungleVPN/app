import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { createBackendClient } from '@utils/http-client';
import { apiRoutes } from '@workspace/types';
import { AxiosInstance } from 'axios';

export interface BroadcastDto {
  id: number;
  createdAt: string;
  messageText: string;
}

export interface BroadcastMessageDto {
  id: number;
  telegramId: string;
  messageId: number;
}

/**
 * HTTP client for the broadcasts backend service (port 3005).
 * All DB operations for broadcasts live in the backend.
 */
@Injectable()
export class BroadcastsService {
  private readonly logger = new Logger(BroadcastsService.name);

  private backend: AxiosInstance = createBackendClient(
    process.env.BROADCASTS_URL || 'http://localhost:3005/broadcasts',
  );

  async create(messageText: string): Promise<BroadcastDto> {
    const res = await this.backend.post(apiRoutes.broadcasts.collection, { messageText });

    if (res.status >= 400) {
      this.logger.error(`create failed: ${res.status} ${JSON.stringify(res.data)}`);
      throw new Error(`Broadcast creation failed: ${res.status}`);
    }

    return res.data;
  }

  async getById(id: number): Promise<BroadcastDto | null> {
    const res = await this.backend.get(apiRoutes.broadcasts.byId(id));

    if (res.status === 404) return null;

    if (res.status >= 400) {
      this.logger.error(`getById failed: ${res.status}`);
      throw new Error(`Broadcast fetch failed: ${res.status}`);
    }

    return res.data;
  }

  async updateText(id: number, messageText: string): Promise<BroadcastDto> {
    const res = await this.backend.patch(apiRoutes.broadcasts.byId(id), { messageText });

    if (res.status >= 400) {
      this.logger.error(`updateText failed: ${res.status}`);
      throw new Error(`Broadcast update failed: ${res.status}`);
    }

    return res.data;
  }

  async delete(id: number): Promise<void> {
    const res = await this.backend.delete(apiRoutes.broadcasts.byId(id));

    if (res.status >= 400) {
      this.logger.error(`delete failed: ${res.status}`);
      throw new Error(`Broadcast delete failed: ${res.status}`);
    }
  }

  async getMessages(broadcastId: number): Promise<BroadcastMessageDto[]> {
    const res = await this.backend.get(apiRoutes.broadcasts.messages(broadcastId));

    if (res.status >= 400) {
      this.logger.error(`getMessages failed: ${res.status}`);
      throw new Error(`Broadcast messages fetch failed: ${res.status}`);
    }

    return res.data;
  }

  async addMessage(
    broadcastId: number,
    telegramId: string,
    messageId: number,
  ): Promise<BroadcastMessageDto> {
    const res = await this.backend.post(apiRoutes.broadcasts.messages(broadcastId), {
      telegramId,
      messageId,
    });

    if (res.status >= 400) {
      this.logger.error(`addMessage failed: ${res.status}`);
      throw new Error(`Broadcast message add failed: ${res.status}`);
    }

    return res.data;
  }

  async addMessages(
    broadcastId: number,
    messages: Array<{ telegramId: string; messageId: number }>,
  ): Promise<BroadcastMessageDto[]> {
    const res = await this.backend.post(apiRoutes.broadcasts.messagesBatch(broadcastId), {
      messages,
    });

    if (res.status >= 400) {
      this.logger.error(`addMessages failed: ${res.status}`);
      throw new Error(`Broadcast messages batch add failed: ${res.status}`);
    }

    return res.data;
  }
}
