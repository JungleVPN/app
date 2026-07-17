import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AttributionPayload, CreateUserResponseDto } from '@workspace/types';
import { EventsService } from './events.service';

export interface TrackUserCreatedDto {
  user: CreateUserResponseDto;
  attribution: AttributionPayload;
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('user-created')
  @HttpCode(HttpStatus.NO_CONTENT)
  async trackUserCreated(@Body() body: TrackUserCreatedDto): Promise<void> {
    await this.eventsService.trackUserCreated(body.user, body.attribution);
  }
}
