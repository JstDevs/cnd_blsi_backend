const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
// app.use(cors());
// const corsOptions = {
//   origin: 'https://cnd-project.vercel.app',
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// };
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://cnd-project.vercel.app',
      'https://staging-canvas.testthelink.online',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://192.168.1.215:3000', // allow LAN frontend host
    ];

    // Allow requests with no origin (Postman, curl, mobile apps)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));




app.use(bodyParser.json());
const path = require('path');
// app.use(logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
// app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/static/public', express.static(path.join(__dirname, 'public')));
require("dotenv").config();
const authRoutes = require('./routes/auth');
// require("./config/database.js");
const accountcategoryRoutes = require('./routes/accountCategory');
const generalservicerecipt = require("./routes/generalservicerecipt")
const taxcertificate = require("./routes/taxcertificate")
const communityTaxIndividualRoutes = require('./routes/communityTaxIndividual');
const accountsubtypeRoutes = require('./routes/accountSubType');
const accounttypeRoutes = require('./routes/accountType');
const aparRoutes = require('./routes/apar');
const approvalauditRoutes = require('./routes/approvalAudit');
const approvalmatrixRoutes = require('./routes/approvalMatrix');
const approvalmatrixtempRoutes = require('./routes/approvalMatrixTemp');
const approversRoutes = require('./routes/approvers');
const approverstempRoutes = require('./routes/approversTemp');
const assessmentlevelRoutes = require('./routes/assessmentLevel');
const assignsubdepartmentRoutes = require('./routes/assignSubdepartment');
const attachmentRoutes = require('./routes/attachment');
const attachmenttempRoutes = require('./routes/attachmentTemp');
const audittrailRoutes = require('./routes/auditTrail');
const bankRoutes = require('./routes/bank');
const barangayRoutes = require('./routes/barangay');
const beginningbalanceRoutes = require('./routes/beginningBalance');
const budgetRoutes = require('./routes/budget');
const budgetchangeRoutes = require('./routes/budgetChange');
const budgettypeRoutes = require('./routes/budgetType');
const buildingcomponentsRoutes = require('./routes/buildingComponents');
const burialrecordRoutes = require('./routes/burialRecord');
const businessactivityRoutes = require('./routes/businessActivity');
const businessapplicationRoutes = require('./routes/businessApplication');
const businessPermitRoutes = require('./routes/businessPermit');
const chartofaccountsRoutes = require('./routes/chartofAccounts');
const checkRoutes = require('./routes/check');
const citizensregistrationRoutes = require('./routes/citizensRegistration');
const contraaccountRoutes = require('./routes/contraAccount');
const currencyRoutes = require('./routes/currency');
const customerRoutes = require('./routes/customer');
const departmentRoutes = require('./routes/department');
const documentaccessRoutes = require('./routes/documentAccess');
const documentsRoutes = require('./routes/documents');
const documenttypeRoutes = require('./routes/documentType');
const documenttypecategoryRoutes = require('./routes/documentTypeCategory');
const employeeRoutes = require('./routes/employee');
const employmentstatusRoutes = require('./routes/employmentStatus');
const fieldsRoutes = require('./routes/fields');
const financialstatementRoutes = require('./routes/financialStatement');
const fiscalyearRoutes = require('./routes/fiscalYear');
const fundsRoutes = require('./routes/funds');
const generalledgerRoutes = require('./routes/generalLedger');
const generalrevisionRoutes = require('./routes/generalRevision');
const homeownerRoutes = require('./routes/homeOwner');
const industrytypeRoutes = require('./routes/industryType');

const itemRoutes = require('./routes/item');
const itemunitRoutes = require('./routes/itemUnit');
const journalentryvoucherRoutes = require('./routes/journalEntryVoucher');
const lguRoutes = require('./routes/lgu');
const obligationRequestRoutes = require('./routes/obligationRequest');
const disbursementVoucherRoutes = require('./routes/disbursementVoucher');
const disbursementJournalsRoutes = require('./routes/disbursementJournals');
const generalJournalRoutes = require('./routes/generalJournal');
const fundUtilizationRequestRoutes = require('./routes/fundUtilizationRequest');
const marketvaluematrixRoutes = require('./routes/marketValueMatrix');
const marriagerecordRoutes = require('./routes/marriageRecord');
const matrixclassificationRoutes = require('./routes/matrixClassification');
const matrixlocationdescriptionRoutes = require('./routes/matrixLocationDescription');
const moduleRoutes = require('./routes/module');
const moduleaccessRoutes = require('./routes/moduleAccess');
const municipalityRoutes = require('./routes/municipality');
const nationalityRoutes = require('./routes/nationality');
const noticationtableRoutes = require('./routes/noticationTable');
const paymentmethodRoutes = require('./routes/paymentMethod');
const paymenttermsRoutes = require('./routes/paymentTerms');
const positionRoutes = require('./routes/position');
const ppeRoutes = require('./routes/ppe');
const ppecategoryRoutes = require('./routes/ppeCategory');
const ppesupplierRoutes = require('./routes/ppeSupplier');
const projectRoutes = require('./routes/project');
const projecttypeRoutes = require('./routes/projectType');
const propertyRoutes = require('./routes/property');
const propertyassessmentlevelRoutes = require('./routes/propertyAssessmentLevel');
const propertyclassificationsRoutes = require('./routes/propertyClassifications');
const propertycoownersRoutes = require('./routes/propertyCoOwners');
const propertyimprovedRoutes = require('./routes/propertyImproved');
const propertytaxdeclarationRoutes = require('./routes/propertyTaxDeclaration');
const provinceRoutes = require('./routes/province');
const publicMarketTicketingRoutes = require('./routes/publicMarketTicketing');
const purchaseitemsRoutes = require('./routes/purchaseItems');
const regionRoutes = require('./routes/region');
const scheduleofbaseunitmarketvalueRoutes = require('./routes/scheduleofBaseunitMarketValue');
const serviceinvoiceaccountsRoutes = require('./routes/serviceInvoiceAccounts');
const subdepartmentRoutes = require('./routes/subDepartment');
const subfundsRoutes = require('./routes/subFunds');
const taxcodeRoutes = require('./routes/taxCode');
const taxdeclarationpropertyRoutes = require('./routes/taxDeclarationProperty');
const transactionitemsRoutes = require('./routes/transactionItems');
const transactionpropertyRoutes = require('./routes/transactionProperty');
const transactiontableRoutes = require('./routes/transactionTable');
const traveldocumentsRoutes = require('./routes/travelDocuments');
const travelersRoutes = require('./routes/travelers');
const travelorderRoutes = require('./routes/travelOrder');
const travelpaymentRoutes = require('./routes/travelPayment');
const useraccessRoutes = require('./routes/userAccess');
const usersRoutes = require('./routes/users');
const useruseraccessRoutes = require('./routes/Useruseraccess');
const vendorRoutes = require('./routes/vendor');
const vendorcustomertypeRoutes = require('./routes/vendorCustomerType');
const vendortypeRoutes = require('./routes/vendorType');
const purchaseRequestRoutes = require('./routes/purchaseRequest');
const taxcertificatecorp = require('./routes/taxcertificatecorp')
const realpropertytax = require("./routes/realpropertytax")
const cashbook = require("./routes/cashbook")
const collectionReport = require("./routes/collectionreport")
// Moved higher up
const saoob = require("./routes/saoob")
const bir = require("./routes/bir")
const trialbalance = require("./routes/trialbalance")
const generalledger = require("./routes/generalLedger")
const subsidiaryleadger = require("./routes/subsidiaryleadger")
const trialBalanceReport = require("./routes/trialBalanceReport")
const financialStatementsReports = require("./routes/financialStatementsReports")
const statementOfComparison = require("./routes/statementOfComparison")
const statementOfAppropriations = require("./routes/statementOfAppropriations");
const budgetReport = require("./routes/budgetReport");
const budgetDetails = require("./routes/budgetDetails");
const budgetAllotment = require("./routes/budgetAllotment");
const budgetSummary = require("./routes/budgetSummary");
const budgetSupplemental = require("./routes/budgetSupplemental");
const budgetTransfer = require("./routes/budgetTransfer");
const fundTransfer = require("./routes/fundTransfer");
const chequeGenerator = require("./routes/chequeGenerator");
const profileDashboard = require("./routes/profileDashboard");
const dataSourceRoutes = require('./routes/dataSource');
const watermarksRoutes = require('./routes/watermarks');
const logoImagesRoutes = require('./routes/logoimages');
const { profile } = require('console');
app.use('/auth', authRoutes);
app.use('/accountcategory', accountcategoryRoutes);
app.use('/accountsubtype', accountsubtypeRoutes);
app.use('/accounttype', accounttypeRoutes);
app.use('/apar', aparRoutes);
app.use('/approvalaudit', approvalauditRoutes);
app.use('/approvalmatrix', approvalmatrixRoutes);
app.use('/approvalmatrixtemp', approvalmatrixtempRoutes);
app.use('/approvers', approversRoutes);
app.use('/approverstemp', approverstempRoutes);
app.use('/assessmentlevel', assessmentlevelRoutes);
app.use('/assignsubdepartment', assignsubdepartmentRoutes);
app.use('/attachment', attachmentRoutes);
app.use('/attachmenttemp', attachmenttempRoutes);
app.use('/audittrail', audittrailRoutes);
app.use('/bank', bankRoutes);
app.use('/barangay', barangayRoutes);
app.use('/beginningbalance', beginningbalanceRoutes);
app.use('/budget', budgetRoutes);
app.use('/budgetchange', budgetchangeRoutes);
app.use('/budgettype', budgettypeRoutes);
app.use('/buildingcomponents', buildingcomponentsRoutes);
app.use('/burialrecord', burialrecordRoutes);
app.use('/businessactivity', businessactivityRoutes);
app.use('/businessapplication', businessapplicationRoutes);
app.use('/business-permit', businessPermitRoutes);
app.use('/chartofaccounts', chartofaccountsRoutes);
app.use('/check', checkRoutes);
app.use('/citizensregistration', citizensregistrationRoutes);
app.use('/contraaccount', contraaccountRoutes);
app.use('/currency', currencyRoutes);
app.use('/customer', customerRoutes);
app.use('/department', departmentRoutes);
app.use('/documentaccess', documentaccessRoutes);
app.use('/documents', documentsRoutes);
app.use('/documenttype', documenttypeRoutes);
app.use('/documenttypecategory', documenttypecategoryRoutes);
app.use('/employee', employeeRoutes);
app.use('/employmentstatus', employmentstatusRoutes);
app.use('/fields', fieldsRoutes);
app.use('/financialstatement', financialstatementRoutes);
app.use('/fiscalyear', fiscalyearRoutes);
app.use('/funds', fundsRoutes);
app.use('/generalledger', generalledgerRoutes);
app.use('/generalrevision', generalrevisionRoutes);
app.use('/homeowner', homeownerRoutes);
app.use('/industrytype', industrytypeRoutes);

app.use('/item', itemRoutes);
app.use('/itemunit', itemunitRoutes);
app.use('/journalEntryVoucher', journalentryvoucherRoutes);
app.use('/lgu', lguRoutes);
app.use('/obligationRequest', obligationRequestRoutes);
app.use('/disbursementVoucher', disbursementVoucherRoutes);
app.use('/disbursementJournals', disbursementJournalsRoutes);
app.use('/generalJournal', generalJournalRoutes);
app.use('/fundUtilizationRequest', fundUtilizationRequestRoutes);
app.use('/marketvaluematrix', marketvaluematrixRoutes);
app.use('/marriagerecord', marriagerecordRoutes);
app.use('/matrixclassification', matrixclassificationRoutes);
app.use('/matrixlocationdescription', matrixlocationdescriptionRoutes);
app.use('/module', moduleRoutes);
app.use('/moduleaccess', moduleaccessRoutes);
app.use('/municipality', municipalityRoutes);
app.use('/nationality', nationalityRoutes);
app.use('/noticationtable', noticationtableRoutes);
app.use('/paymentmethod', paymentmethodRoutes);
app.use('/paymentterms', paymenttermsRoutes);
app.use('/position', positionRoutes);
app.use('/ppe', ppeRoutes);
app.use('/ppecategory', ppecategoryRoutes);
app.use('/ppesupplier', ppesupplierRoutes);
app.use('/project', projectRoutes);
app.use('/projecttype', projecttypeRoutes);
app.use('/property', propertyRoutes);
app.use('/propertyassessmentlevel', propertyassessmentlevelRoutes);
app.use('/propertyclassifications', propertyclassificationsRoutes);
app.use('/propertycoowners', propertycoownersRoutes);
app.use('/propertyimproved', propertyimprovedRoutes);
app.use('/propertytaxdeclaration', propertytaxdeclarationRoutes);
app.use('/province', provinceRoutes);
app.use("/public-market-ticketing", publicMarketTicketingRoutes);
app.use('/purchaseitems', purchaseitemsRoutes);
app.use('/region', regionRoutes);
app.use('/scheduleofbaseunitmarketvalue', scheduleofbaseunitmarketvalueRoutes);
app.use('/serviceinvoiceaccounts', serviceinvoiceaccountsRoutes);
app.use('/subdepartment', subdepartmentRoutes);
app.use('/subfunds', subfundsRoutes);
app.use('/taxcode', taxcodeRoutes);
app.use('/taxdeclarationproperty', taxdeclarationpropertyRoutes);
app.use('/transactionitems', transactionitemsRoutes);
app.use('/transactionproperty', transactionpropertyRoutes);
app.use('/transactiontable', transactiontableRoutes);
app.use('/traveldocuments', traveldocumentsRoutes);
app.use('/travelers', travelersRoutes);
app.use('/travelorder', travelorderRoutes);
app.use('/travelpayment', travelpaymentRoutes);
app.use('/useraccess', useraccessRoutes);
app.use('/users', usersRoutes);
app.use('/useruseraccess', useruseraccessRoutes);
app.use('/vendor', vendorRoutes);
app.use('/vendorcustomertype', vendorcustomertypeRoutes);
app.use('/vendortype', vendortypeRoutes);
app.use('/purchaseRequest', purchaseRequestRoutes);
app.use("/community-tax", taxcertificate)
app.use('/communityTaxIndividual', communityTaxIndividualRoutes);
app.use("/corporate-ctc", taxcertificatecorp)

app.use("/real-property-tax", realpropertytax)
app.use("/cashbook", cashbook)
app.use("/collectionreport", collectionReport)
// Moved higher up
app.use("/generalservicerecipt", generalservicerecipt)
app.use("/saoob", saoob)
app.use("/bir", bir)
app.use("/trialbalance", trialbalance)
app.use("/generalledger", generalledger)
app.use("/subsidiaryleadger", subsidiaryleadger)
app.use("/trialBalanceReport", trialBalanceReport)
app.use("/financialStatementsReports", financialStatementsReports)
app.use("/statementOfComparison", statementOfComparison);
app.use("/statementOfAppropriations", statementOfAppropriations);
app.use("/budgetReport", budgetReport);
app.use("/budgetDetails", budgetDetails);
app.use("/budgetAllotment", budgetAllotment);
app.use("/budgetSummary", budgetSummary);
app.use("/budgetSupplemental", budgetSupplemental);
app.use("/budgetTransfer", budgetTransfer);
app.use("/fundTransfer", fundTransfer);
app.use("/dataSource", dataSourceRoutes);
app.use("/watermarks", watermarksRoutes);
app.use("/logoImages", logoImagesRoutes);
app.use("/chequeGenerator", chequeGenerator);
app.use("/profileDashboard", profileDashboard);
app.get('/', (req, res) => {
  res.send('API Running');
});

module.exports = app;