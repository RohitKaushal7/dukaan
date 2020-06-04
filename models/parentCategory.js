
module.exports = (sequelize, Sequelize) => {
    const parentCategory = sequelize.define('parentCategory', {
        id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
        }
    })

    return parentCategory;
};