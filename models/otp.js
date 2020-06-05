
module.exports = (sequelize, Sequelize) => {
    const otp = sequelize.define('db_ld_otp', {
        id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },
        userId: {
            type: Sequelize.UUID,
            allowNull: false
        },
        value: {
            type: Sequelize.STRING,
            allowNull: false
        }
    })

    return otp;
};