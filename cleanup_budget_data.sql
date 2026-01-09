-- SQL Script to remove Budget Details, Allotment, Supplemental, Transfer, OBR, and DV data
-- and reset Budget balances.

START TRANSACTION;

-- Document Type IDs:
-- 13: Obligation Request (OBR)
-- 14: Disbursement Voucher (DV)
-- 20: Budget Allotment (Allotment Release Order)
-- 21: Budget Supplemental
-- 22: Budget Transfer

-- 1. Delete Child Records linked to these transactions

-- Delete Transaction Items
DELETE FROM transactionitems 
WHERE LinkID IN (
    SELECT LinkID FROM transactiontable 
    WHERE DocumentTypeID IN (13, 14, 20, 21, 22)
);

-- Delete Attachments
DELETE FROM attachment 
WHERE LinkID IN (
    SELECT LinkID FROM transactiontable 
    WHERE DocumentTypeID IN (13, 14, 20, 21, 22)
);

-- Delete Approval Audit Logs
DELETE FROM approvalaudit 
WHERE InvoiceLink IN (
    SELECT LinkID FROM transactiontable 
    WHERE DocumentTypeID IN (13, 14, 20, 21, 22)
);

-- Delete Contra Accounts (Relevant for DV)
DELETE FROM contraaccount 
WHERE LinkID IN (
    SELECT LinkID FROM transactiontable 
    WHERE DocumentTypeID IN (13, 14, 20, 21, 22)
);

-- Delete General Ledger Entries (if any)
DELETE FROM generalledger 
WHERE LinkID IN (
    SELECT LinkID FROM transactiontable 
    WHERE DocumentTypeID IN (13, 14, 20, 21, 22)
);

-- 2. Delete The Transactions Themselves
DELETE FROM transactiontable 
WHERE DocumentTypeID IN (13, 14, 20, 21, 22);

-- 3. Reset Budget Balances to Initial State (Appropriation only)
-- We assume 'Appropriation' is the base value that shouldn't be deleted.
-- We reset all calculated fields to 0 or to the base Appropriation value.

UPDATE budget SET 
    Supplemental = 0,
    Transfer = 0,
    Released = 0,
    AllotmentBalance = Appropriation,   -- Logic: AllotmentBalance starts as Appropriation (or 0 if Released is the trigger? Usually Appropriation)
                                      -- Wait, AllotmentBalance usually means 'Balance of Allotment'. 
                                      -- If Released = 0, AllotmentBalance might be 0? 
                                      -- Let's check: AllotmentBalance = Released - Obligations? 
                                      -- If so, if Released is 0, AllotmentBalance is 0.
                                      -- Usage in code (Allotment Release Order): 
                                      --   newReleased = currentReleased + amount
                                      --   newAllotmentBalance = appropriation - newReleased (from budgetAllotment.js line 399)
                                      --   Wait! line 399: `newAllotmentBalance = appropriation - newReleased` 
                                      --   This implies AllotmentBalance is the *Unreleased Appropriation*?
                                      --   "Appropriation Balance" is usually Unreleased Appropriation.
                                      --   Let's check budgetAllotment.js again.
    AppropriationBalance = Appropriation, -- Usually Appropriation - Released? Or Appropriation + Supplemental + Transfer?
    PreEncumbrance = 0,
    Encumbrance = 0,
    Charges = 0,
    ChargedAllotment = 0;

-- Correction based on budgetAllotment.js logic:
-- budgetAllotment.js:
--   newReleased = currentReleased + allotmentAmount;
--   newAllotmentBalance = appropriation - newReleased; (Check logic: If Appropriation is 1M, Release 200k. Released=200k. AllotmentBalance = 800k?)
--   If so, AllotmentBalance = Appropriation - Released.
--   So if Released = 0, AllotmentBalance = Appropriation.
--   Let's check budgetSupplemental.js:
--   newAdjusted = appropriation + newSupplemental + transfer;
--   newBalance = newAdjusted - released; (AppropriationBalance in DB updated with newBalance)
--   So AppropriationBalance = (Appropriation + Supplemental + Transfer) - Released.
--   If Supplemental=0, Transfer=0, Released=0 -> AppropriationBalance = Appropriation.

-- So:
-- AppropriationBalance = Appropriation
-- AllotmentBalance: In budgetAllotment.js, it updates AllotmentBalance.
-- But wait, budgetSupplemental.js updates AppropriationBalance AND AllotmentBalance with the same value?
--   line 412: AllotmentBalance: newBalance
--   line 413: AppropriationBalance: newBalance
--   So they seem to be kept in sync or mean the same thing in some contexts?
--   In budgetAllotment.js line 404: AllotmentBalance: newAllotmentBalance. 
--   It does NOT update AppropriationBalance explicitly there?
--   This is slightly confusing. But if we reset everything:
--   Supplemental=0, Transfer=0, Released=0.
--   newAdjusted = Appropriation.
--   newBalance = Appropriation - 0 = Appropriation.
--   So setting both to Appropriation is likely correct for a reset state.

-- One nuance: AllotmentBalance usually means "Balance available for Allotment (Release)".
-- And "released" transfers money to "Allotment" bucket?
-- If so, maybe there is another field "Allotment" tracking the actual released amount? Yes, "Released".
-- So "AllotmentBalance" (Unreleased) = Appropriation.
-- And "AppropriationBalance" = Appropriation.

-- Confirming Reset Values:
-- Released = 0
-- AllotmentBalance = Appropriation
-- AppropriationBalance = Appropriation
-- Supplemental = 0
-- Transfer = 0
-- PreEncumbrance = 0
-- Encumbrance = 0
-- Charges = 0
-- ChargedAllotment = 0

COMMIT;
