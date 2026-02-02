const { sequelize } = require('./config/database');

console.log('--- Registered Models ---');
console.log(Object.keys(sequelize.models).join(', '));
process.exit(0);
