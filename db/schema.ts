export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type GeographyPoint = {
  type: 'Point';
  coordinates: [number, number];
  crs?: { type: string; properties: Record<string, unknown> } | null;
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          created_at: string | null;
          email: string | null;
          id: string;
          phone: string | null;
          role: 'customer' | 'vendor_admin' | 'courier' | 'admin';
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          id?: string;
          phone?: string | null;
          role: 'customer' | 'vendor_admin' | 'courier' | 'admin';
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          id?: string;
          phone?: string | null;
          role?: 'customer' | 'vendor_admin' | 'courier' | 'admin';
        };
        Relationships: [];
      };
      vendors: {
        Row: {
          has_own_couriers: boolean | null;
          id: string;
          is_pickup_enabled: boolean | null;
          name: string;
          owner_user_id: string | null;
          tax_no: string | null;
          verified: boolean | null;
        };
        Insert: {
          has_own_couriers?: boolean | null;
          id?: string;
          is_pickup_enabled?: boolean | null;
          name: string;
          owner_user_id?: string | null;
          tax_no?: string | null;
          verified?: boolean | null;
        };
        Update: {
          has_own_couriers?: boolean | null;
          id?: string;
          is_pickup_enabled?: boolean | null;
          name?: string;
          owner_user_id?: string | null;
          tax_no?: string | null;
          verified?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'vendors_owner_user_id_fkey';
            columns: ['owner_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      branches: {
        Row: {
          address_text: string | null;
          delivery_zone_geojson: Json | null;
          geo_point: GeographyPoint | null;
          id: string;
          name: string;
          phone: string | null;
          vendor_id: string | null;
        };
        Insert: {
          address_text?: string | null;
          delivery_zone_geojson?: Json | null;
          geo_point?: GeographyPoint | null;
          id?: string;
          name: string;
          phone?: string | null;
          vendor_id?: string | null;
        };
        Update: {
          address_text?: string | null;
          delivery_zone_geojson?: Json | null;
          geo_point?: GeographyPoint | null;
          id?: string;
          name?: string;
          phone?: string | null;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'branches_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      couriers: {
        Row: {
          id: string;
          is_active: boolean | null;
          shift_status: 'online' | 'offline' | null;
          user_id: string | null;
          vehicle_type: string | null;
          vendor_id: string | null;
        };
        Insert: {
          id?: string;
          is_active?: boolean | null;
          shift_status?: 'online' | 'offline' | null;
          user_id?: string | null;
          vehicle_type?: string | null;
          vendor_id?: string | null;
        };
        Update: {
          id?: string;
          is_active?: boolean | null;
          shift_status?: 'online' | 'offline' | null;
          user_id?: string | null;
          vehicle_type?: string | null;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'couriers_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'couriers_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          is_active: boolean | null;
          name: string;
          sort: number | null;
          vendor_id: string | null;
        };
        Insert: {
          id?: string;
          is_active?: boolean | null;
          name: string;
          sort?: number | null;
          vendor_id?: string | null;
        };
        Update: {
          id?: string;
          is_active?: boolean | null;
          name?: string;
          sort?: number | null;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      products: {
        Row: {
          category_id: string | null;
          currency: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          photo_url: string | null;
          price: string;
          vendor_id: string | null;
        };
        Insert: {
          category_id?: string | null;
          currency?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          photo_url?: string | null;
          price: string;
          vendor_id?: string | null;
        };
        Update: {
          category_id?: string | null;
          currency?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          photo_url?: string | null;
          price?: string;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'products_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      inventories: {
        Row: {
          branch_id: string | null;
          id: string;
          product_id: string | null;
          qty: number | null;
          stock_policy: 'infinite' | 'finite' | null;
        };
        Insert: {
          branch_id?: string | null;
          id?: string;
          product_id?: string | null;
          qty?: number | null;
          stock_policy?: 'infinite' | 'finite' | null;
        };
        Update: {
          branch_id?: string | null;
          id?: string;
          product_id?: string | null;
          qty?: number | null;
          stock_policy?: 'infinite' | 'finite' | null;
        };
        Relationships: [
          {
            foreignKeyName: 'inventories_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'inventories_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          address_text: string | null;
          branch_id: string | null;
          courier_id: string | null;
          created_at: string | null;
          customer_id: string | null;
          delivery_fee: string | null;
          geo_point: GeographyPoint | null;
          id: string;
          items_total: string;
          payment_method: Database['public']['Enums']['payment_method'];
          status: Database['public']['Enums']['order_status'] | null;
          total: string;
          type: Database['public']['Enums']['order_type'];
        };
        Insert: {
          address_text?: string | null;
          branch_id?: string | null;
          courier_id?: string | null;
          created_at?: string | null;
          customer_id?: string | null;
          delivery_fee?: string | null;
          geo_point?: GeographyPoint | null;
          id?: string;
          items_total: string;
          payment_method: Database['public']['Enums']['payment_method'];
          status?: Database['public']['Enums']['order_status'] | null;
          total: string;
          type: Database['public']['Enums']['order_type'];
        };
        Update: {
          address_text?: string | null;
          branch_id?: string | null;
          courier_id?: string | null;
          created_at?: string | null;
          customer_id?: string | null;
          delivery_fee?: string | null;
          geo_point?: GeographyPoint | null;
          id?: string;
          items_total?: string;
          payment_method?: Database['public']['Enums']['payment_method'];
          status?: Database['public']['Enums']['order_status'] | null;
          total?: string;
          type?: Database['public']['Enums']['order_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'orders_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_courier_id_fkey';
            columns: ['courier_id'];
            isOneToOne: false;
            referencedRelation: 'couriers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          name_snapshot: string;
          order_id: string | null;
          product_id: string | null;
          qty: number;
          total: string;
          unit_price: string;
        };
        Insert: {
          id?: string;
          name_snapshot: string;
          order_id?: string | null;
          product_id?: string | null;
          qty: number;
          total: string;
          unit_price: string;
        };
        Update: {
          id?: string;
          name_snapshot?: string;
          order_id?: string | null;
          product_id?: string | null;
          qty?: number;
          total?: string;
          unit_price?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          created_at: string | null;
          id: number;
          order_id: string | null;
          payload_json: Json | null;
          type: string;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          order_id?: string | null;
          payload_json?: Json | null;
          type: string;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          order_id?: string | null;
          payload_json?: Json | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          channel: Database['public']['Enums']['notification_channel'];
          id: string;
          is_active: boolean | null;
          token_or_addr: string;
          user_id: string | null;
        };
        Insert: {
          channel: Database['public']['Enums']['notification_channel'];
          id?: string;
          is_active?: boolean | null;
          token_or_addr: string;
          user_id?: string | null;
        };
        Update: {
          channel?: Database['public']['Enums']['notification_channel'];
          id?: string;
          is_active?: boolean | null;
          token_or_addr?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      plans: {
        Row: {
          id: string;
          name: string;
          price_monthly: string | null;
          revenue_threshold: string | null;
          type: Database['public']['Enums']['plan_type'];
        };
        Insert: {
          id?: string;
          name: string;
          price_monthly?: string | null;
          revenue_threshold?: string | null;
          type: Database['public']['Enums']['plan_type'];
        };
        Update: {
          id?: string;
          name?: string;
          price_monthly?: string | null;
          revenue_threshold?: string | null;
          type?: Database['public']['Enums']['plan_type'];
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          period_end: string | null;
          period_start: string | null;
          plan_id: string | null;
          status: string | null;
          vendor_id: string | null;
        };
        Insert: {
          id?: string;
          period_end?: string | null;
          period_start?: string | null;
          plan_id?: string | null;
          status?: string | null;
          vendor_id?: string | null;
        };
        Update: {
          id?: string;
          period_end?: string | null;
          period_start?: string | null;
          plan_id?: string | null;
          status?: string | null;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      courier_locations: {
        Row: {
          courier_id: string | null;
          id: number;
          order_id: string | null;
          position: GeographyPoint;
          updated_at: string | null;
        };
        Insert: {
          courier_id?: string | null;
          id?: number;
          order_id?: string | null;
          position: GeographyPoint;
          updated_at?: string | null;
        };
        Update: {
          courier_id?: string | null;
          id?: number;
          order_id?: string | null;
          position?: GeographyPoint;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'courier_locations_courier_id_fkey';
            columns: ['courier_id'];
            isOneToOne: false;
            referencedRelation: 'couriers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'courier_locations_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      cities: {
        Row: {
          id: number;
          name: string;
        };
        Insert: {
          id?: number;
          name: string;
        };
        Update: {
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      districts: {
        Row: {
          city_id: number | null;
          id: number;
          name: string;
        };
        Insert: {
          city_id?: number | null;
          id?: number;
          name: string;
        };
        Update: {
          city_id?: number | null;
          id?: number;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'districts_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
        ];
      };
      neighborhoods: {
        Row: {
          district_id: number | null;
          id: number;
          name: string;
        };
        Insert: {
          district_id?: number | null;
          id?: number;
          name: string;
        };
        Update: {
          district_id?: number | null;
          id?: number;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'neighborhoods_district_id_fkey';
            columns: ['district_id'];
            isOneToOne: false;
            referencedRelation: 'districts';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: never;
    Functions: {
      get_my_role: {
        Args: Record<string, never>;
        Returns: string | null;
      };
    };
    Enums: {
      notification_channel: 'webpush' | 'email' | 'sms';
      order_status:
        | 'NEW'
        | 'CONFIRMED'
        | 'PREPARING'
        | 'PICKED_UP'
        | 'ON_ROUTE'
        | 'DELIVERED'
        | 'REJECTED'
        | 'CANCELED_BY_USER'
        | 'CANCELED_BY_VENDOR';
      order_type: 'delivery' | 'pickup';
      payment_method: 'cash' | 'card_on_pickup';
      plan_type: 'fixed' | 'revenue_target';
    };
    CompositeTypes: never;
  };
};
