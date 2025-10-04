import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const vendorOrderStatus = z.enum(['pending', 'preparing', 'ready', 'delivered', 'cancelled']);

const vendorOrderSummarySchema = z.object({
  id: z.string().uuid(),
  status: vendorOrderStatus,
  customerName: z.string().min(1),
  items: z.number().int().nonnegative(),
  total: z.number().nonnegative(),
  placedAt: z.string().datetime({ offset: true }),
});

const vendorOrdersResponseSchema = z.object({
  data: z.array(vendorOrderSummarySchema),
  nextCursor: z.string().nullable().optional(),
});

const vendorOrderTransitionSchema = z
  .object({
    status: z.enum(['preparing', 'ready', 'cancelled']),
    reason: z.string().min(3).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'cancelled' && !value.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'Cancellation requires a reason',
      });
    }
  });

const menuItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  currency: z.enum(['TRY', 'AZN']),
  isActive: z.boolean(),
  description: z.string().optional(),
});

const vendorMenuResponseSchema = z.object({
  categories: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      items: z.array(menuItemSchema),
    }),
  ),
});

const menuItemCreateSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  currency: z.enum(['TRY', 'AZN']),
  isActive: z.boolean(),
});

const menuItemUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  description: z.string().optional(),
});

describe('Vendor API contract', () => {
  it('describes paginated vendor order listing payloads', () => {
    const responseExample = {
      data: [
        {
          id: '123e4567-e89b-42d3-a456-426614174040',
          status: 'pending',
          customerName: 'Ada Lovelace',
          items: 3,
          total: 420,
          placedAt: '2025-01-01T09:45:00Z',
        },
      ],
      nextCursor: null,
    } satisfies z.infer<typeof vendorOrdersResponseSchema>;

    expect(() => vendorOrdersResponseSchema.parse(responseExample)).not.toThrow();
    expect(() =>
      vendorOrdersResponseSchema.parse({
        ...responseExample,
        data: [{ ...responseExample.data[0], status: 'unknown' }],
      }),
    ).toThrow();
  });

  it('restricts vendor order transitions and requires justification for cancellations', () => {
    expect(
      vendorOrderTransitionSchema.safeParse({
        status: 'ready',
      }).success,
    ).toBe(true);

    const cancellation = vendorOrderTransitionSchema.safeParse({
      status: 'cancelled',
      reason: 'Out of stock',
    });
    expect(cancellation.success).toBe(true);

    expect(
      vendorOrderTransitionSchema.safeParse({
        status: 'cancelled',
      }).success,
    ).toBe(false);
  });

  it('validates menu CRUD payloads and responses', () => {
    const responseExample = {
      categories: [
        {
          id: '123e4567-e89b-42d3-a456-426614174050',
          name: 'Pizzalar',
          items: [
            {
              id: '123e4567-e89b-42d3-a456-426614174051',
              name: 'Margherita',
              price: 150,
              currency: 'TRY',
              isActive: true,
            },
          ],
        },
      ],
    } satisfies z.infer<typeof vendorMenuResponseSchema>;

    expect(() => vendorMenuResponseSchema.parse(responseExample)).not.toThrow();

    const createPayload = {
      categoryId: '123e4567-e89b-42d3-a456-426614174050',
      name: 'New Item',
      description: 'Özel soslu',
      price: 90,
      currency: 'AZN',
      isActive: true,
    } satisfies z.infer<typeof menuItemCreateSchema>;

    expect(menuItemCreateSchema.safeParse(createPayload).success).toBe(true);
    expect(menuItemCreateSchema.safeParse({ ...createPayload, price: -10 }).success).toBe(false);

    const updatePayload = {
      price: 110,
      isActive: false,
    } satisfies z.infer<typeof menuItemUpdateSchema>;

    expect(menuItemUpdateSchema.safeParse(updatePayload).success).toBe(true);
    expect(menuItemUpdateSchema.safeParse({ price: -1 }).success).toBe(false);
  });
});
