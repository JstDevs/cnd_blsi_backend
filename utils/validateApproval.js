const db = require('../config/database');
const { Op } = require('sequelize');

/**
 * Validates if the current user can approve the transaction based on the Approval Matrix.
 * Returns information about the next status and sequence level.
 */
async function validateApproval({ documentTypeID, approvalVersion, totalAmount, transactionLinkID, user }) {
    try {
        const { employeeID, departmentID, userAccessIDs } = user;

        // 1. Fetch user position if needed
        const employee = await db.Employee.findByPk(employeeID);
        const positionID = employee?.PositionID;

        // 2. Fetch the current sequence level of the transaction from Audit logs
        // We count how many unique sequence levels have been FULLY satisfied or what is the max sequence level reached.
        // However, the standard logic is: check existing approvals for this specific version and link.
        const lastAudit = await db.ApprovalAudit.findOne({
            where: { InvoiceLink: transactionLinkID },
            order: [['SequenceOrder', 'DESC']],
        });

        const currentSequence = lastAudit ? lastAudit.SequenceOrder : 0;

        // 3. Fetch ALL relevant matrix rules for this document type and version, filtered by amount
        // Order by SequenceLevel ASC
        const matrixRules = await db.ApprovalMatrix.findAll({
            where: {
                DocumentTypeID: documentTypeID,
                Version: approvalVersion,
                Active: true
            },
            include: [{
                model: db.Approvers,
                as: 'Approvers',
                where: {
                    [Op.or]: [
                        {
                            AmountFrom: { [Op.lte]: totalAmount },
                            AmountTo: { [Op.gte]: totalAmount }
                        },
                        {
                            AmountFrom: { [Op.lte]: totalAmount },
                            AmountTo: 0 // Assume 0 means no upper limit
                        },
                        {
                            AmountFrom: 0,
                            AmountTo: 0 // No limit set
                        }
                    ]
                },
                required: true
            }],
            order: [['SequenceLevel', 'ASC']]
        });

        if (matrixRules.length === 0) {
            // If no rules apply for this amount/doc, it's auto-postable or error?
            // Usually means it can be posted immediately.
            return { canApprove: true, isFinal: true, nextStatus: 'Posted', currentSequence: 0 };
        }

        // Identify the next sequence level the user needs to approve
        // Logic: Look for the first sequence level in matrixRules that is > currentSequence
        const nextRule = matrixRules.find(r => r.SequenceLevel > currentSequence);

        if (!nextRule) {
            // All sequences matched by amount are already cleared
            return { canApprove: false, error: 'Transaction is already fully approved for your amount bracket.' };
        }

        // 4. Validate if current user is one of the authorized approvers for this rule
        const isAuthorized = nextRule.Approvers.some(appr => {
            const type = appr.PositionorEmployee;
            const targetID = parseInt(appr.PositionorEmployeeID);

            if (type === 'Position') return targetID === positionID;
            if (type === 'Employee') return targetID === parseInt(employeeID);
            if (type === 'Role') return userAccessIDs.includes(targetID);
            return false;
        });

        if (!isAuthorized) {
            return {
                canApprove: false,
                error: `Access Denied: You are not an authorized approver for Sequence Level ${nextRule.SequenceLevel}.`
            };
        }

        // 5. Check if user already approved THIS specific sequence level for THIS transaction
        const alreadyApproved = await db.ApprovalAudit.findOne({
            where: {
                InvoiceLink: transactionLinkID,
                SequenceOrder: nextRule.SequenceLevel,
                PositionorEmployeeID: employeeID
            }
        });

        if (alreadyApproved) {
            return { canApprove: false, error: 'You have already approved this sequence level.' };
        }

        // 6. Determine if this approval will complete the sequence level (Majority vs All)
        const approvalsInCurrentLevel = await db.ApprovalAudit.count({
            where: {
                InvoiceLink: transactionLinkID,
                SequenceOrder: nextRule.SequenceLevel
            }
        });

        const totalApproversNeeded = nextRule.NumberofApprover || 1;
        const ruleType = nextRule.AllorMajority; // "All" or "Majority"

        let isSequenceSatisfied = false;
        const newApprovalCount = approvalsInCurrentLevel + 1;

        if (ruleType === 'Majority') {
            isSequenceSatisfied = newApprovalCount >= Math.ceil((totalApproversNeeded + 1) / 2);
        } else {
            // Default to "All" or single approver
            isSequenceSatisfied = newApprovalCount >= totalApproversNeeded;
        }

        // 7. Determine if this is the final sequence level
        const remainingRules = matrixRules.filter(r => r.SequenceLevel > nextRule.SequenceLevel);
        const isFinal = isSequenceSatisfied && remainingRules.length === 0;

        return {
            canApprove: true,
            isFinal: isFinal,
            nextStatus: isFinal ? 'Posted' : (isSequenceSatisfied ? 'Requested' : 'Requested'), // Status usually stays Requested until Posted
            nextSequence: isSequenceSatisfied ? nextRule.SequenceLevel : currentSequence,
            currentSequence: nextRule.SequenceLevel,
            numberOfApprovers: totalApproversNeeded
        };

    } catch (error) {
        console.error('validateApproval Error:', error);
        throw error;
    }
}

module.exports = validateApproval;
