-- DELIMITER $$

DROP PROCEDURE IF EXISTS SP_SCBAA;
CREATE PROCEDURE SP_SCBAA (
  IN fiscalYear VARCHAR(50)
)
BEGIN
  SELECT
    act.Name AS Type,
    acs.ID AS SubID,
    acs.Name AS Subtype,
    acc.Name AS Category,
    coa.Name AS ChartOfAccounts,
    -- REPLACE(coa.AccountCode, '-', '') AS AccountCode,
    coa.AccountCode AS AccountCode,
    
    SUM(bud.Appropriation) AS Original,
    SUM(bud.TotalAmount) AS Final,
    SUM(bud.Appropriation) - SUM(bud.TotalAmount) AS Difference,
    SUM(ABS(bud.Charges)) AS Actual,
    SUM(bud.TotalAmount) - SUM(ABS(bud.Charges)) AS Difference2,

    -- Last day of the month for fsy.MonthEnd
    LAST_DAY(fsy.MonthEnd) AS Period,

    -- Redundant group totals (used again as _Sum)
    SUM(bud.Appropriation) AS Original_Sum,
    SUM(bud.TotalAmount) AS Final_Sum,
    SUM(bud.Appropriation) - SUM(bud.TotalAmount) AS Difference_Sum,
    SUM(ABS(bud.Charges)) AS Actual_Sum,
    SUM(bud.TotalAmount) - SUM(ABS(bud.Charges)) AS Difference2_Sum,

    lmu.Name AS Municipality,
    lpr.Name AS Province,

    fiscalYear AS Extra

  FROM budget AS bud
    INNER JOIN chartofaccounts  AS coa ON coa.ID = bud.ChartOfAccountsID
    INNER JOIN accounttype      AS act ON act.ID = coa.AccountTypeID
    INNER JOIN accountsubtype   AS acs ON acs.ID = coa.AccountSubTypeID
    INNER JOIN accountcategory  AS acc ON acc.ID = coa.AccountCategoryID
    INNER JOIN fiscalyear       AS fsy ON fsy.ID = bud.FiscalYearID
    INNER JOIN lgu              AS lgu ON lgu.ID = 1
    INNER JOIN municipality     AS lmu ON lmu.ID = lgu.MunicipalityID
    INNER JOIN province         AS lpr ON lpr.ID = lgu.ProvinceID

  WHERE bud.FiscalYearID = fiscalYear

  GROUP BY 
    act.Name,
    acs.ID,
    acs.Name,
    acc.Name,
    coa.Name,
    coa.AccountCode,
    Period,
    lmu.Name,
    lpr.Name;
END 
-- $$

-- DELIMITER ;
