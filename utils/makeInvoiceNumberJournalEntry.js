const { documentType } = require('../config/database');

async function makeInvoiceNumberJournalEntry() {
  const docType = await documentType.findOne({ where: { ID: 23 } });

  if (!docType) {
    throw new Error('Document Type with ID 23 for Journal Entry Voucher not found. Cannot generate invoice number without it.');
  }

  const nextNumber = (docType.CurrentNumber || 0) + 1;
  const prefix = docType.Prefix || '';
  const suffix = docType.Suffix || '';

  const invoiceNumber = `${prefix}-${nextNumber}-${suffix}`;

  return invoiceNumber;
}

module.exports = makeInvoiceNumberJournalEntry;
