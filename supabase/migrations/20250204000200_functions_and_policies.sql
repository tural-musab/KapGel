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
  order_items_total numeric := coalesce((order_input->>'items_total')::numeric, 0);
  order_total numeric := coalesce((order_input->>'total')::numeric, 0);
  order_delivery_fee numeric := coalesce((order_input->>'delivery_fee')::numeric, 0);
begin
  if order_input is null then
    raise exception 'order_input cannot be null';
  end if;

  if items_input is null or jsonb_typeof(items_input) <> 'array' or jsonb_array_length(items_input) = 0 then
    raise exception 'items_input must be a non-empty array';
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
    (order_input->>'customer_id')::uuid,
    (order_input->>'branch_id')::uuid,
    nullif(order_input->>'courier_id', '')::uuid,
    order_input->>'address_text',
    case
      when nullif(order_input->>'geo_point', '') is null then null
      else nullif(order_input->>'geo_point', '')::geography
    end,
    (order_input->>'payment_method')::public.payment_method,
    order_items_total,
    order_delivery_fee,
    order_total,
    (order_input->>'type')::public.order_type
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

create policy "Vendor admins can manage their couriers" on public.couriers for all using (
  vendor_id = (
    select vendor_id from public.branches where id in (
      select branch_id from public.orders where courier_id = public.couriers.id
    ) limit 1
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
