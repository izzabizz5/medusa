import { Body, Controller, Delete, Get, Param, Post, Patch } from '@nestjs/common';
import { TargetUrlsService, CreateTargetUrlDto } from './target-urls.service';

// Simple admin-only HTTP controller (no auth middleware for now — deploy behind VPN/firewall)
@Controller('target-urls')
export class TargetUrlsController {
  constructor(private readonly service: TargetUrlsService) {}

  @Post()
  create(@Body() dto: CreateTargetUrlDto) {
    return this.service.create(dto, 'admin');
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.service.toggle(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
