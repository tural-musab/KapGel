import { createClient } from 'lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient();

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

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      customer_id: user.id,
      branch_id: branchId,
      address_text: addressText,
      payment_method: paymentMethod,
      items_total: itemsTotal,
      total: total,
      type: 'delivery', // Assuming delivery for now
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating order:', error);
    return new NextResponse('Error creating order', { status: 500 });
  }

  const orderItems = items.map((item: CartItem) => ({
    order_id: order.id,
    product_id: item.id,
    name_snapshot: item.name,
    unit_price: item.price,
    qty: item.quantity,
    total: item.price * item.quantity,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

  if (itemsError) {
    console.error('Error creating order items:', itemsError);
    // TODO: Handle rollback
    return new NextResponse('Error creating order items', { status: 500 });
  }

  return NextResponse.json(order);
}
