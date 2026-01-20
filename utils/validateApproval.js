const db = require('../config/database');
const { Op } = require('sequelize');

/**
 * Validates if the current user can approve the transaction based on the Approval Matrix.
 * Returns information about the next status and sequence level.
 */
async function validateApproval({ documentTypeID, approvalVersion, totalAmount, transactionLinkID, user }) {
    if (!user) throw new Error('User information is required for approval validation.');

    try {
        const { employeeID, departmentID, userAccessIDs = [] } = user;

        // 1. Fetch user position
        const employee = await db.employee.findByPk(employeeID);
        const positionID = employee?.PositionID;

        // 2. Fetch the current sequence level of the transaction from Audit logs
        const lastAudit = await db.ApprovalAudit.findOne({
            where: { InvoiceLink: transactionLinkID },
            order: [['SequenceOrder', 'DESC']],
        });

        const currentSequence = lastAudit ? lastAudit.SequenceOrder : 0;

        // 3. Fetch ALL relevant matrix rules for this document type and version, filtered by amount
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
            }]
        });

        // Sort rules numerically (important because SequenceLevel is a string like "1 - First")
        matrixRules.sort((a, b) => {
            const levelA = parseInt(a.SequenceLevel) || 0;
            const levelB = parseInt(b.SequenceLevel) || 0;
            return levelA - levelB;
        });

        if (matrixRules.length === 0) {
            return { canApprove: true, isFinal: true, nextStatus: 'Posted', nextSequence: 0, currentSequence: 0, numberOfApprovers: 0 };
        }

        // Identify the next sequence level the user needs to approve
        // NOTE: SequenceLevel in Matrix is a STRING (e.g., "1 - First"), must parse to number
        const nextRule = matrixRules.find(r => parseInt(r.SequenceLevel) > currentSequence);

        if (!nextRule) {
            return { canApprove: false, error: 'Transaction is already fully approved for your amount bracket.' };
        }

        const nextSequenceInt = parseInt(nextRule.SequenceLevel) || 1;

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

        // 5. Check if user already approved THIS specific sequence level
        const alreadyApproved = await db.ApprovalAudit.findOne({
            where: {
                InvoiceLink: transactionLinkID,
                SequenceOrder: nextSequenceInt,
                PositionorEmployeeID: employeeID
            }
        });

        if (alreadyApproved) {
            return { canApprove: false, error: 'You have already approved this sequence level.' };
        }

        // 6. Determine if level is satisfied
        const approvalsInCurrentLevel = await db.ApprovalAudit.count({
            where: {
                InvoiceLink: transactionLinkID,
                SequenceOrder: nextSequenceInt
            }
        });

        const totalApproversNeeded = nextRule.NumberofApprover || 1;
        const ruleType = nextRule.AllorMajority;

        let isSequenceSatisfied = false;
        const newApprovalCount = approvalsInCurrentLevel + 1;

        if (ruleType === 'Majority') {
            isSequenceSatisfied = newApprovalCount >= Math.ceil((totalApproversNeeded + 1) / 2);
        } else {
            isSequenceSatisfied = newApprovalCount >= totalApproversNeeded;
        }

        // 7. Determine finality
        const remainingRules = matrixRules.filter(r => parseInt(r.SequenceLevel) > nextSequenceInt);
        const isFinal = isSequenceSatisfied && remainingRules.length === 0;

        return {
            canApprove: true,
            isFinal: isFinal,
            nextStatus: isFinal ? 'Posted' : 'Requested',
            nextSequence: isSequenceSatisfied ? nextSequenceInt : currentSequence,
            currentSequence: nextSequenceInt,
            numberOfApprovers: totalApproversNeeded
        };

    } catch (error) {
        console.error('[validateApproval] Error:', error);
        throw error;
    }
}

module.exports = validateApproval;
