import { Body, Controller, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ROLE } from '../common/constants/role.constants';
import { CourierService } from './courier.service';
import { UpdateCourierStatusDto } from './dto/update-courier-status.dto';
import { UpdateCourierLocationDto } from './dto/update-courier-location.dto';
import { ApproveCourierDto } from './dto/approve-courier.dto';

@Controller('couriers')
export class CourierController {
  constructor(private readonly courierService: CourierService) {}

  @Patch('me/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.COURIER)
  updateMyStatus(@Request() req, @Body() dto: UpdateCourierStatusDto) {
    return this.courierService.updateOnlineStatus(req.user.userId, dto);
  }

  @Patch('me/location')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.COURIER)
  updateMyLocation(@Request() req, @Body() dto: UpdateCourierLocationDto) {
    return this.courierService.updateLocation(req.user.userId, dto);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE.PLATFORM_ADMIN)
  approveCourier(@Param('id') id: string, @Body() dto: ApproveCourierDto) {
    return this.courierService.approveCourier(id, dto);
  }
}
