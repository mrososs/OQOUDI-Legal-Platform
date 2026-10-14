-- =====================================================================
-- Payments: checkout initiation and verified, idempotent result recording
-- =====================================================================

create or replace function public.payment_start(p_actor uuid, p_order uuid, p_method public.payment_method, p_provider text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_booking public.consultation_bookings;
  v_payment uuid;
  v_hold integer := private.booking_setting('hold_minutes', 15);
begin
  perform set_config('oq.actor', p_actor::text, true);
  if not private.actor_is_order_customer(p_actor, p_order) then
    perform private.fail('OQ404_ORDER');
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if v_order.status <> 'awaiting_payment' or v_order.payment_status not in ('unpaid', 'failed') then
    perform private.fail('OQ409_NOT_PAYABLE', v_order.status::text || '/' || v_order.payment_status::text);
  end if;
  if v_order.service_snapshot ->> 'pricingType' = 'quote' and v_order.quote_issued_at is null then
    perform private.fail('OQ409_QUOTE_PENDING');
  end if;
  if v_order.total_minor <= 0 then
    perform private.fail('OQ409_NOT_PAYABLE', 'zero-amount');
  end if;

  -- Video consultations: keep (or re-acquire) the slot while paying.
  select * into v_booking from public.consultation_bookings where order_id = p_order for update;
  if found then
    if v_booking.status = 'held' and v_booking.hold_expires_at > now() then
      update public.consultation_bookings set hold_expires_at = now() + make_interval(mins => v_hold) where id = v_booking.id;
    elsif v_booking.status in ('held', 'expired') then
      begin
        update public.consultation_bookings
           set status = 'held', hold_expires_at = now() + make_interval(mins => v_hold)
         where id = v_booking.id;
      exception
        when exclusion_violation then
          perform private.fail('OQ409_SLOT_TAKEN');
      end;
    elsif v_booking.status <> 'confirmed' then
      perform private.fail('OQ409_SLOT_TAKEN');
    end if;
  end if;

  update public.payments set status = 'cancelled' where order_id = p_order and status = 'initiated';

  insert into public.payments (order_id, provider, method, status, amount_minor, created_by)
  values (p_order, p_provider, p_method, 'initiated', v_order.total_minor, p_actor)
  returning id into v_payment;

  perform private.add_event(p_order, 'payment.started', p_actor, 'customer',
    jsonb_build_object('method', p_method, 'provider', p_provider), 'staff');

  return jsonb_build_object(
    'paymentId', v_payment,
    'amountMinor', v_order.total_minor,
    'currency', v_order.currency,
    'orderNumber', v_order.order_number
  );
end;
$$;

-- Stores the provider's reference after a checkout session was created.
create or replace function public.payment_attach_reference(p_payment uuid, p_reference text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payments
     set provider_reference = p_reference, status = 'pending'
   where id = p_payment and status = 'initiated';
  if not found then
    perform private.fail('OQ409_PAYMENT_STATE');
  end if;
end;
$$;

-- Called ONLY from the verified webhook handler. Returns a processing
-- result string. Replays of the same provider event are no-ops.
create or replace function public.payment_record_result(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_payment uuid,
  p_success boolean,
  p_amount_minor bigint,
  p_failure_reason text,
  p_payload jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event uuid;
  v_payment public.payments;
  v_order public.orders;
  v_result text;
  v_lawyer uuid;
  v_booking public.consultation_bookings;
begin
  insert into public.payment_events (provider, provider_event_id, payment_id, event_type, payload)
  values (p_provider, p_event_id, p_payment, p_event_type, coalesce(p_payload, '{}'::jsonb))
  on conflict (provider, provider_event_id) do nothing
  returning id into v_event;
  if v_event is null then
    return 'duplicate_event';
  end if;

  select * into v_payment from public.payments where id = p_payment and provider = p_provider for update;
  if not found then
    v_result := 'unknown_payment';
  elsif v_payment.status = 'succeeded' then
    v_result := 'already_succeeded';
  elsif v_payment.status in ('cancelled', 'expired') and not p_success then
    v_result := 'ignored_inactive_attempt';
  elsif p_amount_minor is distinct from v_payment.amount_minor then
    v_result := 'amount_mismatch';
    perform private.audit(null, 'payment.amount_mismatch', 'payment', p_payment::text,
      jsonb_build_object('expected', v_payment.amount_minor, 'received', p_amount_minor));
  else
    select * into v_order from public.orders where id = v_payment.order_id for update;

    if p_success then
      if v_order.payment_status = 'paid' then
        -- A second successful charge for an already paid order.
        update public.payments set status = 'failed', failed_at = now(), failure_reason = 'duplicate_charge_refund_required'
         where id = p_payment;
        perform private.notify_admins('payment.needs_refund', v_order.id, private.order_payload(v_order.id, jsonb_build_object('amountMinor', p_amount_minor)));
        v_result := 'duplicate_charge';
      else
        update public.payments
           set status = 'succeeded', succeeded_at = now(), failure_reason = null,
               receipt_number = 'RC-' || nextval('public.receipt_number_seq')
         where id = p_payment
         returning * into v_payment;

        update public.orders set payment_status = 'paid', paid_at = now() where id = v_order.id;
        perform private.add_event(v_order.id, 'payment.succeeded', null, 'system',
          jsonb_build_object('receiptNumber', v_payment.receipt_number, 'amountMinor', v_payment.amount_minor, 'method', v_payment.method));

        if v_order.status = 'cancelled' then
          perform private.notify_admins('payment.needs_refund', v_order.id, private.order_payload(v_order.id, jsonb_build_object('amountMinor', p_amount_minor)));
          v_result := 'paid_cancelled_order';
        else
          if v_order.status = 'awaiting_payment' then
            perform private.set_order_status(v_order.id, 'under_review', null, 'system');
          end if;

          v_lawyer := v_order.assigned_lawyer_id;
          if v_lawyer is null then
            v_lawyer := private.pick_lawyer();
            if v_lawyer is not null then
              update public.orders set assigned_lawyer_id = v_lawyer where id = v_order.id;
              perform private.add_event(v_order.id, 'order.assigned', null, 'system', jsonb_build_object('lawyerId', v_lawyer), 'staff');
            end if;
          end if;

          select * into v_booking from public.consultation_bookings where order_id = v_order.id for update;
          if found then
            begin
              update public.consultation_bookings
                 set status = 'confirmed', hold_expires_at = null, lawyer_id = v_lawyer
               where id = v_booking.id;
              perform private.add_event(v_order.id, 'booking.confirmed', null, 'system', jsonb_build_object('startsAt', v_booking.starts_at));
              perform private.notify_order_customers(v_order.id, 'booking.confirmed', jsonb_build_object('startsAt', v_booking.starts_at));
            exception
              when exclusion_violation then
                -- Hold expired and the slot was taken meanwhile.
                perform private.add_event(v_order.id, 'booking.conflict', null, 'system', jsonb_build_object('startsAt', v_booking.starts_at), 'staff');
                perform private.notify_admins('booking.conflict', v_order.id, private.order_payload(v_order.id));
            end;
          end if;

          perform private.notify_order_customers(v_order.id, 'payment.succeeded',
            jsonb_build_object('amountMinor', v_payment.amount_minor, 'receiptNumber', v_payment.receipt_number));
          if v_lawyer is not null then
            perform private.notify_user(v_lawyer, 'order.assigned', v_order.id, private.order_payload(v_order.id));
          else
            perform private.notify_admins('order.unassigned', v_order.id, private.order_payload(v_order.id));
          end if;
          v_result := 'succeeded';
        end if;
      end if;
    else
      update public.payments
         set status = 'failed', failed_at = now(), failure_reason = left(coalesce(p_failure_reason, 'declined'), 300)
       where id = p_payment;
      if v_order.payment_status in ('unpaid', 'failed') then
        update public.orders set payment_status = 'failed' where id = v_order.id;
      end if;
      perform private.add_event(v_order.id, 'payment.failed', null, 'system',
        jsonb_build_object('reason', left(coalesce(p_failure_reason, 'declined'), 300)));
      perform private.notify_order_customers(v_order.id, 'payment.failed', '{}'::jsonb);
      v_result := 'failed';
    end if;
  end if;

  update public.payment_events set processed_at = now(), processing_result = v_result where id = v_event;
  return v_result;
end;
$$;

grant execute on function public.payment_start(uuid, uuid, public.payment_method, text) to service_role;
grant execute on function public.payment_attach_reference(uuid, text) to service_role;
grant execute on function public.payment_record_result(text, text, text, uuid, boolean, bigint, text, jsonb) to service_role;
