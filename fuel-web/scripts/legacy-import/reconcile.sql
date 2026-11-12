-- Run after --commit:
-- sudo docker exec -i fuel-postgres psql -U postgres -d fuel < reconcile.sql
-- Amounts are in paise; divided by 100 for rupees.

-- 1. Revenue per year (compare with the "by year" figures the script printed)
SELECT to_char("paidAt", 'YYYY') AS year, count(*) AS payments, sum(amount)/100 AS rupees
FROM "Payment"
WHERE "receiptNumber" LIKE 'LEGACY-RC-%' AND status = 'PAID'
GROUP BY 1 ORDER BY 1;

-- 2. Revenue per service (compare with "by service")
SELECT i."serviceName", sum(p.amount)/100 AS rupees
FROM "Payment" p JOIN "Invoice" i ON i.id = p."invoiceId"
WHERE p."receiptNumber" LIKE 'LEGACY-RC-%' AND p.status = 'PAID'
GROUP BY 1 ORDER BY 2 DESC;

-- 3. Row counts
SELECT
  (SELECT count(*) FROM "Member"       WHERE "legacyId" IS NOT NULL)               AS members,
  (SELECT count(*) FROM "Invoice"      WHERE "invoiceNumber" LIKE 'LEGACY-%')      AS invoices,
  (SELECT count(*) FROM "Subscription" s JOIN "Invoice" i ON i.id = s."invoiceId"
     WHERE i."invoiceNumber" LIKE 'LEGACY-%')                                      AS subscriptions,
  (SELECT count(*) FROM "Payment"      WHERE "receiptNumber" LIKE 'LEGACY-RC-%')   AS payments;

-- 4. Subscription status mix
SELECT s.status, count(*) FROM "Subscription" s JOIN "Invoice" i ON i.id = s."invoiceId"
WHERE i."invoiceNumber" LIKE 'LEGACY-%' GROUP BY 1;

-- 5. Outstanding balances (rupees)
SELECT count(*), sum("balanceAmount")/100 FROM "Invoice"
WHERE "invoiceNumber" LIKE 'LEGACY-%' AND "balanceAmount" > 0;

-- 6. Members still on placeholder phone / email (for reception to fix)
SELECT count(*) FILTER (WHERE phone LIKE '0000%')       AS placeholder_phones,
       count(*) FILTER (WHERE email LIKE '%@example.com') AS placeholder_emails
FROM "Member";
