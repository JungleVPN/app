import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import type { AnalyticsEvent } from '@workspace/types';
import { AttributionPayload, CreateUserResponseDto } from '@workspace/types';
import { InterServiceGuard } from '../guards/inter-service.guard';
import { EventsService } from './events.service';

export interface TrackUserCreatedDto {
  user: CreateUserResponseDto;
  attribution: AttributionPayload;
}

@Controller('events')
@UseGuards(InterServiceGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  trackEvent(@Body() event: Record<string, unknown>): void {
    this.eventsService.trackEvent(event as unknown as AnalyticsEvent);
  }

  @Post('user-created')
  @HttpCode(HttpStatus.NO_CONTENT)
  async trackUserCreated(@Body() body: TrackUserCreatedDto): Promise<void> {
    await this.eventsService.trackUserCreated(body.user, body.attribution);
  }
}
