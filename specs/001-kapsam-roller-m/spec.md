# Feature Specification: Full-Stack Order and Delivery Platform MVP

**Feature Branch**: `001-kapsam-roller-m`
**Created**: 2025-09-29
**Status**: Draft
**Input**: User description: "Kapsam: - Roller: müşteri, vendor admin, kurye, admin. - Akışlar: 1) Müşteri: menü → sepet → checkout → (teslimat|gel-al) → canlı takip. 2) Vendor: siparişi onayla → hazırlık → kurye ata → teslim edildi işaretle. 3) Kurye: vardiya aç/kapat → görev al → yola çıktı/teslim etti + konum paylaş. - Kısıtlar: - Sadece PWA (iOS/Android native yok). - MVP ödeme: kapıda veya gel-alde ödeme. - Harita/adres: MapLibre + OSM; adres arama server proxy. - Bildirim: Web Push (VAPID); iOS izin uyarısı. - Çıktılar: - Next.js 15 + TS + Tailwind + shadcn iskeleti. - Supabase şema + RLS + seed. - Vendor ve kurye panelleri ilk sürüm. - Sipariş durum makinesi ve gerçek zamanlı takip."

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a customer, I want to browse a vendor's menu, add items to my cart, place an order for delivery or pickup, and track my order in real-time.

As a vendor, I want to manage incoming orders, assign them to couriers, and track their status until completion.

As a courier, I want to manage my availability, accept delivery tasks, and update my status and location throughout the delivery process.

### Acceptance Scenarios
1.  **Given** a customer is viewing a vendor's menu, **When** they add items to their cart and complete the checkout process, **Then** they MUST be able to place an order for either "delivery" or "pickup".
2.  **Given** a customer has placed an order, **When** a vendor or courier updates the order status, **Then** the customer MUST see the status change in real-time on a live tracking page.
3.  **Given** a vendor receives a new order, **When** they approve the order and assign a courier, **Then** the assigned courier MUST receive a notification for the new delivery task.
4.  **Given** a courier accepts a delivery task, **When** they update their status (e.g., "On the way", "Delivered"), **Then** the order status MUST be updated in real-time for both the customer and the vendor.

### Edge Cases
- What happens if a courier loses their connection while their location is being shared?
- How does the system handle a customer attempting to cancel an order after it has been prepared?
- What is the process for a vendor to reject a new order?

---

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: The system MUST support four distinct user roles: `customer`, `vendor admin`, `courier`, and `system admin`.
- **FR-002**: The system MUST provide dedicated web panels for `vendor admin` and `courier` roles.
- **FR-003**: Customers MUST be able to choose between "delivery" and "pickup" at checkout.
- **FR-004**: The system MUST provide a real-time order tracking page for customers.
- **FR-005**: Couriers MUST be able to share their location in real-time while actively on a delivery.
- **FR-006**: For the MVP, the system MUST only support "cash on delivery" and "pay on pickup" payment methods.
- **FR-007**: The application MUST be a Progressive Web App (PWA) and not a native iOS/Android application.
- **FR-008**: The system MUST use Web Push (VAPID) for notifications and display appropriate permission warnings on iOS.
- **FR-009**: All map and address-related features MUST use MapLibre and OpenStreetMap, with address searches proxied through the server.
- **FR-010**: The system MUST implement a state machine to manage order statuses throughout the entire lifecycle.

### Key Entities *(include if feature involves data)*
- **User**: Represents an actor in the system with an assigned role (`customer`, `vendor admin`, `courier`, `admin`).
- **Order**: Represents a customer's request, containing a list of items, delivery/pickup choice, status, and associated user/courier.
- **Vendor**: Represents a business with a menu of products that customers can order from.
- **Courier**: Represents a user responsible for delivering orders.
- **Menu Item**: Represents a single product offered by a Vendor.

### Technical Constraints
- **TC-001**: The frontend and backend MUST be built as a monolithic application using Next.js 15.
- **TC-002**: The technology stack is defined as TypeScript, Tailwind CSS, and shadcn/ui.
- **TC-003**: The database MUST be Supabase, with a defined schema, Row Level Security (RLS) policies, and seed data.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [X] No implementation details (languages, frameworks, APIs) in non-technical sections.
- [X] Focused on user value and business needs.
- [X] Written for non-technical stakeholders.
- [X] All mandatory sections completed.

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain.
- [X] Requirements are testable and unambiguous.
- [X] Success criteria are measurable.
- [X] Scope is clearly bounded.
- [X] Dependencies and assumptions identified.