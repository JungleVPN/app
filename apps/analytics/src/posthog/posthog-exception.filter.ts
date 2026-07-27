import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PostHogService } from './posthog.service';

@Catch()
export class PostHogExceptionFilter implements ExceptionFilter {
  constructor(private readonly postHog: PostHogService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException ? exception.getStatus() : 500;

    if (status >= 500) {
      const distinctId =
        (request.headers['x-posthog-distinct-id'] as string | undefined) ?? 'anonymous';
      this.postHog.captureException(exception, distinctId);
    }

    if (!response.headersSent) {
      response
        .status(status)
        .json(
          exception instanceof HttpException
            ? exception.getResponse()
            : { statusCode: 500, message: 'Internal server error' },
        );
    }
  }
}
