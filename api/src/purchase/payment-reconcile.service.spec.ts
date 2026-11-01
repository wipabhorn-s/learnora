import {
  PaymentReconcileService,
  RECONCILE_INTERVAL_MS,
  WATCH_INTERVAL_MS,
} from '@/purchase/payment-reconcile.service';
import { PurchaseService } from '@/purchase/purchase.service';

/**
 * รอบตรวจทานต้องแตะฐานข้อมูลเฉพาะตอนมีงาน ไม่งั้น Neon ไม่ได้หลับ
 * แล้วโควตาฟรีหมดกลางเดือน แต่ห้ามพลาดรายการที่ยังรอจ่ายหรือรอคืนเงิน
 */
function setup(boot = 1_000_000) {
  const purchaseService = {
    lastPaymentActivityAt: boot,
    reconcile: jest.fn().mockResolvedValue({ pending: 0, watching: 0 }),
  };
  const service = new PaymentReconcileService(
    purchaseService as unknown as PurchaseService,
  );
  return { service, purchaseService, boot };
}

describe('PaymentReconcileService — only touches the database when there is work', () => {
  it('checks once right after start-up (orders left from before a restart)', async () => {
    const { service, purchaseService, boot } = setup();
    await service.tick(boot + RECONCILE_INTERVAL_MS);
    expect(purchaseService.reconcile).toHaveBeenCalledTimes(1);
  });

  it('stays idle after a run that found nothing', async () => {
    const { service, purchaseService, boot } = setup();
    await service.tick(boot + RECONCILE_INTERVAL_MS);
    for (let i = 2; i <= 30; i++) {
      await service.tick(boot + i * RECONCILE_INTERVAL_MS);
    }
    expect(purchaseService.reconcile).toHaveBeenCalledTimes(1);
  });

  it('wakes up on the next tick after a checkout or cancellation', async () => {
    const { service, purchaseService, boot } = setup();
    await service.tick(boot + RECONCILE_INTERVAL_MS);
    await service.tick(boot + 2 * RECONCILE_INTERVAL_MS);

    purchaseService.lastPaymentActivityAt = boot + 5 * RECONCILE_INTERVAL_MS;
    await service.tick(boot + 6 * RECONCILE_INTERVAL_MS);
    expect(purchaseService.reconcile).toHaveBeenCalledTimes(2);
  });

  it('keeps checking every tick while an order is still pending', async () => {
    const { service, purchaseService, boot } = setup();
    purchaseService.reconcile.mockResolvedValue({ pending: 1, watching: 0 });
    for (let i = 1; i <= 4; i++) {
      await service.tick(boot + i * RECONCILE_INTERVAL_MS);
    }
    expect(purchaseService.reconcile).toHaveBeenCalledTimes(4);
  });

  it('checks cancelled orders that may still be paid every 30 minutes, not every tick', async () => {
    const { service, purchaseService, boot } = setup();
    purchaseService.reconcile.mockResolvedValue({ pending: 0, watching: 1 });
    const first = boot + RECONCILE_INTERVAL_MS;
    await service.tick(first);

    for (
      let t = first + RECONCILE_INTERVAL_MS;
      t < first + WATCH_INTERVAL_MS;
      t += RECONCILE_INTERVAL_MS
    ) {
      await service.tick(t);
    }
    expect(purchaseService.reconcile).toHaveBeenCalledTimes(1);

    await service.tick(first + WATCH_INTERVAL_MS);
    expect(purchaseService.reconcile).toHaveBeenCalledTimes(2);
  });

  it('retries on the next tick when a run fails', async () => {
    const { service, purchaseService, boot } = setup();
    purchaseService.reconcile.mockRejectedValueOnce(new Error('db down'));
    await service.tick(boot + RECONCILE_INTERVAL_MS);
    await service.tick(boot + 2 * RECONCILE_INTERVAL_MS);
    expect(purchaseService.reconcile).toHaveBeenCalledTimes(2);
  });

  it('does not miss a checkout that happens while a run is in progress', async () => {
    const { service, purchaseService, boot } = setup();
    const runAt = boot + RECONCILE_INTERVAL_MS;
    purchaseService.reconcile.mockImplementationOnce(() => {
      purchaseService.lastPaymentActivityAt = runAt + 1;
      return Promise.resolve({ pending: 0, watching: 0 });
    });
    await service.tick(runAt);
    await service.tick(runAt + RECONCILE_INTERVAL_MS);
    expect(purchaseService.reconcile).toHaveBeenCalledTimes(2);
  });
});
