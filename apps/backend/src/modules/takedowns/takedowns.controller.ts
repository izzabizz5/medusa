import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';
import { TakedownsService } from './takedowns.service';
import { TakedownStatus } from '../../entities/takedown-request.entity';
import { IsOptional, IsString } from 'class-validator';

class AdminActionDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

@Controller('takedowns')
@UseGuards(JwtAuthGuard)
export class TakedownsController {
  constructor(private readonly service: TakedownsService) {}

  @Get('mine')
  findMine(@CurrentUser() user: any) {
    return this.service.findByUser(user.id);
  }

  // Admin routes
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@Query('status') status?: TakedownStatus) {
    return this.service.findAll({ status });
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  approve(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: AdminActionDto,
  ) {
    return this.service.approve(id, user.id, dto.notes);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  reject(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: AdminActionDto,
  ) {
    return this.service.reject(id, user.id, dto.notes);
  }
}
