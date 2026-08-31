import { Global, Module } from '@nestjs/common';
import { ClientOrServiceGuard } from '../guards/client-or-service.guard';
import { InterServiceGuard } from '../guards/inter-service.guard';
import { AdminRoleGuard } from './admin-role.guard';
import { ClientUserGuard } from './client-user.guard';
import { RemnaUserResolverService } from './remna-user-resolver.service';

const guards = [ClientUserGuard, AdminRoleGuard, InterServiceGuard, ClientOrServiceGuard];

@Global()
@Module({
  providers: [RemnaUserResolverService, ...guards],
  exports: [RemnaUserResolverService, ...guards],
})
export class ClientAuthModule {}
