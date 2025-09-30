import { describe, expect, it, vi } from "vitest";

import { canAccess, getCourierAuthContext, getVendorAuthContext } from "lib/rbac";

describe("RBAC", () => {
  it("denies access without role", () => {
    const ok = canAccess({
      role: null,
      userId: "u1",
      resource: { type: "order", ownerUserId: "u1" },
      action: "read",
    });
    expect(ok).toBe(false);
  });

  it("allows customer to read own order", () => {
    const ok = canAccess({
      role: "customer",
      userId: "u1",
      resource: { type: "order", ownerUserId: "u1" },
      action: "read",
    });
    expect(ok).toBe(true);
  });

  it("allows vendor admin to access only matched vendor orders", () => {
    const ok = canAccess({
      role: "vendor_admin",
      userId: "u2",
      vendorIds: ["vendor-1", "vendor-2"],
      resource: {
        type: "order",
        ownerUserId: "u1",
        vendorId: "vendor-2",
      },
      action: "read",
    });
    expect(ok).toBe(true);
  });

  it("denies vendor admin access for other vendors", () => {
    const ok = canAccess({
      role: "vendor_admin",
      userId: "u2",
      vendorIds: ["vendor-3"],
      resource: {
        type: "order",
        ownerUserId: "u1",
        vendorId: "vendor-2",
      },
      action: "update",
    });
    expect(ok).toBe(false);
  });

  it("allows courier to manage assigned order", () => {
    const ok = canAccess({
      role: "courier",
      userId: "courier-user", // kullanılmamalı
      courierId: "courier-1",
      resource: {
        type: "order",
        ownerUserId: "customer-1",
        courierId: "courier-1",
      },
      action: "update",
    });
    expect(ok).toBe(true);
  });

  it("denies courier access to unassigned order", () => {
    const ok = canAccess({
      role: "courier",
      userId: "courier-user",
      courierId: "courier-2",
      resource: {
        type: "order",
        ownerUserId: "customer-1",
        courierId: "courier-1",
      },
      action: "read",
    });
    expect(ok).toBe(false);
  });
});

describe("getVendorAuthContext", () => {
  it("prefers vendor IDs from JWT claims", async () => {
    const fromMock = vi.fn();
    const ctx = await getVendorAuthContext({
      jwtClaims: { vendor_ids: ["vendor-1", "vendor-1", "vendor-2"] },
      supabase: { from: fromMock } as any,
    });
    expect(ctx.vendorIds).toEqual(["vendor-1", "vendor-2"]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("falls back to Supabase query when claims empty", async () => {
    const eqMock = vi.fn().mockResolvedValue({
      data: [
        { id: "vendor-db-1" },
        { id: "vendor-db-2" },
      ],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    const ctx = await getVendorAuthContext({
      supabase: { from: fromMock } as any,
      userId: "user-1",
    });

    expect(fromMock).toHaveBeenCalledWith("vendors");
    expect(selectMock).toHaveBeenCalledWith("id");
    expect(eqMock).toHaveBeenCalledWith("owner_user_id", "user-1");
    expect(ctx.vendorIds).toEqual(["vendor-db-1", "vendor-db-2"]);
  });

  it("returns empty list when no data", async () => {
    const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    const ctx = await getVendorAuthContext({
      supabase: { from: fromMock } as any,
      userId: "user-1",
    });

    expect(ctx.vendorIds).toEqual([]);
  });
});

describe("getCourierAuthContext", () => {
  it("returns courier ID from Supabase", async () => {
    const eqMock = vi.fn().mockResolvedValue({
      data: [{ id: "courier-db-1" }],
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    const ctx = await getCourierAuthContext({
      supabase: { from: fromMock } as any,
      userId: "user-1",
    });

    expect(fromMock).toHaveBeenCalledWith("couriers");
    expect(selectMock).toHaveBeenCalledWith("id");
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-1");
    expect(ctx.courierId).toBe("courier-db-1");
  });

  it("returns null when courier not found", async () => {
    const eqMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    const ctx = await getCourierAuthContext({
      supabase: { from: fromMock } as any,
      userId: "user-1",
    });

    expect(ctx.courierId).toBeNull();
  });

  it("returns null without Supabase client or user ID", async () => {
    const ctx = await getCourierAuthContext();
    expect(ctx.courierId).toBeNull();
  });
});
