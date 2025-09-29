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
});