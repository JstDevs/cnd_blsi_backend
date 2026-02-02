const { sequelize, Signatories } = require('./config/database');

async function debug() {
    try {
        console.log('--- Testing Signatories Query ---');
        console.log('Signatories model exists:', !!Signatories);
        console.log('Models in sequelize:', Object.keys(sequelize.models));

        const items = await Signatories.findAll({
            include: [
                {
                    model: sequelize.models.DocumentType,
                    as: 'DocumentType',
                    attributes: ['Name']
                },
                { model: sequelize.models.Employee, as: 'SignatoryOne', attributes: ['FirstName', 'LastName'] },
                { model: sequelize.models.Employee, as: 'SignatoryTwo', attributes: ['FirstName', 'LastName'] },
                { model: sequelize.models.Employee, as: 'SignatoryThree', attributes: ['FirstName', 'LastName'] },
                { model: sequelize.models.Employee, as: 'SignatoryFour', attributes: ['FirstName', 'LastName'] },
                { model: sequelize.models.Employee, as: 'SignatoryFive', attributes: ['FirstName', 'LastName'] },
            ],
            limit: 5
        });

        console.log('Query success! Found:', items.length);
    } catch (err) {
        console.error('Query failed!');
        console.error('Error Message:', err.message);
        if (err.parent) {
            console.error('SQL:', err.parent.sql);
        }
    } finally {
        process.exit(0);
    }
}

debug();
