import { canAccess } from "lib/rbac";

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

  it("allows courier to manage assigned order", () => {
    const readOk = canAccess({
      role: "courier",
      courierId: "c1",
      resource: { type: "order", ownerUserId: "u99", courierId: "c1" },
      action: "read",
    });

    const updateOk = canAccess({
      role: "courier",
      courierId: "c1",
      resource: { type: "order", ownerUserId: "u99", courierId: "c1" },
      action: "update",
    });

    expect(readOk).toBe(true);
    expect(updateOk).toBe(true);
  });

  it("denies courier access to unassigned order", () => {
    const readOk = canAccess({
      role: "courier",
      courierId: "c1",
      resource: { type: "order", ownerUserId: "u99", courierId: "c2" },
      action: "read",
    });

    const transitionOk = canAccess({
      role: "courier",
      courierId: "c1",
      resource: { type: "order", ownerUserId: "u99", courierId: "c2" },
      action: "transition",
    });

    expect(readOk).toBe(false);
    expect(transitionOk).toBe(false);
  });
});