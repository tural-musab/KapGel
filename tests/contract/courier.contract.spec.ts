import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const courierShiftRequestSchema = z.object({
  action: z.enum(['start', 'end']),
  vehicle: z.enum(['bike', 'car', 'scooter', 'on_foot']),
  startingZoneId: z.string().uuid(),
});

const courierLocationRequestSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  accuracy: z.number().nonnegative(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().nonnegative().optional(),
  trackedOrderId: z.string().uuid().nullable(),
});

const courierTaskAcceptResponseSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['en_route']),
  courierId: z.string().uuid(),
});

const courierTaskLifecycleRequestSchema = z.object({
  signatureUrl: z.string().url().optional(),
  dropoffNote: z.string().min(3).optional(),
});

describe('Courier API contract', () => {
  it('defines shift start/end payload contract', () => {
    expect(
      courierShiftRequestSchema.safeParse({
        action: 'start',
        vehicle: 'bike',
        startingZoneId: '123e4567-e89b-42d3-a456-426614174060',
      }).success,
    ).toBe(true);

    expect(
      courierShiftRequestSchema.safeParse({
        action: 'open',
        vehicle: 'bike',
        startingZoneId: '123e4567-e89b-42d3-a456-426614174060',
      }).success,
    ).toBe(false);
  });

  it('validates live location pings with geographic bounds', () => {
    const validPing = {
      lat: 41.0082,
      lng: 28.9784,
      accuracy: 5,
      heading: 120,
      speed: 8,
      trackedOrderId: null,
    } satisfies z.infer<typeof courierLocationRequestSchema>;

    expect(courierLocationRequestSchema.safeParse(validPing).success).toBe(true);
    expect(
      courierLocationRequestSchema.safeParse({
        ...validPing,
        lat: 120,
      }).success,
    ).toBe(false);
  });

  it('captures courier task assignment lifecycle', () => {
    const acceptResponse = {
      orderId: '123e4567-e89b-42d3-a456-426614174070',
      status: 'en_route',
      courierId: '123e4567-e89b-42d3-a456-426614174071',
    } satisfies z.infer<typeof courierTaskAcceptResponseSchema>;

    expect(() => courierTaskAcceptResponseSchema.parse(acceptResponse)).not.toThrow();

    expect(
      courierTaskLifecycleRequestSchema.safeParse({
        signatureUrl: 'https://example.com/signature.jpg',
        dropoffNote: 'Left with concierge',
      }).success,
    ).toBe(true);

    expect(courierTaskLifecycleRequestSchema.safeParse({ dropoffNote: 'ok' }).success).toBe(false);
  });
});
