import { createClient } from 'lib/supabase/server';
import { cookies } from 'next/headers';

// TODO: Replace with shadcn/ui components
const Card = ({ children, ...props }) => <div {...props}>{children}</div>;

export default async function OrderTrackingPage({ params }) {
  const cookieStore = cookies();
  const supabase = createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(*, products(*))')
    .eq('id', params.id)
    .single();

  if (!order) {
    return <div>Order not found</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <header className="my-8">
        <h1 className="text-4xl font-bold">Sipariş Takibi</h1>
        <p>Sipariş ID: {order.id}</p>
      </header>

      <main>
        <Card className="border rounded-lg p-4">
          <h2 className="text-2xl font-semibold mb-4">Sipariş Durumu: {order.status}</h2>
          {/* TODO: Add a map component to show courier location */}
        </Card>

        <Card className="border rounded-lg p-4 mt-8">
          <h2 className="text-2xl font-semibold mb-4">Sipariş Detayları</h2>
          <ul>
            {order.order_items.map((item) => (
              <li key={item.id} className="flex justify-between items-center mb-2">
                <div>
                  <p className="font-bold">{item.products.name}</p>
                  <p>{item.qty} x {item.unit_price} TL</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t">
            <p className="text-lg font-bold flex justify-between">
              <span>Toplam:</span>
              <span>{order.total} TL</span>
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
