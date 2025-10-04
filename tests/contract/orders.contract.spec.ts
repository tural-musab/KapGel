import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const orderItemRequestSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
});

const orderCreateRequestSchema = z.object({
  branchId: z.string().uuid(),
  addressText: z.string().min(5),
  paymentMethod: z.enum(['cash', 'pickup_card']),
  items: z.array(orderItemRequestSchema).min(1),
  customerId: z.string().uuid().optional(),
  courierId: z.string().uuid().optional(),
});

const orderItemSchema = z.object({
  id: z.string().uuid(),
  qty: z.number().int().positive(),
  unit_price: z.number().nonnegative(),
  products: z
    .object({
      name: z.string().min(1),
    })
    .nullable(),
});

const orderEventsSchema = z.object({
  status: z.enum(['pending', 'preparing', 'ready', 'en_route', 'delivered', 'cancelled']),
  actor: z.enum(['system', 'vendor', 'courier']),
  timestamp: z.string().datetime({ offset: true }),
});

const orderResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'preparing', 'ready', 'en_route', 'delivered', 'cancelled']),
  customerId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  courierId: z.string().uuid().nullable().optional(),
  total: z.number().nonnegative(),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1),
        qty: z.number().int().positive(),
        unitPrice: z.number().nonnegative(),
      }),
    )
    .optional(),
  events: z.array(orderEventsSchema).optional(),
});

const orderTransitionRequestSchema = z.object({
  targetStatus: z.enum(['preparing', 'ready', 'en_route', 'delivered', 'cancelled']),
  metadata: z
    .object({
      note: z.string().min(1).optional(),
    })
    .optional(),
});

describe('Orders API contract', () => {
  it('accepts valid order creation payloads and rejects invalid ones', () => {
    const validPayload = {
      branchId: '123e4567-e89b-42d3-a456-426614174000',
      addressText: 'Test Mah. 123 Sk. No: 5',
      paymentMethod: 'cash',
      items: [
        {
          id: '123e4567-e89b-42d3-a456-426614174001',
          name: 'Pizza',
          price: 120,
          quantity: 2,
        },
      ],
    } satisfies z.infer<typeof orderCreateRequestSchema>;

    expect(orderCreateRequestSchema.safeParse(validPayload).success).toBe(true);
    expect(orderCreateRequestSchema.safeParse({ ...validPayload, items: [] }).success).toBe(false);
    expect(
      orderCreateRequestSchema.safeParse({
        ...validPayload,
        paymentMethod: 'crypto',
      }).success,
    ).toBe(false);
  });

  it('documents order detail response shape including timeline events', () => {
    const responseExample = {
      id: '123e4567-e89b-42d3-a456-426614174010',
      status: 'preparing',
      customerId: '123e4567-e89b-42d3-a456-426614174020',
      branchId: '123e4567-e89b-42d3-a456-426614174000',
      courierId: null,
      total: 240,
      items: [
        {
          id: '123e4567-e89b-42d3-a456-426614174030',
          name: 'Pizza',
          qty: 2,
          unitPrice: 120,
        },
      ],
      events: [
        {
          status: 'pending',
          actor: 'system',
          timestamp: '2025-01-01T10:00:00Z',
        },
        {
          status: 'preparing',
          actor: 'vendor',
          timestamp: '2025-01-01T10:05:00Z',
        },
      ],
    } satisfies z.infer<typeof orderResponseSchema>;

    expect(orderResponseSchema.parse(responseExample)).toBeTruthy();
    expect(() =>
      orderResponseSchema.parse({
        ...responseExample,
        status: 'unknown',
      }),
    ).toThrow();
  });

  it('restricts state transitions to allowed statuses', () => {
    expect(
      orderTransitionRequestSchema.safeParse({
        targetStatus: 'ready',
      }).success,
    ).toBe(true);

    expect(
      orderTransitionRequestSchema.safeParse({
        targetStatus: 'archived',
      }).success,
    ).toBe(false);
  });
});
