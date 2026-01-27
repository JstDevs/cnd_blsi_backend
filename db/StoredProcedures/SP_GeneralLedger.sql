DELIMITER $$

DROP PROCEDURE IF EXISTS SP_GeneralLedger $$

CREATE PROCEDURE SP_GeneralLedger (
    IN p_accountCode VARCHAR(50),
    IN p_fundID VARCHAR(50),
    IN p_cutoff VARCHAR(50),
    IN p_linkID VARCHAR(50)
)
BEGIN
    SET @cleanMatch = REPLACE(p_accountCode, '-', '');
    IF @cleanMatch = '' THEN SET @cleanMatch = '%'; END IF;
    
    SET @targetLinkID = p_linkID;
    IF @targetLinkID = '' OR @targetLinkID IS NULL THEN SET @targetLinkID = '%'; END IF;

    SELECT 
        tbl.id,
        tbl.transaction_id,
        tbl.link_id,
        tbl.ap_ar,
        tbl.fund,
        tbl.account_name,
        tbl.account_code,
        tbl.date,
        tbl.ledger_item,
        tbl.invoice_number,
        tbl.account_code_display,
        tbl.account_name_display,
        tbl.debit,
        tbl.credit,
        CASE
            WHEN SUM(IFNULL(tbl.debit, 0) - IFNULL(tbl.credit, 0)) OVER (ORDER BY tbl.date, tbl.invoice_number, tbl.id) = 0.00 THEN 0.00
            ELSE SUM(IFNULL(tbl.debit, 0) - IFNULL(tbl.credit, 0)) OVER (ORDER BY tbl.date, tbl.invoice_number, tbl.id)
        END AS balance,
        tbl.municipality
    FROM (
        -- Part 1: Journal Entry Voucher
        SELECT 
            jev.ID AS id,
            trt.ID AS transaction_id,
            trt.LinkID AS link_id,
            trt.APAR AS ap_ar,
            IFNULL(fnd.Name, 'N/A') AS fund,
            jev.AccountName AS account_name,
            jev.AccountCode AS account_code,
            DATE(jev.CreatedDate) AS date,
            jev.LedgerItem AS ledger_item,
            trt.InvoiceNumber AS invoice_number,
            p_accountCode AS account_code_display,
            jev.AccountName AS account_name_display,
            jev.Debit AS debit,
            jev.Credit AS credit,
            '' AS municipality
        FROM journalentryvoucher jev
        JOIN transactiontable trt ON TRIM(trt.LinkID) = TRIM(jev.LinkID)
        LEFT JOIN funds fnd ON fnd.ID = trt.FundsID
        WHERE (trt.APAR LIKE '%Journal Entry Voucher%' OR trt.APAR LIKE '%JEV%' OR trt.DocumentTypeID = 23)
          AND trt.Status IN ('Posted', 'approved', 'Approved')
          AND (REPLACE(jev.AccountCode, '-', '') LIKE @cleanMatch OR p_accountCode = '%')
          AND (CONCAT(trt.FundsID, '') LIKE p_fundID OR p_fundID = '%')
          AND (CONCAT(trt.LinkID, '') LIKE @targetLinkID)
          AND DATE(jev.CreatedDate) <= DATE(p_cutoff)

        UNION ALL

        -- Part 2: Disbursement Voucher
        SELECT 
            tri.ID AS id,
            trt.ID AS transaction_id,
            trt.LinkID AS link_id,
            trt.APAR AS ap_ar,
            IFNULL(fnd.Name, 'N/A') AS fund,
            coa.Name AS account_name,
            coa.AccountCode AS account_code,
            trt.InvoiceDate AS date,
            'Disbursement Entry' AS ledger_item,
            trt.InvoiceNumber AS invoice_number,
            p_accountCode AS account_code_display,
            coa.Name AS account_name_display,
            tri.Debit AS debit,
            tri.Credit AS credit,
            '' AS municipality
        FROM transactiontable trt
        JOIN transactionitems tri ON TRIM(tri.LinkID) = TRIM(trt.LinkID)
        JOIN chartofaccounts coa ON coa.ID = tri.ChargeAccountID
        LEFT JOIN funds fnd ON fnd.ID = trt.FundsID
        WHERE (trt.APAR LIKE '%Disbursement Voucher%' OR trt.APAR LIKE '%DV%' OR trt.DocumentTypeID IN (4, 5))
          AND trt.Status IN ('Posted', 'approved', 'Approved')
          AND (REPLACE(coa.AccountCode, '-', '') LIKE @cleanMatch OR p_accountCode = '%')
          AND (CONCAT(trt.FundsID, '') LIKE p_fundID OR p_fundID = '%')
          AND (CONCAT(trt.LinkID, '') LIKE @targetLinkID)
          AND DATE(trt.InvoiceDate) <= DATE(p_cutoff)

        UNION ALL

        -- Part 3: Burial & Marriage Receipts (Debit side: 1-01-01-010)
        SELECT 
            trt.ID AS id,
            trt.ID AS transaction_id,
            trt.LinkID AS link_id,
            trt.APAR AS ap_ar,
            IFNULL(fnd.Name, 'N/A') AS fund,
            'Cash - Local Treasury' AS account_name,
            '1-01-01-010' AS account_code,
            trt.InvoiceDate AS date,
            CONCAT(trt.APAR, ': ', IFNULL(trt.CustomerName, '')) AS ledger_item,
            trt.InvoiceNumber AS invoice_number,
            p_accountCode AS account_code_display,
            'Cash - Local Treasury' AS account_name_display,
            trt.Debit AS debit,
            0.00 AS credit,
            '' AS municipality
        FROM transactiontable trt
        LEFT JOIN funds fnd ON fnd.ID = trt.FundsID
        WHERE (trt.DocumentTypeID IN (18, 19))
          AND trt.Status IN ('Posted', 'Approved', 'approved')
          AND ('10101010' LIKE @cleanMatch OR p_accountCode = '%')
          AND (CONCAT(trt.FundsID, '') LIKE p_fundID OR p_fundID = '%')
          AND (CONCAT(trt.LinkID, '') LIKE @targetLinkID)
          AND DATE(trt.InvoiceDate) <= DATE(p_cutoff)

        UNION ALL

        -- Part 4: Burial & Marriage Receipts (Credit side)
        SELECT 
            trt.ID + 1000000 AS id, 
            trt.ID AS transaction_id,
            trt.LinkID AS link_id,
            trt.APAR AS ap_ar,
            IFNULL(fnd.Name, 'N/A') AS fund,
            'Petty Cash' AS account_name,
            '1-01-01-020' AS account_code,
            trt.InvoiceDate AS date,
            CONCAT(trt.APAR, ': ', IFNULL(trt.CustomerName, '')) AS ledger_item,
            trt.InvoiceNumber AS invoice_number,
            p_accountCode AS account_code_display,
            'Petty Cash' AS account_name_display,
            0.00 AS debit,
            trt.Credit AS credit,
            '' AS municipality
        FROM transactiontable trt
        LEFT JOIN funds fnd ON fnd.ID = trt.FundsID
        WHERE (trt.DocumentTypeID IN (18, 19))
          AND trt.Status IN ('Posted', 'Approved', 'approved')
          AND ('10101020' LIKE @cleanMatch OR p_accountCode = '%')
          AND (CONCAT(trt.FundsID, '') LIKE p_fundID OR p_fundID = '%')
          AND (CONCAT(trt.LinkID, '') LIKE @targetLinkID)
          AND DATE(trt.InvoiceDate) <= DATE(p_cutoff)

        UNION ALL

        -- Part 5: Service Invoice (Debit side: Cash)
        SELECT 
            trt.ID + 5000000 AS id,
            trt.ID AS transaction_id,
            trt.LinkID AS link_id,
            'Service Invoice' AS ap_ar,
            IFNULL(fnd.Name, 'N/A') AS fund,
            'Cash - Local Treasury' AS account_name,
            '1-01-01-010' AS account_code,
            trt.InvoiceDate AS date,
            CONCAT('Service Invoice: ', IFNULL(trt.CustomerName, '')) AS ledger_item,
            trt.InvoiceNumber AS invoice_number,
            p_accountCode AS account_code_display,
            'Cash - Local Treasury' AS account_name_display,
            trt.Debit AS debit,
            0.00 AS credit,
            '' AS municipality
        FROM transactiontable trt
        LEFT JOIN funds fnd ON fnd.ID = trt.FundsID
        WHERE (trt.DocumentTypeID = 6)
          AND trt.Status IN ('Posted', 'Approved', 'approved', 'Requested')
          AND ('10101010' LIKE @cleanMatch OR p_accountCode = '%')
          AND (CONCAT(trt.FundsID, '') LIKE p_fundID OR p_fundID = '%')
          AND (CONCAT(trt.LinkID, '') LIKE @targetLinkID)
          AND DATE(trt.InvoiceDate) <= DATE(p_cutoff)

        UNION ALL

        -- Part 6: Service Invoice (Credit side: Items)
        -- JOIN with Item table to get Item Name
        SELECT 
            tri.ID + 6000000 AS id,
            trt.ID AS transaction_id,
            trt.LinkID AS link_id,
            'Service Invoice' AS ap_ar,
            IFNULL(fnd.Name, 'N/A') AS fund,
            coa.Name AS account_name,
            coa.AccountCode AS account_code,
            trt.InvoiceDate AS date,
            CONCAT('GSI Item: ', IFNULL(itm.Name, IFNULL(tri.Remarks, 'Item'))) AS ledger_item,
            trt.InvoiceNumber AS invoice_number,
            p_accountCode AS account_code_display,
            coa.Name AS account_name_display,
            0.00 AS debit,
            tri.Credit AS credit,
            '' AS municipality
        FROM transactiontable trt
        JOIN transactionitems tri ON TRIM(tri.LinkID) = TRIM(trt.LinkID)
        LEFT JOIN item itm ON itm.ID = tri.ItemID
        JOIN chartofaccounts coa ON coa.ID = tri.ChargeAccountID
        LEFT JOIN funds fnd ON fnd.ID = trt.FundsID
        WHERE (trt.DocumentTypeID = 6)
          AND trt.Status IN ('Posted', 'Approved', 'approved', 'Requested')
          AND (REPLACE(coa.AccountCode, '-', '') LIKE @cleanMatch OR p_accountCode = '%')
          AND (CONCAT(trt.FundsID, '') LIKE p_fundID OR p_fundID = '%')
          AND (CONCAT(trt.LinkID, '') LIKE @targetLinkID)
          AND DATE(trt.InvoiceDate) <= DATE(p_cutoff)

    ) AS tbl
    ORDER BY date, id;

END $$

DELIMITER ;
