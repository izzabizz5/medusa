import { Controller, Get, Param, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { MatchesService } from './matches.service';
import { MatchStatus } from '../../entities/match.entity';
import { TakedownType } from '../../entities/takedown-request.entity';
import { IsEnum, IsOptional } from 'class-validator';

class RequestTakedownDto {
  @IsEnum(TakedownType)
  type: TakedownType;
}

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private readonly service: MatchesService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: MatchStatus,
  ) {
    return this.service.findByUser(user.id, status);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.confirm(id, user.id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.reject(id, user.id);
  }

  @Post(':id/takedown')
  requestTakedown(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: RequestTakedownDto,
  ) {
    return this.service.requestTakedown(id, user.id, dto.type);
  }
}
