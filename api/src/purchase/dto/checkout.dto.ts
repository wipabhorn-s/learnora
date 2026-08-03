import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CheckoutDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  paymentMethodId?: string;
}
