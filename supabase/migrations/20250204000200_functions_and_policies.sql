-- Helper functions
create or replace function public.get_my_role()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return (
    select role from public.users where id = auth.uid()
  );
end;
$$;

create or replace function public.create_order_with_items(
  order_input jsonb,
  items_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order public.orders;
  inserted_items jsonb := '[]'::jsonb;
  order_items_total numeric := nullif(order_input->>'items_total', '')::numeric;
  order_total numeric := nullif(order_input->>'total', '')::numeric;
  order_delivery_fee numeric := coalesce(nullif(order_input->>'delivery_fee', '')::numeric, 0);
  requested_customer_id uuid := nullif(order_input->>'customer_id', '')::uuid;
  authenticated_customer_id uuid := auth.uid();
  caller_role text := public.get_my_role();
  sanitized_courier_id uuid := null;
  sanitized_branch_id uuid := nullif(order_input->>'branch_id', '')::uuid;
  branch_vendor_id uuid;
  courier_vendor_id uuid;
  calculated_items_total numeric := 0;
  calculated_order_total numeric := 0;
  sanitized_payment_method public.payment_method;
  sanitized_order_type public.order_type;
  sanitized_address text := nullif(order_input->>'address_text', '');
  sanitized_geo geography := null;
  item_record jsonb;
  item_unit_price numeric;
  item_qty integer;
  item_total numeric;
  provided_item_total numeric;
  mismatch_tolerance numeric := 0.01;
begin
  if order_input is null then
    raise exception 'order_input cannot be null';
  end if;

  if items_input is null or jsonb_typeof(items_input) <> 'array' or jsonb_array_length(items_input) = 0 then
    raise exception 'items_input must be a non-empty array';
  end if;

  if authenticated_customer_id is null then
    raise exception 'Authenticated user required to create order';
  end if;

  if requested_customer_id is not null and requested_customer_id <> authenticated_customer_id then
    raise exception 'customer_id mismatch between payload and auth context';
  end if;

  if sanitized_branch_id is null then
    raise exception 'branch_id is required to create order';
  end if;

  select vendor_id into branch_vendor_id from public.branches where id = sanitized_branch_id;

  if branch_vendor_id is null then
    raise exception 'Invalid branch_id supplied';
  end if;

  if sanitized_address is null then
    raise exception 'address_text is required';
  end if;

  if nullif(order_input->>'payment_method', '') is null then
    raise exception 'payment_method is required';
  end if;

  sanitized_payment_method := (order_input->>'payment_method')::public.payment_method;

  if nullif(order_input->>'type', '') is null then
    raise exception 'type is required';
  end if;

  sanitized_order_type := (order_input->>'type')::public.order_type;

  if order_delivery_fee < 0 then
    raise exception 'delivery_fee cannot be negative';
  end if;

  for item_record in
    select value from jsonb_array_elements(items_input) as item(value)
  loop
    if nullif(item_record->>'product_id', '') is null then
      raise exception 'Each order item must include product_id';
    end if;

    item_unit_price := (item_record->>'unit_price')::numeric;
    item_qty := (item_record->>'qty')::integer;

    if item_unit_price < 0 then
      raise exception 'Item unit_price cannot be negative';
    end if;

    if item_qty <= 0 then
      raise exception 'Item qty must be greater than zero';
    end if;

    item_total := item_unit_price * item_qty;

    if item_record ? 'total' then
      provided_item_total := (item_record->>'total')::numeric;

      if abs(provided_item_total - item_total) > mismatch_tolerance then
        raise exception 'Item total does not match unit_price * qty';
      end if;
    end if;

    calculated_items_total := calculated_items_total + item_total;
  end loop;

  if calculated_items_total <= 0 then
    raise exception 'Order must contain at least one item with a positive total';
  end if;

  order_items_total := calculated_items_total;
  calculated_order_total := calculated_items_total + order_delivery_fee;

  if order_total is not null and abs(order_total - calculated_order_total) > mismatch_tolerance then
    raise exception 'Order total must equal items_total + delivery_fee';
  end if;

  order_total := calculated_order_total;

  if caller_role is null then
    raise exception 'Unable to determine caller role';
  end if;

  if caller_role = 'customer' then
    if nullif(order_input->>'courier_id', '') is not null then
      raise exception 'Customers cannot assign courier_id';
    end if;
    sanitized_courier_id := null;
  elsif caller_role in ('vendor_admin', 'admin') then
    sanitized_courier_id := nullif(order_input->>'courier_id', '')::uuid;
  else
    if nullif(order_input->>'courier_id', '') is not null then
      raise exception 'Role % cannot assign courier_id', caller_role;
    end if;
    sanitized_courier_id := null;
  end if;

  if sanitized_courier_id is not null then
    select vendor_id into courier_vendor_id from public.couriers where id = sanitized_courier_id;

    if courier_vendor_id is null then
      raise exception 'Courier does not exist';
    end if;

    if courier_vendor_id <> branch_vendor_id then
      raise exception 'Courier does not belong to branch vendor';
    end if;
  end if;

  if nullif(order_input->>'geo_point', '') is not null then
    sanitized_geo := nullif(order_input->>'geo_point', '')::geography;
  end if;

  insert into public.orders (
    customer_id,
    branch_id,
    courier_id,
    address_text,
    geo_point,
    payment_method,
    items_total,
    delivery_fee,
    total,
    type
  )
  values (
    authenticated_customer_id,
    sanitized_branch_id,
    sanitized_courier_id,
    sanitized_address,
    sanitized_geo,
    sanitized_payment_method,
    order_items_total,
    order_delivery_fee,
    order_total,
    sanitized_order_type
  )
  returning * into new_order;

  with inserted as (
    insert into public.order_items (
      order_id,
      product_id,
      name_snapshot,
      unit_price,
      qty,
      total
    )
    select
      new_order.id,
      (item->>'product_id')::uuid,
      item->>'name_snapshot',
      (item->>'unit_price')::numeric,
      (item->>'qty')::integer,
      (item->>'total')::numeric
    from jsonb_array_elements(items_input) as item
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(inserted)), '[]'::jsonb)
  into inserted_items
  from inserted;

  return jsonb_build_object(
    'order', to_jsonb(new_order),
    'items', inserted_items
  );
exception
  when others then
    raise;
end;
$$;

-- Row Level Security policies
create policy "Users can view their own data" on public.users for select using (id = auth.uid());
create policy "Users can update their own data" on public.users for update using (id = auth.uid());

create policy "Admins can manage vendors" on public.vendors for all using (public.get_my_role() = 'admin');
create policy "Vendor admins can view their own vendor" on public.vendors for select using (owner_user_id = auth.uid());

create policy "Public can view branches" on public.branches for select using (true);
create policy "Vendor admins can manage their own branches" on public.branches for all using (
  (select owner_user_id from public.vendors where id = vendor_id) = auth.uid()
);

create policy "Customers can view their own orders" on public.orders for select using (customer_id = auth.uid());
create policy "Vendor admins can view their branch orders" on public.orders for select using (
  exists (
    select 1
    from public.branches b
    join public.vendors v on v.id = b.vendor_id
    where b.id = branch_id
      and v.owner_user_id = auth.uid()
  )
);
create policy "Vendor admins can update their branch orders" on public.orders for update using (
  exists (
    select 1
    from public.branches b
    join public.vendors v on v.id = b.vendor_id
    where b.id = branch_id
      and v.owner_user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.branches b
    join public.vendors v on v.id = b.vendor_id
    where b.id = branch_id
      and v.owner_user_id = auth.uid()
  )
);
create policy "Vendor admins can delete their branch orders" on public.orders for delete using (
  exists (
    select 1
    from public.branches b
    join public.vendors v on v.id = b.vendor_id
    where b.id = branch_id
      and v.owner_user_id = auth.uid()
  )
);
create policy "Couriers can view their assigned orders" on public.orders for select using (
  courier_id = (
    select id from public.couriers where user_id = auth.uid()
  )
);

create policy "Customers can view their order items" on public.order_items for select using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and o.customer_id = auth.uid()
  )
);

create policy "Vendor admins can view their branch order items" on public.order_items for select using (
  exists (
    select 1
    from public.orders o
    join public.branches b on b.id = o.branch_id
    join public.vendors v on v.id = b.vendor_id
    where o.id = order_id
      and v.owner_user_id = auth.uid()
  )
);

create policy "Couriers can view their assigned order items" on public.order_items for select using (
  exists (
    select 1
    from public.orders o
    join public.couriers c on c.id = o.courier_id
    where o.id = order_id
      and c.user_id = auth.uid()
  )
);

create policy "Vendor admins can manage their couriers" on public.couriers for all using (
  vendor_id in (
    select id from public.vendors where owner_user_id = auth.uid()
  )
) with check (
  vendor_id in (
    select id from public.vendors where owner_user_id = auth.uid()
  )
);

create policy "Public can view products" on public.products for select using (true);
create policy "Public can view categories" on public.categories for select using (true);
create policy "Vendor admins can manage their own products" on public.products for all using (
  vendor_id = (
    select id from public.vendors where owner_user_id = auth.uid()
  )
);
create policy "Vendor admins can manage their own categories" on public.categories for all using (
  vendor_id = (
    select id from public.vendors where owner_user_id = auth.uid()
  )
);
create policy "Vendor admins can manage their own inventories" on public.inventories for all using (
  branch_id in (
    select id from public.branches where vendor_id = (
      select id from public.vendors where owner_user_id = auth.uid()
    )
  )
);
