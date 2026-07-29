import { type ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { RemnaPanelError } from './remna-panel.client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      this.logger.error(exception.message, exception.stack);
      response.status(status).json({
        statusCode: status,
        error: exception.message,
      });
      return;
    }

    if (exception instanceof RemnaPanelError) {
      const status = exception.status || 502;
      this.logger.error(exception.message, exception.context);
      response.status(status).json({
        statusCode: status,
        error: exception.message,
      });
      return;
    }

    this.logger.error('Unhandled exception', exception);
    response.status(500).json({
      statusCode: 500,
      error: 'Internal server error',
    });
  }
}
