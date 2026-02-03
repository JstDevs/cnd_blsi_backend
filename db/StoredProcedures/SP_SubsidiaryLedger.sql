DELIMITER $$

DROP PROCEDURE IF EXISTS SP_SubsidiaryLedger $$

CREATE PROCEDURE SP_SubsidiaryLedger (
    IN accountCode VARCHAR(50),
    IN fundID VARCHAR(50),
    IN cutoff VARCHAR(50)
)
BEGIN
    SELECT 
        gle.ID,
        fnd.Name AS Fund,
        gle.AccountName,
        gle.AccountCode,
        DATE(gle.CreatedDate) AS Date,
        gle.LedgerItem,
        CASE
            WHEN IFNULL(gle.Debit, 0) = 0.00 THEN NULL
            ELSE gle.Debit
        END AS Debit,
        CASE
            WHEN IFNULL(gle.Credit, 0) = 0.00 THEN NULL
            ELSE gle.Credit
        END AS Credit,
        SUM(IFNULL(gle.Debit, 0) - IFNULL(gle.Credit, 0)) OVER (ORDER BY gle.CreatedDate, gle.ID) AS Balance,
        lmu.Name AS Municipality
    FROM generalledger AS gle
    INNER JOIN funds AS fnd ON fnd.ID = gle.FundID
    INNER JOIN lgu AS lgu ON lgu.ID = 1
    LEFT JOIN municipality AS lmu ON lmu.ID = lgu.MunicipalityID
    WHERE (gle.AccountCode LIKE accountCode OR accountCode = '%')
      AND (CONCAT(gle.FundID, '') LIKE fundID OR fundID = '%')
      AND DATE(gle.CreatedDate) <= DATE(cutoff);
END $$

DELIMITER ;
