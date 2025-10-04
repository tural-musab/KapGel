'use client';

import { useCartStore } from 'lib/cart-store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { ComponentProps } from 'react';

const Card = (props: ComponentProps<'div'>) => <div {...props} />;
const Button = (props: ComponentProps<'button'>) => <button {...props} />;
const Input = (props: ComponentProps<'input'>) => <input {...props} />;
const Label = (props: ComponentProps<'label'>) => <label {...props} />;
const Select = (props: ComponentProps<'select'>) => <select {...props} />;

export interface CheckoutBranchOption {
  id: string;
  name: string;
  vendorName?: string | null;
}

export interface CheckoutClientProps {
  branches: CheckoutBranchOption[];
  supabaseReady: boolean;
}

export function CheckoutClient({ branches, supabaseReady }: CheckoutClientProps) {
  const router = useRouter();
  const { items, removeItem, clearCart } = useCartStore();

  const [address, setAddress] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pickup_card'>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const total = items.reduce((acc: number, item: { price: number; quantity: number }) => acc + item.price * item.quantity, 0);

  const canSubmit = items.length > 0 && address.trim().length > 0 && branchId.trim().length > 0 && !submitting;

  const handlePlaceOrder = async () => {
    if (!canSubmit) {
      setErrorMessage('Lütfen tüm alanları doldurun ve sepetinizi kontrol edin.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branchId,
          addressText: address,
          paymentMethod,
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Sipariş oluşturulurken bir hata oluştu');
      }

      const payload = await response.json();
      const orderId = payload?.order?.id;

      clearCart();

      if (typeof orderId === 'string' && orderId.length > 0) {
        router.push(`/orders/${orderId}`);
      } else {
        setErrorMessage('Sipariş oluşturuldu ancak takip numarası alınamadı.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <header className="my-8">
        <h1 className="text-4xl font-bold">Checkout</h1>
        {!supabaseReady ? (
          <p className="mt-2 text-sm text-gray-500">Supabase bağlantısı olmadığı için örnek şube listesi gösteriliyor.</p>
        ) : null}
      </header>

      <main className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-2xl font-semibold">Sipariş Özeti</h2>
          <Card className="rounded-lg border p-4">
            {items.length === 0 ? (
              <p>Sepetiniz boş.</p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id} className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p>
                        {item.quantity} x {item.price} TL
                      </p>
                    </div>
                    <Button onClick={() => removeItem(item.id)} className="text-red-500">
                      Kaldır
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 border-t pt-4">
              <p className="flex justify-between text-lg font-bold">
                <span>Toplam:</span>
                <span>{total} TL</span>
              </p>
            </div>
          </Card>
        </div>

        <div>
          <h2 className="mb-4 text-2xl font-semibold">Teslimat Bilgileri</h2>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handlePlaceOrder();
            }}
          >
            <div>
              <Label htmlFor="branch">Şube</Label>
              <Select
                id="branch"
                className="w-full rounded border p-2"
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                required
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.vendorName ? `${branch.vendorName} · ${branch.name}` : branch.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="address">Adres</Label>
              <Input
                id="address"
                type="text"
                placeholder="Teslimat adresi"
                className="w-full rounded border p-2"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                required
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Ödeme Yöntemi</h3>
              <div className="mt-2 flex gap-4">
                <Label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={() => setPaymentMethod('cash')}
                  />
                  Kapıda Nakit
                </Label>
                <Label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="payment"
                    value="pickup_card"
                    checked={paymentMethod === 'pickup_card'}
                    onChange={() => setPaymentMethod('pickup_card')}
                  />
                  Gel-Al&apos;da Kart
                </Label>
              </div>
            </div>
            {errorMessage ? (
              <p className="text-sm text-red-600" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full rounded bg-green-500 p-2 text-white disabled:opacity-60"
              disabled={!canSubmit}
            >
              {submitting ? 'Sipariş gönderiliyor...' : 'Siparişi Tamamla'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
