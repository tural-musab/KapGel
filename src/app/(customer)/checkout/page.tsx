'use client';

import { useCartStore } from 'lib/cart-store';

// TODO: Replace with shadcn/ui components
const Card = ({ children, ...props }) => <div {...props}>{children}</div>;
const Button = ({ children, ...props }) => <button {...props}>{children}</button>;
const Input = (props) => <input {...props} />;
const Label = (props) => <label {...props} />;

export default function CheckoutPage() {
  const { items, removeItem, clearCart } = useCartStore();

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handlePlaceOrder = () => {
    // TODO: Implement order creation logic (T019)
    alert('Siparişiniz alındı!');
    clearCart();
  };

  return (
    <div className="container mx-auto p-4">
      <header className="my-8">
        <h1 className="text-4xl font-bold">Checkout</h1>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Sipariş Özeti</h2>
          <Card className="border rounded-lg p-4">
            {items.length === 0 ? (
              <p>Sepetiniz boş.</p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id} className="flex justify-between items-center mb-2">
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p>{item.quantity} x {item.price} TL</p>
                    </div>
                    <Button onClick={() => removeItem(item.id)} className="text-red-500">Kaldır</Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 pt-4 border-t">
              <p className="text-lg font-bold flex justify-between">
                <span>Toplam:</span>
                <span>{total} TL</span>
              </p>
            </div>
          </Card>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Teslimat Bilgileri</h2>
          <form className="space-y-4">
            <div>
              <Label htmlFor="address">Adres</Label>
              <Input id="address" type="text" placeholder="Teslimat adresi" className="w-full p-2 border rounded" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Ödeme Yöntemi</h3>
              <div className="flex gap-4 mt-2">
                <Label className="flex items-center gap-2">
                  <Input type="radio" name="payment" value="cash" defaultChecked />
                  Kapıda Nakit
                </Label>
                <Label className="flex items-center gap-2">
                  <Input type="radio" name="payment" value="card_on_pickup" />
                  Gel-Al&apos;da Kart
                </Label>
              </div>
            </div>
            <Button type="button" onClick={handlePlaceOrder} className="w-full bg-green-500 text-white p-2 rounded">
              Siparişi Tamamla
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
