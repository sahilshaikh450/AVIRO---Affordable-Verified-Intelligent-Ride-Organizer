import { riderStatus } from './Trips';

const b = (extra) => ({ driver: { fullName: 'Sahil Shaikh' }, totalAmount: 40, ...extra });

describe('what a rider is told about their booking', () => {
  test('waiting, confirmed and live stages', () => {
    expect(riderStatus(b({ status: 'REQUESTED' })).text).toBe('Waiting for Sahil to accept');
    expect(riderStatus(b({ status: 'CONFIRMED' })).text).toBe('Confirmed · Sahil will pick you up');
    expect(riderStatus(b({ status: 'CONFIRMED', tripStage: 'ON_THE_WAY' })).tone).toBe('live');
    expect(riderStatus(b({ status: 'CONFIRMED', tripStage: 'ARRIVED' })).text).toBe('Sahil is at the pickup');
    expect(riderStatus(b({ status: 'CONFIRMED', tripStage: 'STARTED' })).text).toBe('On the trip now');
  });

  test('a finished trip asks for payment until paid', () => {
    const unpaid = riderStatus(b({ status: 'COMPLETED' }));
    expect(unpaid.needsAction).toBe(true);
    expect(unpaid.text).toBe('Trip done · pay ₹40');
    expect(riderStatus(b({ status: 'COMPLETED', paymentMethod: 'CASH', paymentStatus: 'PENDING' })).text).toMatch(/waiting for Sahil to confirm/);
    const paid = riderStatus(b({ status: 'COMPLETED', paymentMethod: 'UPI', paymentStatus: 'COMPLETED' }));
    expect(paid.text).toBe('Completed');
    expect(paid.needsAction).toBeUndefined();
  });

  test('declined and cancelled', () => {
    expect(riderStatus(b({ status: 'REJECTED' })).text).toBe("Sahil couldn't take this ride");
    expect(riderStatus(b({ status: 'CANCELLED' })).tone).toBe('bad');
  });

  test('works without driver details', () => {
    expect(riderStatus({ status: 'REQUESTED' }).text).toBe('Waiting for the driver to accept');
  });
});
