-- 1. Delete associated audit logs
DELETE FROM approvalaudit 
WHERE InvoiceLink IN (SELECT LinkID FROM publicmarketticketing);

-- 2. Delete entries from the transaction table
DELETE FROM transactiontable 
WHERE APAR = 'Public Market Ticketing';

-- 3. Delete the actual public market tickets
DELETE FROM publicmarketticketing;
