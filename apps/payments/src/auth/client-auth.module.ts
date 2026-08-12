import { Global, Module } from '@nestjs/common';
import { AdminRoleGuard } from './admin-role.guard';
import { ClientUserGuard } from './client-user.guard';
import { RemnaUserResolverService } from './remna-user-resolver.service';

@Global()
@Module({
  providers: [RemnaUserResolverService, ClientUserGuard, AdminRoleGuard],
  exports: [RemnaUserResolverService, ClientUserGuard, AdminRoleGuard],
})
export class ClientAuthModule {}
