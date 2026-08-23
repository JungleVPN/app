/**
 * Mock data used for development/staging broadcast testing.
 */
import { UserDto } from '@workspace/types';

export const mockUserDto: UserDto = {
  shortUuid: 'abc123',
  username: '575800239',

  id: 1,
  status: 'ACTIVE',

  trafficLimitBytes: 1073741824,
  trafficLimitStrategy: 'MONTH',

  expireAt: new Date(),
  subRevokedAt: new Date(),
  lastTrafficResetAt: new Date(),

  trojanPassword: 'trojanpass',
  vlessUuid: '123e4567-e89b-12d3-a456-426614174001',
  ssPassword: 'sspass',

  description: null,
  tag: null,
  telegramId: 575800239,
  email: null,
  hwidDeviceLimit: null,

  lastTriggeredThreshold: 0,

  createdAt: new Date(),
  updatedAt: new Date(),

  activeInternalSquads: [],

  externalSquadUuid: null,

  subscriptionUrl: 'https://example.com/subscription',

  userTraffic: {
    usedTrafficBytes: 860903544,
    lifetimeUsedTrafficBytes: 860903544,
    onlineAt: new Date('2026-02-09T21:57:30.119Z'),
    lastConnectedNodeUuid: 'd3659e85-01ec-4865-90c4-86fd8d23686f',
    firstConnectedAt: new Date('2026-02-09T18:48:30.150Z'),
  },
};

export const mockBroadcastUserDto: UserDto[] = [
  {
    ...mockUserDto,
    id: 2,
    username: 'KOT',
    telegramId: 249609787,
    userTraffic: {
      ...mockUserDto.userTraffic,
      firstConnectedAt: null,
    },
  },
  {
    ...mockUserDto,
    id: 3,
    username: '5986698166',
    telegramId: 5986698166,
    email: '7683608743',
    status: 'EXPIRED',
    userTraffic: {
      ...mockUserDto.userTraffic,
      firstConnectedAt: new Date('2026-02-09T18:48:30.150Z'),
    },
  },
  {
    ...mockUserDto,
    id: 4,
    username: '6123456789',
    telegramId: 6123456789,
    status: 'EXPIRED',
    expireAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];
