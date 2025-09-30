import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testVendorEmail = process.env.SUPABASE_TEST_VENDOR_EMAIL;
const testVendorPassword = process.env.SUPABASE_TEST_VENDOR_PASSWORD;

const shouldSkip = !supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !testVendorEmail || !testVendorPassword;

if (shouldSkip) {
  describe("Supabase RLS - vendor isolation", () => {
    it.skip("requires Supabase test credentials", () => {
      expect(true).toBe(true);
    });
  });
} else {
  describe("Supabase RLS - vendor isolation", () => {
    const admin = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const vendorClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const customerClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const courierClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const runId = randomUUID();
    const otherVendorEmail = `other-admin-${runId}@example.com`;
    const customerEmail = `customer-${runId}@example.com`;
    const customerPassword = `Customer-${runId}!Pass123`;
    const courierEmail = `courier-${runId}@example.com`;
    const courierPassword = `Courier-${runId}!Pass123`;

    let vendorUserId: string;
    let customerUserId: string;
    let courierUserId: string;
    let otherVendorBranchId: string;
    let otherVendorOrderId: string;
    let otherVendorProductId: string;
    let vendorBranchId: string;
    let vendorOrderId: string;
    let courierId: string;
    const createdUserIds: string[] = [];
    const createdVendorIds: string[] = [];
    const createdBranchIds: string[] = [];
    const createdOrderIds: string[] = [];
    const createdProductIds: string[] = [];
    const createdAuthUserIds: string[] = [];
    const createdCourierIds: string[] = [];

    beforeAll(async () => {
      // Ensure vendor test user exists and has proper role mapping
      let signIn = await vendorClient.auth.signInWithPassword({
        email: testVendorEmail!,
        password: testVendorPassword!,
      });

      if (signIn.error) {
        const { data, error } = await admin.auth.admin.createUser({
          email: testVendorEmail!,
          password: testVendorPassword!,
          email_confirm: true,
        });

        if (error || !data.user) {
          throw new Error(`Failed to create test vendor user: ${error?.message}`);
        }

        vendorUserId = data.user.id;
        createdUserIds.push(vendorUserId);
        const { error: vendorUserInsertError } = await admin.from("users").insert({
          id: vendorUserId,
          email: testVendorEmail,
          role: "vendor_admin",
        });

        if (vendorUserInsertError) {
          throw new Error(`Failed to create users row for vendor admin: ${vendorUserInsertError.message}`);
        }

        signIn = await vendorClient.auth.signInWithPassword({
          email: testVendorEmail!,
          password: testVendorPassword!,
        });

        if (signIn.error || !signIn.data.user || !signIn.data.session) {
          throw new Error(`Unable to sign in with test vendor user: ${signIn.error?.message}`);
        }
      } else if (!signIn.data.user || !signIn.data.session) {
        throw new Error("Vendor sign-in did not return a valid session");
      }

      vendorUserId = signIn.data.user.id;

      const { data: existingVendorUserRecord } = await admin
        .from("users")
        .select("id")
        .eq("id", vendorUserId);

      if (!existingVendorUserRecord || existingVendorUserRecord.length === 0) {
        const { error: vendorUserRowInsertError } = await admin.from("users").insert({
          id: vendorUserId,
          email: testVendorEmail,
          role: "vendor_admin",
        });

        if (vendorUserRowInsertError) {
          throw new Error(`Failed to insert vendor admin mapping: ${vendorUserRowInsertError.message}`);
        }
        if (!createdUserIds.includes(vendorUserId)) {
          createdUserIds.push(vendorUserId);
        }
      } else {
        const { error: vendorUserUpdateError } = await admin
          .from("users")
          .update({ role: "vendor_admin", email: testVendorEmail })
          .eq("id", vendorUserId);

        if (vendorUserUpdateError) {
          throw new Error(`Failed to sync vendor admin role: ${vendorUserUpdateError.message}`);
        }
      }

      const { error: sessionError } = await vendorClient.auth.setSession(signIn.data.session);

      if (sessionError) {
        throw new Error(`Failed to establish vendor session: ${sessionError.message}`);
      }

      const { data: vendor, error: vendorInsertError } = await admin
        .from("vendors")
        .insert({
          name: `Test Vendor ${runId}`,
          owner_user_id: vendorUserId,
          has_own_couriers: true,
          verified: true,
        })
        .select()
        .single();

      if (vendorInsertError) {
        throw new Error(`Failed to create vendor for test admin: ${vendorInsertError.message}`);
      }

      if (!vendor) {
        throw new Error("Failed to create vendor for test admin");
      }

      createdVendorIds.push(vendor.id);

      const { data: vendorBranch, error: vendorBranchInsertError } = await admin
        .from("branches")
        .insert({
          vendor_id: vendor.id,
          name: `Vendor Branch ${runId}`,
          address_text: "Vendor address",
        })
        .select()
        .single();

      if (vendorBranchInsertError) {
        throw new Error(`Failed to create vendor branch: ${vendorBranchInsertError.message}`);
      }

      if (!vendorBranch) {
        throw new Error("Failed to create vendor branch");
      }

      vendorBranchId = vendorBranch.id;
      createdBranchIds.push(vendorBranch.id);

      const { data: vendorProduct, error: vendorProductError } = await admin
        .from("products")
        .insert({
          vendor_id: vendor.id,
          name: `Vendor Product ${runId}`,
          price: 90,
        })
        .select()
        .single();

      if (vendorProductError) {
        throw new Error(`Failed to create vendor product: ${vendorProductError.message}`);
      }

      if (!vendorProduct) {
        throw new Error("Failed to create vendor product");
      }

      createdProductIds.push(vendorProduct.id);

      const { data: courierAuth, error: courierAuthError } = await admin.auth.admin.createUser({
        email: courierEmail,
        password: courierPassword,
        email_confirm: true,
      });

      if (courierAuthError || !courierAuth.user) {
        throw new Error(`Failed to create courier auth user: ${courierAuthError?.message}`);
      }

      courierUserId = courierAuth.user.id;
      createdAuthUserIds.push(courierUserId);

      const { data: courierUserRow, error: courierUserInsertError } = await admin
        .from("users")
        .insert({ id: courierUserId, role: "courier", email: courierEmail })
        .select()
        .single();

      if (courierUserInsertError) {
        throw new Error(`Failed to create courier user row: ${courierUserInsertError.message}`);
      }

      if (!courierUserRow) {
        throw new Error("Failed to create courier user row");
      }

      createdUserIds.push(courierUserRow.id);

      const { data: courierRow, error: courierInsertError } = await admin
        .from("couriers")
        .insert({
          vendor_id: vendor.id,
          user_id: courierUserId,
          is_active: true,
        })
        .select()
        .single();

      if (courierInsertError) {
        throw new Error(`Failed to create courier: ${courierInsertError.message}`);
      }

      if (!courierRow) {
        throw new Error("Failed to create courier");
      }

      courierId = courierRow.id;
      createdCourierIds.push(courierRow.id);

      const { data: courierSignInData, error: courierSignInError } = await courierClient.auth.signInWithPassword({
        email: courierEmail,
        password: courierPassword,
      });

      if (courierSignInError || !courierSignInData.user || !courierSignInData.session) {
        throw new Error(`Unable to sign in courier user: ${courierSignInError?.message}`);
      }

      const { error: courierSessionError } = await courierClient.auth.setSession(courierSignInData.session);

      if (courierSessionError) {
        throw new Error(`Failed to establish courier session: ${courierSessionError.message}`);
      }

      const { data: otherVendorUser, error: otherVendorUserError } = await admin
        .from("users")
        .insert({ role: "vendor_admin", email: otherVendorEmail })
        .select()
        .single();

      if (otherVendorUserError) {
        throw new Error(`Failed to create other vendor admin user: ${otherVendorUserError.message}`);
      }

      if (!otherVendorUser) {
        throw new Error("Failed to create other vendor admin user record");
      }
      createdUserIds.push(otherVendorUser.id);

      const { data: otherVendor, error: otherVendorInsertError } = await admin
        .from("vendors")
        .insert({
          name: `Other Vendor ${runId}`,
          owner_user_id: otherVendorUser.id,
          has_own_couriers: false,
          verified: true,
        })
        .select()
        .single();

      if (otherVendorInsertError) {
        throw new Error(`Failed to create other vendor: ${otherVendorInsertError.message}`);
      }

      if (!otherVendor) {
        throw new Error("Failed to create other vendor");
      }
      createdVendorIds.push(otherVendor.id);

      const { data: otherVendorProduct, error: otherVendorProductError } = await admin
        .from("products")
        .insert({
          vendor_id: otherVendor.id,
          name: `Other Vendor Product ${runId}`,
          price: 120,
        })
        .select()
        .single();

      if (otherVendorProductError) {
        throw new Error(`Failed to create other vendor product: ${otherVendorProductError.message}`);
      }

      if (!otherVendorProduct) {
        throw new Error("Failed to create other vendor product");
      }
      otherVendorProductId = otherVendorProduct.id;
      createdProductIds.push(otherVendorProduct.id);

      const { data: otherBranch, error: otherBranchInsertError } = await admin
        .from("branches")
        .insert({
          vendor_id: otherVendor.id,
          name: `Other Branch ${runId}`,
          address_text: "Test address",
        })
        .select()
        .single();

      if (otherBranchInsertError) {
        throw new Error(`Failed to create other vendor branch: ${otherBranchInsertError.message}`);
      }

      if (!otherBranch) {
        throw new Error("Failed to create other vendor branch");
      }
      otherVendorBranchId = otherBranch.id;
      createdBranchIds.push(otherBranch.id);

      const { data: customerAuth, error: customerAuthError } = await admin.auth.admin.createUser({
        email: customerEmail,
        password: customerPassword,
        email_confirm: true,
      });

      if (customerAuthError || !customerAuth.user) {
        throw new Error(`Failed to create customer auth user: ${customerAuthError?.message}`);
      }

      customerUserId = customerAuth.user.id;
      createdAuthUserIds.push(customerUserId);

      const { data: customerRow, error: customerInsertError } = await admin
        .from("users")
        .insert({ id: customerUserId, role: "customer", email: customerEmail })
        .select()
        .single();

      if (customerInsertError) {
        throw new Error(`Failed to create customer: ${customerInsertError.message}`);
      }

      if (!customerRow) {
        throw new Error("Failed to create customer user");
      }
      createdUserIds.push(customerRow.id);

      const { data: customerSignInData, error: customerSignInError } = await customerClient.auth.signInWithPassword({
        email: customerEmail,
        password: customerPassword,
      });

      if (customerSignInError || !customerSignInData.user || !customerSignInData.session) {
        throw new Error(`Unable to sign in customer user: ${customerSignInError?.message}`);
      }

      const { error: customerSessionError } = await customerClient.auth.setSession(customerSignInData.session);

      if (customerSessionError) {
        throw new Error(`Failed to establish customer session: ${customerSessionError.message}`);
      }

      const { data: vendorOrder, error: vendorOrderInsertError } = await admin
        .from("orders")
        .insert({
          branch_id: vendorBranchId,
          customer_id: customerRow.id,
          type: "delivery",
          items_total: 90,
          delivery_fee: 10,
          total: 100,
          payment_method: "cash",
          status: "NEW",
          courier_id: courierId,
        })
        .select()
        .single();

      if (vendorOrderInsertError) {
        throw new Error(`Failed to create vendor order: ${vendorOrderInsertError.message}`);
      }

      if (!vendorOrder) {
        throw new Error("Failed to create vendor order");
      }

      vendorOrderId = vendorOrder.id;
      createdOrderIds.push(vendorOrder.id);

      const { error: vendorOrderItemsInsertError } = await admin.from("order_items").insert({
        order_id: vendorOrder.id,
        product_id: vendorProduct.id,
        name_snapshot: vendorProduct.name,
        unit_price: 90,
        qty: 1,
        total: 90,
      });

      if (vendorOrderItemsInsertError) {
        throw new Error(`Failed to create vendor order items: ${vendorOrderItemsInsertError.message}`);
      }

      const { data: otherOrder, error: otherOrderInsertError } = await admin
        .from("orders")
        .insert({
          branch_id: otherBranch.id,
          customer_id: customerRow.id,
          type: "delivery",
          items_total: 120,
          delivery_fee: 20,
          total: 140,
          payment_method: "cash",
          status: "NEW",
        })
        .select()
        .single();

      if (otherOrderInsertError) {
        throw new Error(`Failed to create other vendor order: ${otherOrderInsertError.message}`);
      }

      if (!otherOrder) {
        throw new Error("Failed to create other vendor order");
      }
      otherVendorOrderId = otherOrder.id;
      createdOrderIds.push(otherOrder.id);

      const { error: otherOrderItemInsertError } = await admin.from("order_items").insert({
        order_id: otherOrder.id,
        product_id: otherVendorProduct.id,
        name_snapshot: otherVendorProduct.name,
        unit_price: 120,
        qty: 1,
        total: 120,
      });

      if (otherOrderItemInsertError) {
        throw new Error(`Failed to create other vendor order items: ${otherOrderItemInsertError.message}`);
      }
    });

  afterAll(async () => {
    if (createdOrderIds.length > 0) {
      await admin.from("orders").delete().in("id", createdOrderIds);
    }
    if (createdCourierIds.length > 0) {
      await admin.from("couriers").delete().in("id", createdCourierIds);
    }
    if (createdProductIds.length > 0) {
      await admin.from("products").delete().in("id", createdProductIds);
    }
    if (createdBranchIds.length > 0) {
      await admin.from("branches").delete().in("id", createdBranchIds);
    }
    if (createdVendorIds.length > 0) {
      await admin.from("vendors").delete().in("id", createdVendorIds);
    }
    if (createdUserIds.length > 0) {
      await admin.from("users").delete().in("id", createdUserIds);
    }
    if (createdAuthUserIds.length > 0) {
      await Promise.all(
        createdAuthUserIds.map(async (authUserId) => {
          await admin.auth.admin.deleteUser(authUserId);
        })
      );
    }
  });

  it("allows customers to view their own order items", async () => {
    const { data, error } = await customerClient
      .from("order_items")
      .select("id, order_id")
      .eq("order_id", vendorOrderId);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.order_id).toBe(vendorOrderId);
  });

  it("allows vendor admins to view order items for their branches", async () => {
    const { data, error } = await vendorClient
      .from("order_items")
      .select("id, order_id")
      .eq("order_id", vendorOrderId);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.order_id).toBe(vendorOrderId);
  });

  it("allows couriers to view order items for assigned orders", async () => {
    const { data, error } = await courierClient
      .from("order_items")
      .select("id, order_id")
      .eq("order_id", vendorOrderId);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.order_id).toBe(vendorOrderId);
  });

  it("denies access to other vendors' orders", async () => {
    const { data, error } = await vendorClient
      .from("orders")
      .select("id, branch_id")
      .eq("branch_id", otherVendorBranchId);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toHaveLength(0);
  });

  it("denies vendor admins from viewing other vendors' order items", async () => {
    const { data, error } = await vendorClient
      .from("order_items")
      .select("id")
      .eq("order_id", otherVendorOrderId);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toHaveLength(0);
  });

  it("denies couriers from viewing unassigned order items", async () => {
    const { data, error } = await courierClient
      .from("order_items")
      .select("id")
      .eq("order_id", otherVendorOrderId);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toHaveLength(0);
  });

  it("blocks updates on other vendors' orders", async () => {
    const { error } = await vendorClient
      .from("orders")
      .update({ status: "CONFIRMED" })
      .eq("id", otherVendorOrderId);

    expect(error?.message).toMatch(/row-level security/i);
  });

  it("blocks deletions on other vendors' orders", async () => {
    const { error } = await vendorClient.from("orders").delete().eq("id", otherVendorOrderId);

    expect(error?.message).toMatch(/row-level security/i);
  });

  it("prevents customers from spoofing customer_id via RPC", async () => {
    const { data, error } = await customerClient.rpc("create_order_with_items", {
      order_input: {
        customer_id: randomUUID(),
        branch_id: otherVendorBranchId,
        address_text: "Customer address",
        payment_method: "cash",
        items_total: 120,
        total: 120,
        type: "delivery",
      },
      items_input: [
        {
          product_id: otherVendorProductId,
          name_snapshot: "Other Vendor Product",
          unit_price: 120,
          qty: 1,
          total: 120,
        },
      ],
    });

    expect(data).toBeNull();
    expect(error?.message).toMatch(/customer_id mismatch/i);
  });

  it("prevents customers from assigning courier via RPC", async () => {
    const { data, error } = await customerClient.rpc("create_order_with_items", {
      order_input: {
        customer_id: customerUserId,
        branch_id: otherVendorBranchId,
        address_text: "Customer address",
        payment_method: "cash",
        items_total: 120,
        total: 120,
        type: "delivery",
        courier_id: randomUUID(),
      },
      items_input: [
        {
          product_id: otherVendorProductId,
          name_snapshot: "Other Vendor Product",
          unit_price: 120,
          qty: 1,
          total: 120,
        },
      ],
    });

    expect(data).toBeNull();
    expect(error?.message).toMatch(/Customers cannot assign courier_id/i);
  });
  });
}
