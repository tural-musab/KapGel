# Components Directory (Planned)

This folder contains shared React components that can be reused across the KapGel MVP.

## Dashboard primitives (`./ui/dashboard`)

- `DashboardStatCard` – gradient metrik kartları; vendor ve courier panellerinde tekrar kullanılabilir.
- `OrderStatusBadge` – sipariş durumlarını tutarlı rozetlerle gösterir.
- `OrderActionButton` – sipariş akışındaki eylemler için tek tip buton stili sağlar.
- `OrderTimeline` – dikey durum akışı bileşeni; müşteri takibi veya dashboardlarda kullanılabilir.

## Planned additions

- Map display primitives (MapLibre wrappers, delivery zone overlays).
- Push notification helpers (subscription prompts, VAPID key integration).
- PWA affordances (install banners, offline state indicators).

Yeni bileşenler eklerken bu dosyayı güncelleyerek sorumluluklarını özetleyin ki ekip arkadaşları paylaşılan yüzeyi kolayca keşfedebilsin.
