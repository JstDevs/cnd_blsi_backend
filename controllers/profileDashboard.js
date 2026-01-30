const EmployeeModel = require('../config/database').employee;
const PositionModel = require('../config/database').position;
const DepartmentModel = require('../config/database').department;
const TransactionTableModel = require('../config/database').TransactionTable;
const FundModel = require('../config/database').Funds;
const BudgetModel = require('../config/database').Budget;
const { Op, fn, col, where, literal } = require('sequelize');
const Department = require('../models/Department');

exports.user = async (req, res) => {
  try {
    const userID = req.user.employeeID;

    const user = await EmployeeModel.findOne({
      where: { ID: userID },
      include: [{
        model: PositionModel,
        as: 'Position',
        required: false,
        attributes: ['Name']
      }],
      attributes: ['Picture', 'FirstName', 'LastName', 'MiddleName']
    });

    if (!user) {
      throw new Error('User not found');
    }

    return res.json(user);

  } catch (err) {
    console.error('load error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.userDocumentsList = async (req, res) => {
  try {
    const { owner } = req.query;
    const userID = req.user.employeeID;
    const departmentID = req.user.departmentID;

    let whereClause = {
      Active: true,
      APAR: {
        [Op.or]: ['Obligation Request', 'Disbursement Voucher', 'Travel Order']
      }
    };

    if (owner === 'self') {
      whereClause.RequestedBy = userID;
    } else if (owner === 'department') {
      // Join condition applied via include below
    }

    const include = [
      {
        model: FundModel,
        as: 'Funds',
        attributes: ['Name']
      },
      {
        model: EmployeeModel,
        as: 'RequestedByEmployee',
        include: [
          {
            model: DepartmentModel,
            as: 'Department',
            attributes: ['Name'],
            ...(owner === 'department' ? { where: { ID: departmentID } } : {})
          }
        ]
      }
    ];

    const results = await TransactionTableModel.findAll({
      where: whereClause,
      include,
      order: [['CreatedDate', 'DESC']]
    });

    // Status counters
    let varApproved = 0;
    let varPosted = 0;
    let varRequested = 0;
    let varRejected = 0;
    results.forEach(doc => {
      const status = doc.Status?.split(',')[0].trim();
      switch (status) {
        case 'Posted':
          varPosted++;
          break;
        case 'Approved':
          varApproved++;
          break;
        case 'Requested':
          varRequested++;
          break;
        case 'Rejected':
          varRejected++;
          break;
      }
    });

    const statusCounts = {
      Approved: varApproved,
      Posted: varPosted,
      Requested: varRequested,
      Rejected: varRejected,
      Total: varApproved + varPosted + varRequested + varRejected
    };

    res.json({
      statusCounts,
      documentsList: results
    });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.budgetList = async (req, res) => {
  try {
    const { selectedDepartmentID } = req.query; // optional from dropdown

    // Build where condition
    const whereCondition = {};
    if (selectedDepartmentID && selectedDepartmentID !== 'All Departments') {
      // Filter by department ID if not "All"
      whereCondition['DepartmentID'] = Number(selectedDepartmentID);
    }

    const budgets = await BudgetModel.findAll({
      where: whereCondition,
      include: [
        {
          model: DepartmentModel,
          as: 'Department',
          attributes: ['Name']
        }
      ],
      attributes: [
        'ID', 'Name', 'Appropriation', 'Supplemental', 'Transfer',
        'PreEncumbrance', 'Encumbrance', 'Charges', 'DepartmentID'
      ],
      order: [['Name', 'ASC']]
    });

    res.json(budgets);
  } catch (error) {
    console.error('Error loading budget list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.budgetAPARList = async (req, res) => {
  try {
    const { budgetID } = req.params;
    const results = await TransactionTableModel.findAll({
      where: {
        BudgetID: budgetID,
        APAR: {
          [Op.in]: ['Allotment Release Order', 'Budget Supplemental', 'Budget Transfer']
        }
      },
      attributes: ['APAR', 'Total']
    });

    res.json(results);
  } catch (error) {
    console.error('Error fetching transaction data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


exports.disbursementAmounts = async (req, res) => {
  try {
    const { aparType, dateRange, selectedDepartmentID } = req.query;

    // 1. Build date condition
    let dateCondition = {};
    switch (dateRange || 'Day') {
      case 'Year':
        dateCondition = where(fn('YEAR', col('InvoiceDate')), fn('YEAR', literal('NOW()')));
        break;
      case 'Month':
        dateCondition = {
          [Op.and]: [
            where(fn('MONTH', col('InvoiceDate')), fn('MONTH', literal('NOW()'))),
            where(fn('YEAR', col('InvoiceDate')), fn('YEAR', literal('NOW()')))
          ]
        };
        break;
      case 'Day':
      default:
        dateCondition = where(fn('DATE', col('InvoiceDate')), fn('CURDATE'));
        break;
    }

    // 2. Build where clause
    const whereClause = {
      [Op.and]: [
        dateCondition,
        { APAR: aparType },
        {
          Status: {
            [Op.like]: 'Posted%'
          }
        }
      ]
    };

    // 3. Add subquery filter for department (if any)
    if (selectedDepartmentID && selectedDepartmentID !== 'All Departments') {
      // Add nested where condition on RequestedByEmployee.DepartmentID
      whereClause[Op.and].push(
        literal(`RequestedByEmployee.DepartmentID = ${parseInt(selectedDepartmentID)}`)
      );
    }

    // 4. Query total (NO include to avoid SELECTing all employee fields)
    const result = await TransactionTableModel.findOne({
      attributes: [[fn('SUM', col('Total')), 'TotalSum']],
      where: whereClause,
      include: [
        {
          model: EmployeeModel,
          as: 'RequestedByEmployee',
          attributes: [] // exclude fields to avoid full group by conflict
        }
      ],
      raw: true
    });

    const total = result?.TotalSum ? parseFloat(result.TotalSum).toFixed(2) : '0.00';
    res.json({ total: `${Number(total).toLocaleString(undefined, { minimumFractionDigits: 2 })}` });

  } catch (error) {
    console.error('Error fetching total data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.obligationChart = async (req, res) => {
  try {
    const { dateRange = 'Day', selectedDepartmentID } = req.query;

    // 1. Date condition
    let dateCondition = {};
    switch (dateRange) {
      case 'Year':
        dateCondition = where(fn('YEAR', col('InvoiceDate')), fn('YEAR', literal('NOW()')));
        break;
      case 'Month':
        dateCondition = {
          [Op.and]: [
            where(fn('MONTH', col('InvoiceDate')), fn('MONTH', literal('NOW()'))),
            where(fn('YEAR', col('InvoiceDate')), fn('YEAR', literal('NOW()')))
          ]
        };
        break;
      case 'Day':
      default:
        dateCondition = where(fn('DATE', col('InvoiceDate')), fn('CURDATE'));
        break;
    }

    // 2. Base where clause
    const whereClause = {
      [Op.and]: [
        dateCondition,
        { APAR: 'Obligation Request' }
      ]
    };

    // 3. Department filtering
    const include = [
      {
        model: EmployeeModel,
        as: 'RequestedByEmployee',
        attributes: [],
        include: [
          {
            model: DepartmentModel,
            as: 'Department',
            attributes: [],
            required: true
          }
        ],
        required: true
      }
    ];

    if (selectedDepartmentID && selectedDepartmentID !== 'All Departments') {
      include[0].where = { DepartmentID: selectedDepartmentID };
    }

    // 4. Query
    const results = await TransactionTableModel.findAll({
      attributes: [
        'Status',
        [fn('SUM', col('Total')), 'Total']
      ],
      where: whereClause,
      include,
      group: ['Status'],
      having: {
        Status: {
          [Op.or]: [
            { [Op.like]: 'Posted%' },
            { [Op.like]: 'Requested%' },
            { [Op.like]: 'Rejected%' }
          ]
        }
      },
      raw: true
    });

    // 5. Grouping totals manually
    let totalPosted = 0;
    let totalRequested = 0;
    let totalRejected = 0;

    for (const row of results) {
      const status = row.Status;
      const total = parseFloat(row.Total || 0);

      if (status.startsWith('Posted')) totalPosted += total;
      else if (status.startsWith('Requested')) totalRequested += total;
      else if (status.startsWith('Rejected')) totalRejected += total;
    }

    res.json({
      Posted: totalPosted.toFixed(2),
      Requested: totalRequested.toFixed(2),
      Rejected: totalRejected.toFixed(2)
    });

  } catch (err) {
    console.error('Error fetching obligation data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.travelOrderChart = async (req, res) => {
  try {
    const { dateRange = 'Day' } = req.query;

    // 1. Date condition
    let dateCondition = {};
    switch (dateRange) {
      case 'Year':
        dateCondition = where(fn('YEAR', col('InvoiceDate')), fn('YEAR', literal('NOW()')));
        break;
      case 'Month':
        dateCondition = {
          [Op.and]: [
            where(fn('MONTH', col('InvoiceDate')), fn('MONTH', literal('NOW()'))),
            where(fn('YEAR', col('InvoiceDate')), fn('YEAR', literal('NOW()')))
          ]
        };
        break;
      case 'Day':
      default:
        dateCondition = where(fn('DATE', col('InvoiceDate')), fn('CURDATE'));
        break;
    }

    // 2. Build where clause
    const whereClause = {
      [Op.and]: [
        dateCondition,
        { APAR: 'Travel Order' }
      ]
    };

    // 3. Run query grouped by Status
    const results = await TransactionTableModel.findAll({
      attributes: [
        'Status',
        [fn('SUM', col('Total')), 'Total']
      ],
      where: whereClause,
      group: ['Status'],
      having: {
        Status: {
          [Op.or]: [
            { [Op.like]: 'Posted%' },
            { [Op.like]: 'Requested%' },
            { [Op.like]: 'Rejected%' }
          ]
        }
      },
      raw: true
    });

    // 4. Totals grouping
    let totalPosted = 0;
    let totalRequested = 0;
    let totalRejected = 0;

    for (const row of results) {
      const status = row.Status;
      const total = parseFloat(row.Total || 0);

      if (status.startsWith('Posted')) totalPosted += total;
      else if (status.startsWith('Requested')) totalRequested += total;
      else if (status.startsWith('Rejected')) totalRejected += total;
    }

    // 5. Return totals for frontend pie chart
    res.json({
      Posted: totalPosted.toFixed(2),
      Requested: totalRequested.toFixed(2),
      Rejected: totalRejected.toFixed(2)
    });

  } catch (err) {
    console.error('Error fetching travel order data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.disbursementChart = async (req, res) => {
  try {
    const {
      dateRange = 'Day',
      selectedDepartmentID,
    } = req.query;

    // 1. Build date condition
    let dateCondition = {};
    switch (dateRange) {
      case 'Year':
        dateCondition = where(fn('YEAR', col('InvoiceDate')), fn('YEAR', literal('NOW()')));
        break;
      case 'Month':
        dateCondition = {
          [Op.and]: [
            where(fn('MONTH', col('InvoiceDate')), fn('MONTH', literal('NOW()'))),
            where(fn('YEAR', col('InvoiceDate')), fn('YEAR', literal('NOW()')))
          ]
        };
        break;
      case 'Day':
      default:
        dateCondition = where(fn('DATE', col('InvoiceDate')), fn('CURDATE'));
        break;
    }

    // 2. Base where clause
    const whereClause = {
      [Op.and]: [
        dateCondition,
        { APAR: 'Disbursement Voucher' }
      ]
    };

    // 3. Department filter logic
    const include = [
      {
        model: EmployeeModel,
        as: 'RequestedByEmployee',
        attributes: [],
        include: [
          {
            model: DepartmentModel,
            as: 'Department',
            attributes: [],
            required: true
          }
        ],
        required: true
      }
    ];

    if (selectedDepartmentID && selectedDepartmentID !== 'All Departments') {
      include[0].where = { DepartmentID: selectedDepartmentID };
    }

    // 4. Execute query
    const results = await TransactionTableModel.findAll({
      attributes: [
        'Status',
        [fn('SUM', col('Total')), 'Total']
      ],
      where: whereClause,
      include,
      group: ['Status'],
      having: {
        Status: {
          [Op.in]: ['Posted', 'Requested', 'Rejected']
        }
      },
      raw: true
    });

    // 5. Prepare chart-style JSON
    if (results.length === 0) {
      chartData = [
        { status: 'Posted', total: '0.00'},
        { status: 'Requested', total: '0.00'},
        { status: 'Rejected', total: '0.00'}
      ];
    } else {
      chartData = ['Posted', 'Requested', 'Rejected'].map((label) => {
        const match = results.find(r => r.Status === label);
        const total = match ? parseFloat(match.Total).toFixed(2) : '0.00';
        return {
          status: label,
          total,
        };
      });
    }

    res.json(chartData);

  } catch (err) {
    console.error('Error fetching disbursement data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.collectionTotals = async (req, res) => {
  try {
    const { dateRange = 'Day', startDate, endDate, categories } = req.query;

    // 1. Build date condition
    let dateCondition = {};

    // switch (dateRange) {
    //   case 'Year':
    //     dateCondition = where(fn('YEAR', col('InvoiceDate')), fn('YEAR', literal('NOW()')));
    //     break;
    //   case 'Month':
    //     dateCondition = {
    //       [Op.and]: [
    //         where(fn('YEAR', col('InvoiceDate')), fn('YEAR', literal('NOW()'))),
    //         where(fn('MONTH', col('InvoiceDate')), fn('MONTH', literal('NOW()')))
    //       ]
    //     };
    //     break;
    //   case 'Day':
    //   default:
    //     dateCondition = where(fn('DATE', col('InvoiceDate')), fn('CURDATE'));
    //     break;
    // }

    if (startDate && endDate) {
      dateCondition = {
        InvoiceDate: { [Op.between]: [startDate, endDate] }
      };
    } else if (startDate) {
      dateCondition = { InvoiceDate: { [Op.gte]: startDate } };
    } else if (endDate) {
      dateCondition = { InvoiceDate: { [Op.lte]: endDate } };
    } else {
      switch (dateRange) {
        case 'Year':
          dateCondition = where(fn('YEAR', col('InvoiceDate')), fn('YEAR', literal('NOW()')));
          break;
        case 'Month':
          dateCondition = {
            [Op.and]: [
              where(fn('YEAR', col('InvoiceDate')), fn('YEAR', literal('NOW()'))),
              where(fn('MONTH', col('InvoiceDate')), fn('MONTH', literal('NOW()')))
            ]
          };
          break;
        case 'Day':
        default:
          dateCondition = where(fn('DATE', col('InvoiceDate')), fn('CURDATE'));
          break;    
      }
    }


    // 2. Common where base
    const commonConditions = {
      [Op.and]: [
        { Status: { [Op.like]: 'Posted%' } },
        dateCondition
      ]
    };

    // 3. Receipt types
    const allReceiptTypes = [
      { label: 'Burial', apar: 'Burial Receipt', key: 'burial' },
      { label: 'Marriage', apar: 'Marriage Receipt', key: 'marriage' },
      { label: 'General', apar: 'Official Receipt', key: 'general' },
      { label: 'Cedula', apar: 'Community Tax Certificate', key: 'cedula' }
    ];
    
    let receiptTypes = allReceiptTypes;
    if (categories) {
      const categoryArray = categories.split(',');
      receiptTypes = allReceiptTypes.filter(rt => categoryArray.includes(rt.key));
    }

    // 4. Perform queries in parallel
    const totals = await Promise.all(
      receiptTypes.map(({ apar }) =>
        TransactionTableModel.findOne({
          attributes: [[fn('SUM', col('Total')), 'Total']],
          where: {
            ...commonConditions,
            APAR: apar
          },
          raw: true
        })
      )
    );

    // 5. Prepare final response with totals
    const result = {};
    let total = 0;

    receiptTypes.forEach(({ label }, index) => {
      const amount = parseFloat(totals[index]?.Total || 0);
      result[label] = amount.toFixed(2);
      total += amount;
    });

    result.Total = total.toFixed(2);

    res.json(result);

  } catch (error) {
    console.error('Error fetching receipt totals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.collectionCharts = (receiptType) => {
  return async (req, res) => {
    try {
      const results = await TransactionTableModel.findAll({
        attributes: [
          [fn('DATE', col('InvoiceDate')), 'Date'],
          [fn('SUM', col('Total')), 'Total']
        ],
        where: {
          APAR: receiptType,
          Status: 'Posted',
          InvoiceDate: {
            [Op.gte]: literal('DATE_SUB(CURDATE(), INTERVAL 5 DAY)')
          }
        },
        group: [fn('DATE', col('InvoiceDate'))],
        order: [[fn('DATE', col('InvoiceDate')), 'ASC']],
        raw: true
      });

      if (results.length > 0) {
        data = results.map(row => ({
          date: row.Date,
          total: parseFloat(row.Total).toFixed(2),
        }));
      } else {
        // Fallback data when no rows are found
        data = [
          { date: 'No Data', total: '0.00' }
        ];
      }

      res.json(data);

    } catch (err) {
      console.error('Error fetching chart receipt data:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

exports.collectionBarCharts = (receiptType) => {
  return async (req, res) => {
    try {
      const results = await TransactionTableModel.findAll({
        attributes: [
          [fn('DATE', col('InvoiceDate')), 'Date'],
          [fn('SUM', col('Total')), 'Total']
        ],
        where: {
          APAR: receiptType,
          Status: 'Posted',
          InvoiceDate: {
            [Op.gte]: literal('DATE_SUB(CURDATE(), INTERVAL 5 DAY)')
          }
        },
        group: [fn('DATE', col('InvoiceDate'))],
        order: [[fn('DATE', col('InvoiceDate')), 'ASC']],
        raw: true
      });

      let data = [];

      if (results.length > 0) {
        data = results.map(row => ({
          date: row.Date,
          total: parseFloat(row.Total).toFixed(2)
        }));
      } else {
        data = [{ date: 'No Data', total: '0.00' }];
      }

      res.json(data);

    } catch (error) {
      console.error('Error fetching vertical bar chart data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};
