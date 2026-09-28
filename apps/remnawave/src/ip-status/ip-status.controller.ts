import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { InterServiceGuard } from '../guards/inter-service.guard';
import { type IpStatus, IpStatusService } from './ip-status.service';

/**
 * Public on purpose: the landing page asks this before anyone has an account.
 * It discloses only the caller's own address, which the caller already knows.
 */
@Controller('ip-status')
export class IpStatusController {
  constructor(private readonly ipStatusService: IpStatusService) {}

  @Get()
  async getIpStatus(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<IpStatus> {
    // `request.ip`, not the raw header: main.ts trusts exactly one proxy hop,
    // so this is the address Caddy observed rather than one the visitor typed.
    response.set('Cache-Control', 'no-store');
    return this.ipStatusService.resolve(request.ip);
  }

  /**
   * The same status for an address another service names — how payments
   * learns a visitor's country to price its plans. Internal only: public, it
   * would be a free geo-IP lookup for anyone.
   */
  @Get('lookup')
  @UseGuards(InterServiceGuard)
  async lookup(
    @Query('ip') ip: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<IpStatus> {
    response.set('Cache-Control', 'no-store');
    return this.ipStatusService.resolve(ip);
  }
}
