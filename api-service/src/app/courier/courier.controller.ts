import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CourierService } from './courier.service';
import { RequestOtpDto, VerifyOtpDto } from '../otp/dto/otp.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateCourierDto } from './dto/create-courier.dto';
import { AdminCreateCourierDto } from './dto/admin-create-courier.dto';
import { UpdateCourierDto } from './dto/update-courier.dto';
import { RejectCourierDto } from './dto/reject-courier.dto';
import { CourierQueryDto } from './dto/courier-query.dto';

@Controller('couriers')
export class CourierController {
  constructor(private readonly courierService: CourierService) {}

  @Post('otp/request')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.courierService.requestOtp(dto);
  }

  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.courierService.verifyOtp(dto);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  register(@Request() req, @Body() dto: CreateCourierDto) {
    return this.courierService.register(req.user.userId, dto);
  }

  @Post('admin-create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('courier:create')
  adminCreate(@Request() req, @Body() dto: AdminCreateCourierDto) {
    return this.courierService.adminCreate(req.user.userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('courier:read')
  findAll(@Query() query: CourierQueryDto) {
    return this.courierService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('courier:read')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.courierService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('courier:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCourierDto) {
    return this.courierService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('courier:delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.courierService.remove(id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('courier:update_status')
  approve(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.courierService.approve(req.user.userId, id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('courier:update_status')
  reject(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectCourierDto
  ) {
    return this.courierService.reject(req.user.userId, id, dto.reason);
  }
}
