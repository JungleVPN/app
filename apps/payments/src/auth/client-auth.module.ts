import { Global, Module } from '@nestjs/common';
import { RemnaUserResolverService } from './remna-user-resolver.service';
import { ClientUserGuard } from './client-user.guard';
import { AdminRoleGuard } from './admin-role.guard';

@Global()
@Module({
  providers: [RemnaUserResolverService, ClientUserGuard, AdminRoleGuard],
  exports: [RemnaUserResolverService, ClientUserGuard, AdminRoleGuard],
})
export class ClientAuthModule {}
