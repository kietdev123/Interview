import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('merchant/:merchantId')
  createOrderFromCart(
    @Request() req,
    @Param('merchantId') merchantId: string,
    @Body() dto: CreateOrderDto
  ) {
    return this.orderService.createFromCart(req.user.userId, merchantId, dto);
  }
}
