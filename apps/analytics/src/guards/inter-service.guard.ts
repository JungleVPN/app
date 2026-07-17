import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InterServiceGuard implements CanActivate {
  private readonly logger = new Logger(InterServiceGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string>;
    }>();

    const secret = request.headers['x-service-secret'] ?? '';
    const expected = this.configService.get<string>('INTER_SERVICE_SECRET', '');

    if (!expected) {
      this.logger.error('INTER_SERVICE_SECRET is not configured — rejecting all requests');
      throw new UnauthorizedException('INTER_SERVICE_SECRET is not configured');
    }

    if (secret !== expected) {
      this.logger.warn('Inter-service request rejected: invalid x-service-secret header');
      throw new UnauthorizedException('Invalid service secret');
    }

    return true;
  }
}
