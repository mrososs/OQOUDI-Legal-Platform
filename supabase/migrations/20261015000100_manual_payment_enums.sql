-- =====================================================================
-- Manual payment verification (part 1/2): new payment methods.
-- Enum values must be committed before any statement can use them, so
-- they live in their own migration. Legacy values (card, wallet, fawry)
-- stay for historical payment rows.
-- =====================================================================

alter type public.payment_method add value if not exists 'instapay';
alter type public.payment_method add value if not exists 'vodafone_cash';
alter type public.payment_method add value if not exists 'paypal';
