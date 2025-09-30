import { createClient } from 'lib/supabase/server';

import type { ComponentProps } from 'react';

type VendorProduct = {
  id: string;
  name: string;
  price: number;
  currency: string;
};

type VendorCategory = {
  id: string;
  name: string;
  products: VendorProduct[];
};

type Vendor = {
  id: string;
  name: string;
  categories: VendorCategory[] | null;
};

// TODO: Replace with shadcn/ui components
const Card = (props: ComponentProps<'div'>) => <div {...props} />;
const Button = (props: ComponentProps<'button'>) => <button {...props} />;

export default async function VendorMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createClient();

  if (!supabase) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-center text-sm text-gray-500">
          Supabase yapılandırması bulunamadığı için işletme menüsü yüklenemiyor.
        </p>
      </div>
    );
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('*, categories(*, products(*))')
    .eq('id', slug) // Assuming slug is the vendor ID for now
    .single<Vendor>();

  if (!vendor) {
    return <div>Vendor not found</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <header className="my-8">
        <h1 className="text-4xl font-bold">{vendor.name}</h1>
        {/* Add more vendor details here */}
      </header>

      <main>
        {vendor.categories?.map((category) => (
          <div key={category.id} className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{category.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.products.map((product) => (
                <Card key={product.id} className="border rounded-lg p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{product.name}</h3>
                    <p className="text-lg">{product.price} {product.currency}</p>
                  </div>
                  <Button className="mt-4 bg-blue-500 text-white p-2 rounded">Sepete Ekle</Button>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
