import { createClient } from 'lib/supabase/server';
import { cookies } from 'next/headers';

import type { ComponentProps } from 'react';

// TODO: Replace with shadcn/ui components
const Select = (props: ComponentProps<'select'>) => <select {...props} />;
const Input = (props: ComponentProps<'input'>) => <input {...props} />;
const Card = (props: ComponentProps<'div'>) => <div {...props} />;

export default async function Home() {
  const cookieStore = cookies();
  const supabase = createClient();

  const { data: cities } = await supabase.from('cities').select('*');
  const { data: vendors } = await supabase.from('vendors').select('*').limit(10);

  return (
    <div className="container mx-auto p-4">
      <header className="text-center my-8">
        <h1 className="text-4xl font-bold">Kapgel</h1>
        <p className="text-lg text-gray-600">Gönder Gelsin</p>
      </header>

      <div className="flex justify-center gap-4 my-8">
        <Select className="p-2 border rounded">
          <option value="">Şehir Seçin</option>
          {cities?.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </Select>
        <Input type="search" placeholder="Restoran veya market arayın..." className="p-2 border rounded w-1/2" />
      </div>

      <main>
        <h2 className="text-2xl font-semibold mb-4">Öne Çıkan İşletmeler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors?.map((vendor) => (
            <Card key={vendor.id} className="border rounded-lg p-4">
              <h3 className="text-xl font-bold">{vendor.name}</h3>
              {/* Add more vendor details here */}
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}