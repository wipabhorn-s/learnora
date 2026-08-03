import { EnvVariable } from '@/config/env.validation';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly client: Stripe;

  constructor(
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {
    this.client = new Stripe(
      this.configService.get('STRIPE_SECRET_KEY', { infer: true }),
    );
  }

  async charge(amountThb: number, paymentMethodId: string): Promise<boolean> {
    try {
      const intent = await this.client.paymentIntents.create({
        amount: Math.round(amountThb * 100),
        currency: 'thb',
        payment_method: paymentMethodId,
        payment_method_types: ['card'],
        confirm: true,
      });

      return intent.status === 'succeeded';
    } catch (error) {
      if (error instanceof Stripe.errors.StripeCardError) {
        return false;
      }
      this.logger.error(error);
      throw error;
    }
  }
}
