-- Migration: Add order notification trigger
-- Description: Automatically trigger web push notifications when order status changes
-- Created: 2025-01-10

-- Create function to send order notifications via HTTP request to Next.js API
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  customer_user_id UUID;
  vendor_user_id UUID;
  courier_user_id UUID;
  order_number TEXT;
  notification_type TEXT;
BEGIN
  -- Extract order number (generate if not exists)
  order_number := COALESCE(
    NEW.order_number,
    'KG-' || TO_CHAR(NEW.created_at, 'YYYYMMDD') || '-' || LPAD(NEW.id::text, 4, '0')
  );

  -- Get related user IDs
  customer_user_id := NEW.customer_id;

  -- Get vendor owner user_id from branch -> vendor -> owner
  SELECT v.owner_user_id INTO vendor_user_id
  FROM branches b
  JOIN vendors v ON b.vendor_id = v.id
  WHERE b.id = NEW.branch_id;

  -- Get courier user_id
  IF NEW.courier_id IS NOT NULL THEN
    SELECT user_id INTO courier_user_id
    FROM couriers
    WHERE id = NEW.courier_id;
  END IF;

  -- Map order status to notification type and determine recipients
  CASE NEW.status
    WHEN 'NEW' THEN
      notification_type := 'ORDER_PLACED';
      -- Notify vendor only
      IF vendor_user_id IS NOT NULL THEN
        PERFORM net.http_post(
          url := current_setting('app.settings.api_url', true) || '/api/notifications/trigger',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'user_id', vendor_user_id,
            'notification_type', notification_type,
            'order_id', NEW.id,
            'order_number', order_number
          )
        );
      END IF;

    WHEN 'CONFIRMED' THEN
      notification_type := 'ORDER_CONFIRMED';
      -- Notify customer
      IF customer_user_id IS NOT NULL THEN
        PERFORM net.http_post(
          url := current_setting('app.settings.api_url', true) || '/api/notifications/trigger',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'user_id', customer_user_id,
            'notification_type', notification_type,
            'order_id', NEW.id,
            'order_number', order_number
          )
        );
      END IF;

    WHEN 'PREPARING' THEN
      notification_type := 'ORDER_PREPARING';
      -- Notify customer
      IF customer_user_id IS NOT NULL THEN
        PERFORM net.http_post(
          url := current_setting('app.settings.api_url', true) || '/api/notifications/trigger',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'user_id', customer_user_id,
            'notification_type', notification_type,
            'order_id', NEW.id,
            'order_number', order_number
          )
        );
      END IF;

    WHEN 'PICKED_UP' THEN
      notification_type := 'ORDER_READY';
      -- Notify customer and courier
      IF customer_user_id IS NOT NULL THEN
        PERFORM net.http_post(
          url := current_setting('app.settings.api_url', true) || '/api/notifications/trigger',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'user_id', customer_user_id,
            'notification_type', 'ORDER_PICKED_UP',
            'order_id', NEW.id,
            'order_number', order_number
          )
        );
      END IF;

      IF courier_user_id IS NOT NULL THEN
        PERFORM net.http_post(
          url := current_setting('app.settings.api_url', true) || '/api/notifications/trigger',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'user_id', courier_user_id,
            'notification_type', 'COURIER_ASSIGNED',
            'order_id', NEW.id,
            'order_number', order_number
          )
        );
      END IF;

    WHEN 'ON_ROUTE' THEN
      notification_type := 'ORDER_ON_ROUTE';
      -- Notify customer
      IF customer_user_id IS NOT NULL THEN
        PERFORM net.http_post(
          url := current_setting('app.settings.api_url', true) || '/api/notifications/trigger',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'user_id', customer_user_id,
            'notification_type', notification_type,
            'order_id', NEW.id,
            'order_number', order_number
          )
        );
      END IF;

    WHEN 'DELIVERED' THEN
      notification_type := 'ORDER_DELIVERED';
      -- Notify customer and vendor
      IF customer_user_id IS NOT NULL THEN
        PERFORM net.http_post(
          url := current_setting('app.settings.api_url', true) || '/api/notifications/trigger',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'user_id', customer_user_id,
            'notification_type', notification_type,
            'order_id', NEW.id,
            'order_number', order_number
          )
        );
      END IF;

      IF vendor_user_id IS NOT NULL THEN
        PERFORM net.http_post(
          url := current_setting('app.settings.api_url', true) || '/api/notifications/trigger',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'user_id', vendor_user_id,
            'notification_type', notification_type,
            'order_id', NEW.id,
            'order_number', order_number
          )
        );
      END IF;

    WHEN 'REJECTED', 'CANCELED_BY_USER', 'CANCELED_BY_VENDOR' THEN
      notification_type := 'ORDER_CANCELED';
      -- Notify all parties
      IF customer_user_id IS NOT NULL THEN
        PERFORM net.http_post(
          url := current_setting('app.settings.api_url', true) || '/api/notifications/trigger',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'user_id', customer_user_id,
            'notification_type', notification_type,
            'order_id', NEW.id,
            'order_number', order_number
          )
        );
      END IF;

      IF vendor_user_id IS NOT NULL THEN
        PERFORM net.http_post(
          url := current_setting('app.settings.api_url', true) || '/api/notifications/trigger',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'user_id', vendor_user_id,
            'notification_type', notification_type,
            'order_id', NEW.id,
            'order_number', order_number
          )
        );
      END IF;

      IF courier_user_id IS NOT NULL THEN
        PERFORM net.http_post(
          url := current_setting('app.settings.api_url', true) || '/api/notifications/trigger',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'user_id', courier_user_id,
            'notification_type', notification_type,
            'order_id', NEW.id,
            'order_number', order_number
          )
        );
      END IF;

    ELSE
      -- Unknown status, skip notification
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_order_status_notification ON orders;

CREATE TRIGGER trigger_order_status_notification
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_order_status_change();

-- Add comment
COMMENT ON FUNCTION notify_order_status_change() IS
  'Triggers web push notifications to relevant users when order status changes';

COMMENT ON TRIGGER trigger_order_status_notification ON orders IS
  'Sends notifications on order status transitions using HTTP requests to Next.js API';
