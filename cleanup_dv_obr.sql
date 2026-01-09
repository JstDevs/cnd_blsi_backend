
-- SQL Script to remove ONLY OBR and DV data and reset relevant budget balances.
-- This preserves Budget Allotments, Supplementals, and Transfers.

START TRANSACTION;

-- Document Type IDs:
-- 13: Obligation Request (OBR)
-- 14: Disbursement Voucher (DV)

-- 1. Delete Child Records linked to OBR (13) and DV (14)

DELETE FROM transactionitems 
WHERE LinkID IN (
    SELECT LinkID FROM transactiontable 
    WHERE DocumentTypeID IN (13, 14)
);

DELETE FROM attachment 
WHERE LinkID IN (
    SELECT LinkID FROM transactiontable 
    WHERE DocumentTypeID IN (13, 14)
);

DELETE FROM approvalaudit 
WHERE InvoiceLink IN (
    SELECT LinkID FROM transactiontable 
    WHERE DocumentTypeID IN (13, 14)
);

DELETE FROM contraaccount 
WHERE LinkID IN (
    SELECT LinkID FROM transactiontable 
    WHERE DocumentTypeID IN (13, 14)
);

DELETE FROM generalledger 
WHERE LinkID IN (
    SELECT LinkID FROM transactiontable 
    WHERE DocumentTypeID IN (13, 14)
);

-- 2. Delete The Transactions Themselves (OBR and DV)
DELETE FROM transactiontable 
WHERE DocumentTypeID IN (13, 14);

-- 3. Reset Budget Balances
-- Since we deleted all OBRs and DVs, the "usage" of the budget is reset.
-- PreEncumbrance (OBR Requested), Encumbrance (OBR Posted), Charges (DV) should all be 0.
-- AllotmentBalance should be restored to the 'Released' amount (assuming AllotmentBalance = Released - Charges).

UPDATE budget SET 
    PreEncumbrance = 0,
    Encumbrance = 0,
    Charges = 0,
    ChargedAllotment = 0,
    AllotmentBalance = Released; -- Restore available allotment to the total released amount

COMMIT;
