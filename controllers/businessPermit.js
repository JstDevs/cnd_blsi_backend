const { BusinessPermit, ApprovalAudit, sequelize } = require('../config/database'); // Adjust path as needed

// Get all Business Permits
exports.getAll = async (req, res) => {
    try {
        const permits = await BusinessPermit.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(permits);
    } catch (error) {
        console.error('Error fetching business permits:', error);
        res.status(500).json({ message: 'Failed to fetch business permits', error: error.message });
    }
};

// Get Single Business Permit by ID
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const permit = await BusinessPermit.findByPk(id);

        if (!permit) {
            return res.status(404).json({ message: 'Business permit not found' });
        }

        res.status(200).json(permit);
    } catch (error) {
        console.error('Error fetching business permit:', error);
        res.status(500).json({ message: 'Failed to fetch business permit', error: error.message });
    }
};

// Create a new Business Permit
exports.create = async (req, res) => {
    try {
        const data = req.body;

        // Logic to handle attachments if they are uploaded separately or handled here
        // For now, assuming data comes in as a JSON body (attachments might be URLs or handled via multer)

        const newPermit = await BusinessPermit.create(data);
        res.status(201).json(newPermit);
    } catch (error) {
        console.error('Error creating business permit:', error);
        res.status(500).json({ message: 'Failed to create business permit', error: error.message });
    }
};

// Update a Business Permit
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const permit = await BusinessPermit.findByPk(id);
        if (!permit) {
            return res.status(404).json({ message: 'Business permit not found' });
        }

        await permit.update(data);

        // Fetch updated record
        const updatedPermit = await BusinessPermit.findByPk(id);
        res.status(200).json(updatedPermit);
    } catch (error) {
        console.error('Error updating business permit:', error);
        res.status(500).json({ message: 'Failed to update business permit', error: error.message });
    }
};

// Delete a Business Permit
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const permit = await BusinessPermit.findByPk(id);

        if (!permit) {
            return res.status(404).json({ message: 'Business permit not found' });
        }

        await permit.destroy();
        res.status(200).json({ message: 'Business permit deleted successfully', id });
    } catch (error) {
        console.error('Error deleting business permit:', error);
        res.status(500).json({ message: 'Failed to delete business permit', error: error.message });
    }
};

exports.approve = async (req, res) => {
    const { id } = req.body;
    const t = await sequelize.transaction();
    try {
        const permit = await BusinessPermit.findByPk(id, { transaction: t });

        if (!permit) throw new Error('Business permit not found.');

        await permit.update({ status: 'Posted' }, { transaction: t });

        await ApprovalAudit.create({
            LinkID: id,
            InvoiceLink: id,
            PositionorEmployee: "Employee",
            PositionorEmployeeID: req.user.employeeID,
            SequenceOrder: 0,
            ApprovalOrder: 0,
            ApprovalDate: new Date(),
            CreatedBy: req.user.id,
            CreatedDate: new Date(),
            ApprovalVersion: "1"
        }, { transaction: t });

        await t.commit();
        res.json({ message: 'Business permit approved and posted successfully.' });
    } catch (error) {
        await t.rollback();
        console.error('Error approving business permit:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.reject = async (req, res) => {
    const { id, reason } = req.body;
    const t = await sequelize.transaction();
    try {
        const permit = await BusinessPermit.findByPk(id, { transaction: t });

        if (!permit) throw new Error('Business permit not found.');

        await permit.update({ status: 'Rejected' }, { transaction: t });

        await ApprovalAudit.create({
            LinkID: id,
            InvoiceLink: id,
            Remarks: reason,
            RejectionDate: new Date(),
            CreatedBy: req.user.id,
            CreatedDate: new Date(),
            ApprovalVersion: "1"
        }, { transaction: t });

        await t.commit();
        res.json({ message: 'Business permit rejected successfully.' });
    } catch (error) {
        await t.rollback();
        console.error('Error rejecting business permit:', error);
        res.status(500).json({ error: error.message });
    }
};
