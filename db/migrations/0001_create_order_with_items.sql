CREATE OR REPLACE FUNCTION public.create_order_with_items(
  order_input jsonb,
  items_input jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_order orders;
  inserted_items jsonb := '[]'::jsonb;
  order_items_total numeric := COALESCE((order_input->>'items_total')::numeric, 0);
  order_total numeric := COALESCE((order_input->>'total')::numeric, 0);
  order_delivery_fee numeric := COALESCE((order_input->>'delivery_fee')::numeric, 0);
BEGIN
  IF order_input IS NULL THEN
    RAISE EXCEPTION 'order_input cannot be null';
  END IF;

  IF items_input IS NULL OR jsonb_typeof(items_input) <> 'array' OR jsonb_array_length(items_input) = 0 THEN
    RAISE EXCEPTION 'items_input must be a non-empty array';
  END IF;

  INSERT INTO orders (
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
  VALUES (
    (order_input->>'customer_id')::uuid,
    (order_input->>'branch_id')::uuid,
    NULLIF(order_input->>'courier_id', '')::uuid,
    order_input->>'address_text',
    order_input->>'geo_point',
    (order_input->>'payment_method')::payment_method,
    order_items_total,
    order_delivery_fee,
    order_total,
    (order_input->>'type')::order_type
  )
  RETURNING * INTO new_order;

  WITH inserted AS (
    INSERT INTO order_items (
      order_id,
      product_id,
      name_snapshot,
      unit_price,
      qty,
      total
    )
    SELECT
      new_order.id,
      (item->>'product_id')::uuid,
      item->>'name_snapshot',
      (item->>'unit_price')::numeric,
      (item->>'qty')::integer,
      (item->>'total')::numeric
    FROM jsonb_array_elements(items_input) AS item
    RETURNING *
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(inserted)), '[]'::jsonb)
  INTO inserted_items
  FROM inserted;

  RETURN jsonb_build_object(
    'order', to_jsonb(new_order),
    'items', inserted_items
  );
EXCEPTION
  WHEN others THEN
    RAISE;
END;
$$;
