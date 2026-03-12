import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  findMyOrders(@Request() req) {
    return this.orderService.findAllByUser(req.user.userId);
  }

  @Get(':externalId')
  findMyOrderByExternalId(@Request() req, @Param('externalId') externalId: string) {
    return this.orderService.findOneByExternalId(req.user.userId, externalId);
  }

  @Post('merchant/:merchantId')
  createOrderFromCart(
    @Request() req,
    @Param('merchantId') merchantId: string,
    @Body() dto: CreateOrderDto
  ) {
    return this.orderService.createFromCart(req.user.userId, merchantId, dto);
  }

  @Patch(':externalId')
  updateMyOrder(
    @Request() req,
    @Param('externalId') externalId: string,
    @Body() dto: UpdateOrderDto
  ) {
    return this.orderService.updateByExternalId(req.user.userId, externalId, dto);
  }

  @Delete(':externalId')
  removeMyOrder(@Request() req, @Param('externalId') externalId: string) {
    return this.orderService.removeByExternalId(req.user.userId, externalId);
  }
}
