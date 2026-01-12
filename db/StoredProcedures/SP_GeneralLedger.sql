DELIMITER $$

CREATE PROCEDURE SP_GeneralLedger (
    IN p_accountCode VARCHAR(50),
    IN p_fundID VARCHAR(50),
    IN p_cutoff VARCHAR(50)
)
BEGIN

    SELECT 
        tbl.ID,
        tbl.APAR,
        tbl.Fund,
        tbl.AccountName,
        tbl.AccountCode,
        tbl.Date,
        tbl.LedgerItem,
        tbl.InvoiceNumber,
        tbl.AccountCodeDisplay,
        tbl.AccountNameDisplay,
        tbl.Debit,
        tbl.Credit,
        CASE
            WHEN SUM(tbl.Debit) OVER (ORDER BY tbl.InvoiceNumber) = 0.00 THEN NULL
            ELSE SUM(tbl.Debit) OVER (ORDER BY tbl.InvoiceNumber)
        END AS Balance,
        tbl.Municipality
    FROM (
        SELECT 
            jev.ID,
            trt.APAR,
            jev.AccountName,
            jev.AccountCode,
            DATE(jev.CreatedDate) AS Date,
            jev.LedgerItem,
            trt.InvoiceNumber,
            CASE 
                WHEN p_accountCode COLLATE utf8mb4_general_ci = '%' THEN 'AllAccounts'
                ELSE p_accountCode 
            END AS AccountCodeDisplay,
            CASE 
                WHEN p_accountCode COLLATE utf8mb4_general_ci = '%' THEN 'AllAccounts'
                ELSE jev.AccountName
            END AS AccountNameDisplay,
            CASE 
                WHEN p_fundID COLLATE utf8mb4_general_ci = '%' THEN 'AllFunds'
                ELSE jev.FundName
            END AS Fund,
            CASE 
                WHEN jev.Debit = 0.00 THEN NULL
                ELSE jev.Debit
            END AS Debit,
            CASE 
                WHEN jev.Credit = 0.00 THEN NULL
                ELSE jev.Credit
            END AS Credit,
            lmu.Name AS Municipality
        FROM transactiontable trt
        LEFT JOIN journalentryvoucher jev ON jev.LinkID = trt.LinkID
        INNER JOIN funds fnd ON fnd.Name = jev.FundName
        INNER JOIN lgu lgu ON lgu.ID = 1
        LEFT JOIN municipality lmu ON lmu.ID = lgu.MunicipalityID
        WHERE trt.APAR LIKE 'Journal Entry Voucher'
          AND jev.AccountCode LIKE p_accountCode COLLATE utf8mb4_general_ci
          AND CONCAT(fnd.ID, '') LIKE p_fundID COLLATE utf8mb4_general_ci
          AND jev.CreatedDate <= p_cutoff

        UNION ALL

        SELECT 
            trt.ID,
            trt.APAR,
            coa.Name AS AccountName,
            REPLACE(coa.AccountCode, '-', '') AS AccountCode,
            trt.InvoiceDate AS Date,
            (
                SELECT GROUP_CONCAT(itm.Name SEPARATOR ', ')
                FROM transactionitems tae
                INNER JOIN item itm ON itm.ID = tae.ItemID
                WHERE tae.LinkID = tri.LinkID
                GROUP BY tae.LinkID
            ) AS LedgerItem,
            trt.InvoiceNumber,
            CASE 
                WHEN p_accountCode COLLATE utf8mb4_general_ci = '%' THEN 'AllAccounts'
                ELSE REPLACE(p_accountCode, '-', '')
            END AS AccountCodeDisplay,
            CASE 
                WHEN p_accountCode COLLATE utf8mb4_general_ci = '%' THEN 'AllAccounts'
                ELSE coa.Name
            END AS AccountNameDisplay,
            CASE 
                WHEN p_fundID COLLATE utf8mb4_general_ci = '%' THEN 'AllFunds'
                ELSE fnd.Name
            END AS Fund,
            CASE 
                WHEN LAG(trt.ID) OVER (ORDER BY trt.InvoiceNumber, trt.Debit DESC) = trt.ID THEN NULL
                ELSE CASE 
                    WHEN trt.Debit = 0.00 THEN NULL
                    ELSE trt.Debit
                END
            END AS Debit,
            CASE 
                WHEN LAG(trt.ID) OVER (ORDER BY trt.InvoiceNumber, trt.Debit DESC) = trt.ID THEN NULL
                ELSE CASE 
                    WHEN trt.Credit = 0.00 THEN NULL
                    ELSE trt.Credit
                END
            END AS Credit,
            lmu.Name AS Municipality
        FROM transactiontable trt
        LEFT JOIN transactionitems tri ON tri.LinkID = trt.LinkID
        INNER JOIN funds fnd ON fnd.ID = trt.FundsID
        INNER JOIN transactiontable tro ON tro.InvoiceNumber = trt.ObligationRequestNumber
        INNER JOIN chartofaccounts coa ON coa.ID = tri.ChargeAccountID
        INNER JOIN lgu lgu ON lgu.ID = 1
        INNER JOIN municipality lmu ON lmu.ID = lgu.MunicipalityID
        WHERE trt.APAR LIKE 'Disbursement Voucher'
          AND coa.AccountCode LIKE p_accountCode COLLATE utf8mb4_general_ci
          AND CONCAT(fnd.ID, '') LIKE p_fundID COLLATE utf8mb4_general_ci
          AND trt.PostingDate <= p_cutoff

    ) AS tbl
    ORDER BY InvoiceNumber, Debit DESC;

END $$

DELIMITER ;
