import { createClient } from 'lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();

  if (!supabase) {
    return new NextResponse('Supabase is not configured', { status: 500 });
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { items, branchId, addressText, paymentMethod } = await request.json();

  if (!items || !branchId || !addressText || !paymentMethod) {
    return new NextResponse('Missing required fields', { status: 400 });
  }

  interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }

  const itemsTotal = items.reduce((acc: number, item: CartItem) => acc + item.price * item.quantity, 0);
  const total = itemsTotal; // Assuming no delivery fee for now

  const orderItems = items.map((item: CartItem) => ({
    product_id: item.id,
    name_snapshot: item.name,
    unit_price: item.price,
    qty: item.quantity,
    total: item.price * item.quantity,
  }));
  const { data, error } = await supabase.rpc('create_order_with_items', {
    order_input: {
      customer_id: user.id,
      branch_id: branchId,
      address_text: addressText,
      payment_method: paymentMethod,
      items_total: itemsTotal,
      total,
      type: 'delivery',
    },
    items_input: orderItems,
  });

  if (error) {
    console.error('Error creating order with items:', error);
    const errorMessage = error.message || 'Failed to create order';
    return new NextResponse(errorMessage, { status: 500 });
  }

  const order = Array.isArray(data) ? data[0] : data;

  if (!order) {
    console.error('Supabase did not return an order payload');
    return new NextResponse('Failed to create order', { status: 500 });
  }

  return NextResponse.json(order);
}
