var DataTypes = require("sequelize").DataTypes;
var _Apar = require("./apar");
var _AccountCategory = require("./accountCategory");
var _AccountSubType = require("./accountSubType");
var _AccountType = require("./accountType");
var _ApprovalAudit = require("./approvalAudit");
var _ApprovalMatrix = require("./approvalMatrix");
var _ApprovalMatrixTemp = require("./approvalMatrixTemp");
var _Approvers = require("./approvers");
var _ApproversTemp = require("./approversTemp");
var _AssessmentLevel = require("./assessmentLevel");
var _AssignSubdepartment = require("./assignSubdepartment");
var _Attachment = require("./attachment");
var _AttachmentTemp = require("./attachmentTemp");
var _AuditTrail = require("./auditTrail");
var _Bank = require("./bank");
var _Barangay = require("./barangay");
var _BeginningBalance = require("./beginningBalance");
var _Budget = require("./budget");
var _BudgetChange = require("./budgetChange");
var _BudgetType = require("./budgetType");
var _BuildingComponents = require("./buildingComponents");
var _BurialRecord = require("./burialRecord");
var _BusinessActivity = require("./businessActivity");
var _BusinessApplication = require("./businessApplication");
var _ChartofAccounts = require("./chartofAccounts");
var _Check = require("./check");
var _CitizensRegistration = require("./citizensRegistration");
var _ContraAccount = require("./contraAccount");
var _Currency = require("./currency");
var _Customer = require("./customer");
var _Department = require("./Department");
var _DocumentAccess = require("./documentAccess");
var _DocumentType = require("./documentType");
var _DocumentTypeCategory = require("./documentTypeCategory");
var _Documents = require("./documents");
var _Employee = require("./Employee");
var _EmploymentStatus = require("./EmploymentStatus");
var _Fields = require("./fields");
var _FinancialStatement = require("./financialStatement");
var _FiscalYear = require("./fiscalYear");
var _Funds = require("./funds");
var _GeneralLedger = require("./generalLedger");
var _GeneralRevision = require("./generalRevision");
var _HomeOwner = require("./homeOwner");
var _IndustryType = require("./industryType");
var _Item = require("./item");
var _ItemUnit = require("./itemUnit");
var _JournalEntryVoucher = require("./journalEntryVoucher");
var _Lgu = require("./lgu");
var _MarketValueMatrix = require("./marketValueMatrix");
var _MarriageRecord = require("./marriageRecord");
var _MatrixClassification = require("./matrixClassification");
var _MatrixLocationDescription = require("./matrixLocationDescription");
var _Module = require("./module");
var _ModuleAccess = require("./moduleAccess");
var _Municipality = require("./municipality");
var _Nationality = require("./Nationality");
var _NoticationTable = require("./noticationTable");
var _Ppe = require("./ppe");
var _PpeCategory = require("./ppeCategory");
var _PpeSupplier = require("./ppeSupplier");
var _PaymentMethod = require("./paymentMethod");
var _PaymentTerms = require("./paymentTerms");
var _Position = require("./Position");
var _Project = require("./project");
var _ProjectType = require("./projectType");
var _Property = require("./property");
var _PropertyAssessmentLevel = require("./propertyAssessmentLevel");
var _PropertyClassifications = require("./propertyClassifications");
var _PropertyCoOwners = require("./propertyCoOwners");
var _PropertyImproved = require("./propertyImproved");
var _PropertyTaxDeclaration = require("./propertyTaxDeclaration");
var _Province = require("./province");
var _PublicMarketTicketing = require("./publicMarketTicketing");
var _PurchaseItems = require("./purchaseItems");
var _Region = require("./region");
var _ScheduleofBaseunitMarketValue = require("./scheduleofBaseunitMarketValue");
var _ServiceInvoiceAccounts = require("./serviceInvoiceAccounts");
var _SubDepartment = require("./subDepartment");
var _SubFunds = require("./subFunds");
var _TaxCode = require("./taxCode");
var _TaxDeclarationProperty = require("./taxDeclarationProperty");
var _TransactionItems = require("./transactionItems");
var _TransactionProperty = require("./transactionProperty");
var _TransactionTable = require("./transactionTable");
var _TravelDocuments = require("./travelDocuments");
var _TravelOrder = require("./travelOrder");
var _TravelPayment = require("./travelPayment");
var _Travelers = require("./travelers");
var _UserAccess = require("./userAccess");
var _Users = require("./Users");
var _Vendor = require("./vendor");
var _VendorCustomerType = require("./vendorCustomerType");
var _VendorType = require("./vendorType");
var _BusinessPermit = require("./businessPermit");
var _UserUserAccess = require("./Useruseraccess");
var _DataSource = require("./dataSource");
var _Watermarks = require("./watermarks");
const chartofAccounts = require("./chartofAccounts");

function initModels(sequelize) {
  var Apar = _Apar(sequelize, DataTypes);
  var AccountCategory = _AccountCategory(sequelize, DataTypes);
  var AccountSubType = _AccountSubType(sequelize, DataTypes);
  var accountType = _AccountType(sequelize, DataTypes);
  var ApprovalAudit = _ApprovalAudit(sequelize, DataTypes);
  var ApprovalMatrix = _ApprovalMatrix(sequelize, DataTypes);
  var ApprovalMatrixTemp = _ApprovalMatrixTemp(sequelize, DataTypes);
  var Approvers = _Approvers(sequelize, DataTypes);
  var ApproversTemp = _ApproversTemp(sequelize, DataTypes);
  var AssessmentLevel = _AssessmentLevel(sequelize, DataTypes);
  var AssignSubdepartment = _AssignSubdepartment(sequelize, DataTypes);
  var Attachment = _Attachment(sequelize, DataTypes);
  var AttachmentTemp = _AttachmentTemp(sequelize, DataTypes);
  var AuditTrail = _AuditTrail(sequelize, DataTypes);
  var bank = _Bank(sequelize, DataTypes);
  var barangay = _Barangay(sequelize, DataTypes);
  var BeginningBalance = _BeginningBalance(sequelize, DataTypes);
  var Budget = _Budget(sequelize, DataTypes);
  var BudgetChange = _BudgetChange(sequelize, DataTypes);
  var BudgetType = _BudgetType(sequelize, DataTypes);
  var BuildingComponents = _BuildingComponents(sequelize, DataTypes);
  var BurialRecord = _BurialRecord(sequelize, DataTypes);
  var BusinessActivity = _BusinessActivity(sequelize, DataTypes);
  var BusinessApplication = _BusinessApplication(sequelize, DataTypes);
  var ChartofAccounts = _ChartofAccounts(sequelize, DataTypes);
  var Check = _Check(sequelize, DataTypes);
  var CitizensRegistration = _CitizensRegistration(sequelize, DataTypes);
  var ContraAccount = _ContraAccount(sequelize, DataTypes);
  var currency = _Currency(sequelize, DataTypes);
  var Customer = _Customer(sequelize, DataTypes);
  var department = _Department(sequelize, DataTypes);
  var DocumentAccess = _DocumentAccess(sequelize, DataTypes);
  var documentType = _DocumentType(sequelize, DataTypes);
  var documentTypeCategory = _DocumentTypeCategory(sequelize, DataTypes);
  var Documents = _Documents(sequelize, DataTypes);
  var employee = _Employee(sequelize, DataTypes);
  var employmentStatus = _EmploymentStatus(sequelize, DataTypes);
  var Fields = _Fields(sequelize, DataTypes);
  var FinancialStatement = _FinancialStatement(sequelize, DataTypes);
  var FiscalYear = _FiscalYear(sequelize, DataTypes);
  var Funds = _Funds(sequelize, DataTypes);
  var GeneralLedger = _GeneralLedger(sequelize, DataTypes);
  var generalRevision = _GeneralRevision(sequelize, DataTypes);
  var HomeOwner = _HomeOwner(sequelize, DataTypes);
  var industryType = _IndustryType(sequelize, DataTypes);
  var Item = _Item(sequelize, DataTypes);
  var itemUnit = _ItemUnit(sequelize, DataTypes);
  var JournalEntryVoucher = _JournalEntryVoucher(sequelize, DataTypes);
  var Lgu = _Lgu(sequelize, DataTypes);
  var MarketValueMatrix = _MarketValueMatrix(sequelize, DataTypes);
  var MarriageRecord = _MarriageRecord(sequelize, DataTypes);
  var MatrixClassification = _MatrixClassification(sequelize, DataTypes);
  var MatrixLocationDescription = _MatrixLocationDescription(sequelize, DataTypes);
  var Module = _Module(sequelize, DataTypes);
  var ModuleAccess = _ModuleAccess(sequelize, DataTypes);
  var municipality = _Municipality(sequelize, DataTypes);
  var nationality = _Nationality(sequelize, DataTypes);
  var NoticationTable = _NoticationTable(sequelize, DataTypes);
  var ppe = _Ppe(sequelize, DataTypes);
  var ppeCategory = _PpeCategory(sequelize, DataTypes);
  var ppeSupplier = _PpeSupplier(sequelize, DataTypes);
  var paymentMethod = _PaymentMethod(sequelize, DataTypes);
  var paymentTerms = _PaymentTerms(sequelize, DataTypes);
  var position = _Position(sequelize, DataTypes);
  var Project = _Project(sequelize, DataTypes);
  var ProjectType = _ProjectType(sequelize, DataTypes);
  var Property = _Property(sequelize, DataTypes);
  var PropertyAssessmentLevel = _PropertyAssessmentLevel(sequelize, DataTypes);
  var PropertyClassifications = _PropertyClassifications(sequelize, DataTypes);
  var PropertyCoOwners = _PropertyCoOwners(sequelize, DataTypes);
  var PropertyImproved = _PropertyImproved(sequelize, DataTypes);
  var PropertyTaxDeclaration = _PropertyTaxDeclaration(sequelize, DataTypes);
  var province = _Province(sequelize, DataTypes);
  var PublicMarketTicketing = _PublicMarketTicketing(sequelize, DataTypes);
  var PurchaseItems = _PurchaseItems(sequelize, DataTypes);
  var region = _Region(sequelize, DataTypes);
  var ScheduleofBaseunitMarketValue = _ScheduleofBaseunitMarketValue(sequelize, DataTypes);
  var ServiceInvoiceAccounts = _ServiceInvoiceAccounts(sequelize, DataTypes);
  var subDepartment = _SubDepartment(sequelize, DataTypes);
  var SubFunds = _SubFunds(sequelize, DataTypes);
  var taxCode = _TaxCode(sequelize, DataTypes);
  var TaxDeclarationProperty = _TaxDeclarationProperty(sequelize, DataTypes);
  var TransactionItems = _TransactionItems(sequelize, DataTypes);
  var TransactionProperty = _TransactionProperty(sequelize, DataTypes);
  var TransactionTable = _TransactionTable(sequelize, DataTypes);
  var TravelDocuments = _TravelDocuments(sequelize, DataTypes);
  var TravelOrder = _TravelOrder(sequelize, DataTypes);
  var TravelPayment = _TravelPayment(sequelize, DataTypes);
  var Travelers = _Travelers(sequelize, DataTypes);
  var userAccess = _UserAccess(sequelize, DataTypes);
  var users = _Users(sequelize, DataTypes);
  var vendor = _Vendor(sequelize, DataTypes);
  var vendorCustomerType = _VendorCustomerType(sequelize, DataTypes);
  var vendorType = _VendorType(sequelize, DataTypes);
  var BusinessPermit = _BusinessPermit(sequelize, DataTypes);
  var UserUserAccess = _UserUserAccess(sequelize, DataTypes);
  var DataSource = _DataSource(sequelize, DataTypes);
  var Watermarks = _Watermarks(sequelize, DataTypes);

  Watermarks.belongsTo(documentType, { as: "DocumentType", foreignKey: "DocumentID" });
  documentType.hasMany(Watermarks, { as: "Watermarks", foreignKey: "DocumentID" });

  BudgetChange.belongsTo(BudgetType, { as: "BudgetType", foreignKey: "BudgetTypeID" });
  BudgetType.hasMany(BudgetChange, { as: "BudgetChanges", foreignKey: "BudgetTypeID" });
  Apar.belongsTo(Customer, { as: "Customer", foreignKey: "CustomerID" });
  Customer.hasMany(Apar, { as: "APARs", foreignKey: "CustomerID" });
  PropertyCoOwners.belongsTo(Customer, { as: "CoOwner", foreignKey: "CoOwnerID" });
  Customer.hasMany(PropertyCoOwners, { as: "PropertyCoOwners", foreignKey: "CoOwnerID" });
  employee.belongsTo(department, { as: "Department", foreignKey: "DepartmentID" });
  department.hasMany(employee, { as: "Employees", foreignKey: "DepartmentID" });
  ApprovalMatrix.belongsTo(documentType, { as: "DocumentType", foreignKey: "DocumentTypeID" });
  documentType.hasMany(ApprovalMatrix, { as: "ApprovalMatrices", foreignKey: "DocumentTypeID" });

  // newly added starts
  ApprovalMatrix.hasMany(Approvers, { foreignKey: 'LinkID', sourceKey: 'ID' });
  Approvers.belongsTo(ApprovalMatrix, { foreignKey: 'LinkID', targetKey: 'ID' });

  TravelOrder.hasMany(Travelers, { foreignKey: 'LinkID', sourceKey: 'LinkID', as: 'Travelers' });
  TravelOrder.hasMany(TravelPayment, { foreignKey: 'LinkID', sourceKey: 'LinkID', as: 'TravelPayments' });
  TravelOrder.hasMany(TravelDocuments, { foreignKey: 'LinkID', sourceKey: 'LinkID', as: 'TravelDocuments' });
  TravelOrder.hasMany(Attachment, { foreignKey: 'LinkID', sourceKey: 'LinkID', as: 'Attachments' });
  TravelOrder.hasOne(TransactionTable, { foreignKey: 'LinkID', sourceKey: 'LinkID', as: 'Transaction' });


  Travelers.belongsTo(TravelOrder, { foreignKey: 'LinkID', targetKey: 'LinkID' });
  TravelPayment.belongsTo(TravelOrder, { foreignKey: 'LinkID', targetKey: 'LinkID' });
  TravelDocuments.belongsTo(TravelOrder, { foreignKey: 'LinkID', targetKey: 'LinkID' });
  Attachment.belongsTo(TravelOrder, { foreignKey: 'LinkID', targetKey: 'LinkID' });
  TransactionTable.belongsTo(TravelOrder, { foreignKey: 'LinkID', targetKey: 'LinkID' });
  TravelOrder.belongsTo(department, { as: "BudgetDepartment", foreignKey: "BudgetID" });

  TransactionTable.hasMany(JournalEntryVoucher, { foreignKey: 'LinkID', sourceKey: 'LinkID', as: 'JournalEntries' });
  TransactionTable.hasMany(Attachment, { foreignKey: 'LinkID', sourceKey: 'LinkID', as: 'Attachments' });
  JournalEntryVoucher.belongsTo(TransactionTable, { foreignKey: 'LinkID', targetKey: 'LinkID' });
  Attachment.belongsTo(TransactionTable, { foreignKey: 'LinkID', targetKey: 'LinkID' });

  TransactionTable.belongsTo(employee, { foreignKey: 'RequestedBy', targetKey: 'ID', as: 'RequestedByEmployee' });
  TransactionTable.belongsTo(Funds, { foreignKey: 'FundsID', targetKey: 'ID', as: 'Funds' });

  TransactionTable.belongsTo(FiscalYear, { foreignKey: 'FiscalYearID', as: 'FiscalYear' });
  TransactionTable.belongsTo(Project, { foreignKey: 'ProjectID', as: 'Project' });
  TransactionTable.belongsTo(department, { foreignKey: 'ResponsibilityCenter', as: 'Department' });

  BeginningBalance.belongsTo(ChartofAccounts, { as: 'ChartOfAccounts', foreignKey: 'ChartofAccountsCode' });

  TransactionTable.hasMany(PurchaseItems, { foreignKey: 'LinkID', sourceKey: 'LinkID', as: 'PurchaseItems' });
  PurchaseItems.belongsTo(TransactionTable, { foreignKey: 'LinkID', targetKey: 'LinkID' });

  TransactionTable.belongsTo(ChartofAccounts, { foreignKey: 'ContraAccountID', as: 'ContraAccount' });

  TransactionTable.hasMany(TransactionItems, { foreignKey: "LinkID", sourceKey: "LinkID", as: "TransactionItemsAll" });
  TransactionItems.belongsTo(TransactionTable, { foreignKey: "LinkID", targetKey: "LinkID", as: "TransactionTable" });

  TransactionTable.belongsTo(vendor, { as: "Vendor", foreignKey: "VendorID" });

  TransactionItems.belongsTo(Budget, { as: "ChargeAccount", foreignKey: "ChargeAccountID" });

  PublicMarketTicketing.hasOne(TransactionTable, { foreignKey: 'LinkID', sourceKey: 'LinkID', as: 'Transaction' });
  TransactionTable.belongsTo(PublicMarketTicketing, { foreignKey: 'LinkID', targetKey: 'LinkID' });

  TransactionTable.belongsTo(BurialRecord, { as: "BurialRecord", targetKey: "LinkID", foreignKey: "LinkID" });

  users.hasMany(ModuleAccess, {
    foreignKey: 'UserAccessID',
    sourceKey: 'UserAccessID',
    as: 'moduleAccess'
  });
  ModuleAccess.belongsTo(users, {
    foreignKey: 'UserAccessID',
    targetKey: 'UserAccessID',
  });

  // TransactionTable.js
  TransactionTable.hasMany(TransactionProperty, {
    foreignKey: 'LinkID',
    sourceKey: 'LinkID',
    as: 'properties'
  });

  // TransactionProperty.js
  TransactionProperty.belongsTo(TransactionTable, {
    foreignKey: 'LinkID',
    targetKey: 'LinkID',
    as: 'transaction'
  });


  // newly added ends

  documentType.belongsTo(documentTypeCategory, { as: "DocumentTypeCategory", foreignKey: "DocumentTypeCategoryID" });
  documentTypeCategory.hasMany(documentType, { as: "DocumentTypes", foreignKey: "DocumentTypeCategoryID" });

  employee.belongsTo(employmentStatus, { as: "EmploymentStatus", foreignKey: "EmploymentStatusID" });
  employmentStatus.hasMany(employee, { as: "Employees", foreignKey: "EmploymentStatusID" });
  Customer.belongsTo(industryType, { as: "IndustryType", foreignKey: "IndustryTypeID" });
  industryType.hasMany(Customer, { as: "Customers", foreignKey: "IndustryTypeID" });

  industryType.hasMany(vendor, { as: "Vendors", foreignKey: "IndustryTypeID" });
  employee.belongsTo(nationality, { as: "Nationality", foreignKey: "NationalityID" });
  nationality.hasMany(employee, { as: "Employees", foreignKey: "NationalityID" });
  Customer.belongsTo(paymentMethod, { as: "PaymentMethod", foreignKey: "PaymentMethodID" });
  paymentMethod.hasMany(Customer, { as: "Customers", foreignKey: "PaymentMethodID" });

  paymentMethod.hasMany(vendor, { as: "Vendors", foreignKey: "PaymentMethodID" });
  employee.belongsTo(position, { as: "Position", foreignKey: "PositionID" });
  employee.belongsTo(barangay, { as: "Barangay", foreignKey: "BarangayID" });
  barangay.hasMany(employee, { as: "Employees", foreignKey: "BarangayID" });
  employee.belongsTo(municipality, { as: "Municipality", foreignKey: "MunicipalityID" });
  municipality.hasMany(employee, { as: "Employees", foreignKey: "MunicipalityID" });
  employee.belongsTo(province, { as: "Province", foreignKey: "ProvinceID" });
  province.hasMany(employee, { as: "Employees", foreignKey: "ProvinceID" });
  employee.belongsTo(region, { as: "Region", foreignKey: "RegionID" });
  region.hasMany(employee, { as: "Employees", foreignKey: "RegionID" });
  bank.belongsTo(currency, { as: "Currency", foreignKey: "CurrencyID" });
  position.hasMany(employee, { as: "Employees", foreignKey: "PositionID" });
  Property.belongsTo(Property, { as: "ID_Property", foreignKey: "ID" });
  // Property.hasOne(Property, { as: "Property", foreignKey: "ID"});
  Apar.belongsTo(vendor, { as: "Vendor", foreignKey: "VendorID" });

  vendorType.hasMany(vendor, { as: "Vendors", foreignKey: "TypeID" });
  // subDepartment.belongsTo(department, { as: "Department", foreignKey: "DepartmentID"});
  userAccess.hasMany(ModuleAccess, { as: "ModuleAccesses", foreignKey: "UserAccessID" });
  ModuleAccess.belongsTo(Module, { as: "Module", foreignKey: "ModuleID" });
  userAccess.belongsToMany(users, {
    through: UserUserAccess,
    foreignKey: 'UserAccessID',
    otherKey: 'UserID',
    as: 'users'
  });
  users.belongsToMany(
    userAccess, {
    through: UserUserAccess,
    foreignKey: 'UserID',
    otherKey: 'UserAccessID',
    as: 'accessList'
  });
  users.belongsTo(employee, { as: "Employee", foreignKey: "EmployeeID" });
  // AccountSubType.belongsTo(accountType, { as: "AccountType", foreignKey: "AccountTypeID"});
  Item.belongsTo(itemUnit, { as: "ItemUnit", foreignKey: "UnitID" });
  Item.belongsTo(taxCode, { as: "TaxCode", foreignKey: "TAXCodeID" });
  Item.belongsTo(bank, { as: "ChargeAccount", foreignKey: "ChargeAccountID" });
  ServiceInvoiceAccounts.belongsTo(ChartofAccounts, { as: "Account", foreignKey: "ChartofAccountsID" });
  Project.belongsTo(ProjectType, { as: "ProjectType", foreignKey: "ProjectTypeID" });

  Customer.belongsTo(region, { as: "region", foreignKey: "RegionID" });
  Customer.belongsTo(province, { as: "province", foreignKey: "ProvinceID" });
  Customer.belongsTo(municipality, { as: "municipality", foreignKey: "MunicipalityID" });
  Customer.belongsTo(barangay, { as: "barangay", foreignKey: "BarangayID" });
  Customer.belongsTo(paymentTerms, { as: "paymentTerms", foreignKey: "PaymentTermsID" });
  Customer.belongsTo(paymentMethod, { as: "paymentMethod", foreignKey: "PaymentMethodID" });
  Customer.belongsTo(taxCode, { as: "taxCode", foreignKey: "TaxCodeID" });
  Customer.belongsTo(industryType, { as: "industryType", foreignKey: "IndustryTypeID" });

  ChartofAccounts.belongsTo(accountType, { as: "AccountType", foreignKey: "AccountTypeID" });
  ChartofAccounts.belongsTo(AccountSubType, { as: "AccountSubType", foreignKey: "AccountSubTypeID" });
  ChartofAccounts.belongsTo(AccountCategory, { as: "AccountCategory", foreignKey: "AccountCategoryID" });

  AccountSubType.belongsTo(accountType, { as: "AccountType", foreignKey: "AccountTypeID" });
  AccountCategory.belongsTo(AccountSubType, { as: "AccountSubType", foreignKey: "AccountSubTypeID" });


  vendor.belongsTo(industryType, { as: "IndustryType", foreignKey: "IndustryTypeID" });
  vendor.belongsTo(paymentMethod, { as: "PaymentMethod", foreignKey: "PaymentMethodID" });
  vendor.hasMany(Apar, { as: "APARs", foreignKey: "VendorID" });
  vendor.belongsTo(vendorType, { as: "Type", foreignKey: "TypeID" });
  vendor.belongsTo(region, { as: "Region", foreignKey: "RegionID" });
  vendor.belongsTo(province, { as: "Province", foreignKey: "ProvinceID" });
  vendor.belongsTo(municipality, { as: "Municipality", foreignKey: "MunicipalityID" });
  vendor.belongsTo(barangay, { as: "Barangay", foreignKey: "BarangayID" });
  vendor.belongsTo(paymentTerms, { as: "PaymentTerms", foreignKey: "PaymentTermsID" });
  vendor.belongsTo(taxCode, { as: "TaxCode", foreignKey: "TaxCodeID" });
  // vendor.belongsTo(bank, { as: "Bank", foreignKey: "BankID"});
  // vendor.belongsTo(currency, { as: "Currency", foreignKey: "CurrencyID"});

  ppe.belongsTo(ppeCategory, { as: "Category", foreignKey: "CategoryID" });
  ppe.belongsTo(ppeSupplier, { as: "Supplier", foreignKey: "SupplierID" });


  TravelOrder.belongsTo(department, { as: "Department", foreignKey: "DepartmentID" });
  TravelOrder.belongsTo(position, { as: "Position", foreignKey: "PositionID" });


  BeginningBalance.belongsTo(Funds, { as: "Funds", foreignKey: "FundsID" });
  BeginningBalance.belongsTo(FiscalYear, { as: "FiscalYear", foreignKey: "FiscalYearID" });

  Budget.belongsTo(FiscalYear, { as: "FiscalYear", foreignKey: "FiscalYearID" });
  Budget.belongsTo(department, { as: "Department", foreignKey: "DepartmentID" });
  Budget.belongsTo(subDepartment, { as: "SubDepartment", foreignKey: "SubDepartmentID" });
  Budget.belongsTo(Funds, { as: "Funds", foreignKey: "FundID" });
  Budget.belongsTo(ChartofAccounts, { as: "ChartofAccounts", foreignKey: "ChartofAccountsID" });
  ChartofAccounts.hasMany(Budget, { as: "Budget", foreignKey: "ChartofAccountsID" });
  Budget.belongsTo(Project, { as: "Project", foreignKey: "ProjectID" });
  Budget.belongsTo(Lgu, { as: "Lgu", foreignKey: "ProjectID" });
  Budget.belongsTo(employee, { as: "Employee", foreignKey: "CreatedBy" });

  TransactionTable.belongsTo(Budget, { as: "Budget", foreignKey: "BudgetID" });
  TransactionTable.belongsTo(Budget, { as: "Target", foreignKey: "TargetID" });
  TransactionTable.belongsTo(Funds, { as: "sourceFunds", foreignKey: "FundsID" });
  TransactionTable.belongsTo(Funds, { as: "targetFunds", foreignKey: "TargetID" });
  TransactionTable.belongsTo(Customer, { as: "Customer", foreignKey: "CustomerID" });
  TransactionTable.belongsTo(employee, { as: "Employee", foreignKey: "EmployeeID" });
  TransactionTable.belongsTo(documentType, { as: "DocumentType", foreignKey: "DocumentTypeID" });
  TransactionTable.belongsTo(employee, { as: "CreatedByUSER", foreignKey: "CreatedBy" });
  TransactionTable.belongsTo(TransactionItems, { as: "TransactionItems", foreignKey: "LinkID" });

  TransactionTable.hasMany(GeneralLedger, {
    as: 'GeneralLedger',
    foreignKey: 'LinkID',
    sourceKey: 'LinkID'
  });
  TransactionTable.hasMany(ApprovalAudit, {
    as: 'ApprovalAudit',
    foreignKey: 'LinkID',
    sourceKey: 'LinkID'
  });
  // TransactionTable.belongsTo(GeneralLedger, { as: "GeneralLedger", foreignKey: "LinkID"});
  // TransactionTable.belongsTo(ApprovalAudit, { as: "ApprovalAudit", foreignKey: "LinkID"});
  TransactionTable.belongsTo(Lgu, { as: "Lgu", foreignKey: "ID" });
  TransactionItems.belongsTo(Item, { as: "Item", foreignKey: "ItemID" })
  SubFunds.belongsTo(Funds, { as: "Funds", foreignKey: "FundsID" });
  Funds.hasMany(SubFunds, { as: "SubFunds", foreignKey: "FundsID" });
  ApprovalAudit.belongsTo(employee, { as: "Employee", foreignKey: "PositionorEmployeeID" });

  MarriageRecord.belongsTo(TransactionTable, {
    as: "TransactionTable",
    targetKey: "LinkID",
    foreignKey: "LinkID"
  });  // Funds.belongsTo(FiscalYear, { as: "FiscalYear", foreignKey: "FiscalYearID"});
  BurialRecord.belongsTo(TransactionTable, {
    as: "TransactionTable",
    targetKey: "LinkID",
    foreignKey: "LinkID"
  });

  Check.belongsTo(bank, { as: "Bank", foreignKey: "BankID" });
  Check.belongsTo(TransactionTable, { as: "Disbursement", foreignKey: "DisbursementID", targetKey: "LinkID" });
  Check.belongsTo(employee, { as: "SignatoryOne", foreignKey: "SignatoryOneID" });
  Check.belongsTo(employee, { as: "SignatoryTwo", foreignKey: "SignatoryTwoID" });

  Lgu.belongsTo(municipality, { as: "Municipality", foreignKey: "MunicipalityID" });
  Lgu.belongsTo(barangay, { as: "Barangay", foreignKey: "BarangayID" });
  Lgu.belongsTo(province, { as: "Province", foreignKey: "ProvinceID" });
  Lgu.belongsTo(region, { as: "Region", foreignKey: "RegionID" });
  GeneralLedger.belongsTo(ChartofAccounts, {
    as: "ChartofAccounts",
    targetKey: "AccountCode",
    foreignKey: "AccountCode"
  });


  const models = [Apar,
    AccountCategory,
    AccountSubType,
    accountType,
    ApprovalAudit,
    ApprovalMatrix,
    ApprovalMatrixTemp,
    Approvers,
    ApproversTemp,
    AssessmentLevel,
    AssignSubdepartment,
    Attachment,
    AttachmentTemp,
    AuditTrail,
    bank,
    barangay,
    BeginningBalance,
    Budget,
    BudgetChange,
    BudgetType,
    BuildingComponents,
    BurialRecord,
    BusinessActivity,
    BusinessApplication,
    ChartofAccounts,
    Check,
    CitizensRegistration,
    ContraAccount,
    currency,
    Customer,
    department,
    DocumentAccess,
    documentType,
    documentTypeCategory,
    Documents,
    employee,
    employmentStatus,
    Fields,
    FinancialStatement,
    FiscalYear,
    Funds,
    GeneralLedger,
    generalRevision,
    HomeOwner,
    industryType,
    Item,
    itemUnit,
    JournalEntryVoucher,
    Lgu,
    MarketValueMatrix,
    MarriageRecord,
    MatrixClassification,
    MatrixLocationDescription,
    Module,
    ModuleAccess,
    municipality,
    nationality,
    NoticationTable,
    ppe,
    ppeCategory,
    ppeSupplier,
    paymentMethod,
    paymentTerms,
    position,
    Project,
    ProjectType,
    Property,
    PropertyAssessmentLevel,
    PropertyClassifications,
    PropertyCoOwners,
    PropertyImproved,
    PropertyTaxDeclaration,
    province,
    PublicMarketTicketing,
    PurchaseItems,
    region,
    ScheduleofBaseunitMarketValue,
    ServiceInvoiceAccounts,
    subDepartment,
    SubFunds,
    taxCode,
    TaxDeclarationProperty,
    TransactionItems,
    TransactionProperty,
    TransactionTable,
    TravelDocuments,
    TravelOrder,
    TravelPayment,
    Travelers,
    userAccess,
    users,
    vendor,
    vendorCustomerType,
    vendorType,
    UserUserAccess,
    BusinessPermit,
    DataSource,
    Watermarks
  ]

  for (const modelName in models) {
    if (models[modelName].options) {
      models[modelName].options.freezeTableName = true;
    }
  }
  return {
    Apar,
    AccountCategory,
    AccountSubType,
    accountType,
    ApprovalAudit,
    ApprovalMatrix,
    ApprovalMatrixTemp,
    Approvers,
    ApproversTemp,
    AssessmentLevel,
    AssignSubdepartment,
    Attachment,
    AttachmentTemp,
    AuditTrail,
    bank,
    barangay,
    BeginningBalance,
    Budget,
    BudgetChange,
    BudgetType,
    BuildingComponents,
    BurialRecord,
    BusinessActivity,
    BusinessApplication,
    ChartofAccounts,
    Check,
    CitizensRegistration,
    ContraAccount,
    currency,
    Customer,
    department,
    DocumentAccess,
    documentType,
    documentTypeCategory,
    Documents,
    employee,
    employmentStatus,
    Fields,
    FinancialStatement,
    FiscalYear,
    Funds,
    GeneralLedger,
    generalRevision,
    HomeOwner,
    industryType,
    Item,
    itemUnit,
    JournalEntryVoucher,
    Lgu,
    MarketValueMatrix,
    MarriageRecord,
    MatrixClassification,
    MatrixLocationDescription,
    Module,
    ModuleAccess,
    municipality,
    nationality,
    NoticationTable,
    ppe,
    ppeCategory,
    ppeSupplier,
    paymentMethod,
    paymentTerms,
    position,
    Project,
    ProjectType,
    Property,
    PropertyAssessmentLevel,
    PropertyClassifications,
    PropertyCoOwners,
    PropertyImproved,
    PropertyTaxDeclaration,
    province,
    PublicMarketTicketing,
    PurchaseItems,
    region,
    ScheduleofBaseunitMarketValue,
    ServiceInvoiceAccounts,
    subDepartment,
    SubFunds,
    taxCode,
    TaxDeclarationProperty,
    TransactionItems,
    TransactionProperty,
    TransactionTable,
    TravelDocuments,
    TravelOrder,
    TravelPayment,
    Travelers,
    userAccess,
    users,
    vendor,
    vendorCustomerType,
    vendorType,
    UserUserAccess,
    BusinessPermit,
    DataSource,
    Watermarks
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;