
const db = require('../utils/database')
const csv = require('csvtojson')


const { validationResult } = require('express-validator')

// *** Single UPLOADS ***

exports.addProduct = (req, res, next) => {
    let prod = req.body;
    console.log(req.body);

    console.log(req.files);


    // Validate product
    const valErrors = validationResult(req);

    if (!valErrors.isEmpty()) {
        return res.status(422).json({ status: 422, errors: valErrors.array() });
    }



    db.product.create({
        name: prod.name,
        description: prod.description,
        brand: prod.brand,
        keywords: prod.keywords,
        categoryId: prod.categoryId
    }).then(_product => {
        console.log(" >> ADDED PRODUCT: ", _product.id);

        Promise.all(
            prod.skus.map((sku, i) => {
                return db.sku.create({
                    productId: _product.id,
                    code: sku.code,
                    // type: sku.type,
                    name: sku.name,
                    // description: sku.description,
                    price: sku.price,
                    stockQuantity: sku.stockQuantity,
                    json: sku.json
                }).then(_sku => {
                    console.log(" >> ADDED SKU: ", _sku.id);
                    return Promise.all(
                        [...req.files[`images${i}`].map(image => {
                            return db.image.create({
                                skuId: _sku.id,
                                src: image.path.replace('public', ''),
                            }).then(_img => {
                                console.log(" >> ADDED IMG: ", _img.id);
                                return _img
                            })
                        }),
                        ...sku.attributes.map(attr => {
                            return db.attribute.create({
                                skuId: _sku.id,
                                name: attr.name,
                                value: attr.value,
                            }).then(_attr => {
                                console.log(" >> ADDED attr: ", _attr.id);
                                return _attr
                            })
                        })
                        ]
                    ).then(imatrr => {
                        return console.log(" >> IMAGES AND ATTRIBUTES DONE");
                    })
                })
            })
        ).then(_skus => {
            console.log(" >> SKUS DONE");
            res.json({ message: "Product Added", status: 200, product: _product })
        })
    })

}

exports.deleteProduct = (req, res) => {
    let productId = parseInt(req.body.productId);

    console.log('Request to delete product with ID: ' + productId);


    db.product.findByPk(productId, {
        include: [
            {
                model: db.sku,
                include: [
                    {
                        model: db.image
                    },
                    {
                        model: db.attribute
                    }
                ]
            }
        ]
    }).then(_product => {

        if (_product) {
            // Promise.all(
            //     _product.skus.map(sku => {
            //         return Promise.all(
            //             [
            //                 ...sku.images.map(img => {
            //                     return img.destroy().then(result => console.log('>> DELETED IMG : ', img.id))
            //                 }),
            //                 ...sku.attributes.map(attr => {
            //                     return attr.destroy().then(result => console.log('>> DELETED ATTR : ', attr.id))
            //                 })
            //             ]
            //         ).then(result => {
            //             return sku.destroy().then(result => console.log('DELETED SKU', sku.id));
            //         })
            //     })
            // ).then(result => {
            //     console.log(">> SKU's Deleted ");
            //     _product.destroy().then(result => {
            //         console.log(">> DELETED PRODUCT", productId);
            //         res.json({ status: 200, message: "deleted Successfully", product: _product })
            //     })
            // })
            _product.destroy().then(result => {
                res.json({ status: 200, message: "deleted Successfully", product: _product })
            });
        }
        else {
            return res.json({ status: 400, message: "NO Such Product" })
        }
    }).catch(err => {
        console.log(err);
        res.json({ status: 500, message: "Server Error" });
    })

}



// *** BULK UPLOADS ***
exports.addProducts = (req, res) => {

    // if file type is not csv return error.
    if (req.file.mimetype == 'text/csv') {
        // fields of every product must match with what is in database.
        // convert csv to json
        csv().fromString(req.file.buffer.toString('utf-8')).then(json => {
            let products = json;
            let promises = [];

            for (prop in products[0]) {
                if (products[0].hasOwnProperty(prop)) {
                    console.log(prop);

                    if (!['name', 'categoryId', 'brand', 'description', 'keywords'].includes(prop)) {
                        res.json({ status: 400, message: `Please Submit a CSV file with fields [name,categoryId,brand,description,keywords]. Fields don't match.` })
                        return;
                    }
                }
            }

            products.forEach(product => {
                promises.push(
                    db.product.create({
                        ...product
                    })
                        .then(result => {
                            console.log('a product added.');

                        }).catch(err => {
                            console.log('Cant add: ', err);

                        })
                );
            })

            Promise.all(promises).then(done => {
                res.json({ status: 200, message: `Added ${promises.length} products.`, products })
            })

        })
    }
    else {
        res.json({ status: 400, message: `Please Submit a CSV file with fields [name,categoryId,brand,image].` })
    }

}

exports.addCategories = (req, res) => {

    if (req.file.mimetype == 'text/csv') {
        csv().fromString(req.file.buffer.toString('utf-8')).then(json => {
            let categories = json;
            let promises = [];
            let errors = [];
            let successes = [];

            // fields of every product must match with what is in database.
            categories.forEach(category => {
                promises.push(
                    db.parentCategory.findAll({
                        where: {
                            name: category.parentCategory
                        }
                    }).then(async result => {
                        let parentCategory = result[0];

                        if (parentCategory) {
                            await db.category.findAll({
                                where: {
                                    name: category.name
                                }
                            }).then(async result => {
                                if (result[0]) {
                                    // Category Already Exist
                                    errors.push({ message: `${category.name} category exists in parentCategory ${category.parentCategory}`, category })
                                } else {
                                    await db.category.create({
                                        parentCategoryId: parentCategory.id,
                                        name: category.name
                                    }).then(result => {
                                        successes.push(category);
                                    })

                                }
                            })
                        } else {
                            console.log(err);
                            // No Such parentCategory
                            errors.push({ message: `No ${category.parentCategory} parentCategory exist for category ${category.name}`, category })

                        }

                    }).catch(err => {
                        console.log(err);
                        // No Such parentCategory
                        errors.push({ message: `No ${category.parentCategory} parentCategory exist for category ${category.name}`, category })
                    })
                );
            })

            Promise.all(promises).then(done => {
                res.json({ status: 200, successes, errors })
            })

        })
    }
    else {
        res.json({ status: 400, message: `Please Submit a CSV file with fields [parentCategory, name].` })
    }
}

exports.addParentCategories = (req, res) => {

    if (req.file.mimetype == 'text/csv') {
        csv().fromString(req.file.buffer.toString('utf-8')).then(json => {
            let parentCategories = json;
            let promises = [];
            let errors = [];
            let successes = [];

            // fields of every product must match with what is in database.
            parentCategories.forEach(category => {
                promises.push(
                    db.department.findAll({
                        where: {
                            name: category.department
                        }
                    }).then(async result => {
                        let department = result[0];

                        if (department) {
                            await db.parentCategory.findAll({
                                where: {
                                    name: category.name
                                }
                            }).then(async result => {
                                if (result[0]) {
                                    // parent Category Exists
                                    errors.push({ message: `${category.name} category exists in department ${category.department}`, category })
                                }
                                else {
                                    await db.parentCategory.create({
                                        departmentId: department.id,
                                        name: category.name
                                    }).then(result => {
                                        successes.push(category);
                                    })
                                }
                            })
                        } else {
                            console.log(err);
                            // No Such Department
                            errors.push({ message: `No ${category.department} department exist for category ${category.name}`, category })
                        }

                    }).catch(err => {
                        console.log(err);
                        // No Such Department
                        errors.push({ message: `No ${category.department} department exist for category ${category.name}`, category })
                    })
                );
            })

            Promise.all(promises).then(done => {
                res.json({ status: 200, successes, errors })
            })

        })
    }
    else {
        res.json({ status: 400, message: `Please Submit a CSV file with fields [department,name].` })
    }
}

exports.addDepartments = (req, res) => {

    if (req.file.mimetype == 'text/csv') {
        csv().fromString(req.file.buffer.toString('utf-8')).then(json => {
            let departments = json;
            let promises = [];
            let errors = [];
            let successes = [];

            // fields of every product must match with what is in database.
            departments.forEach(department => {
                promises.push(
                    db.department.findAll({
                        where: {
                            name: department.name
                        }
                    }).then(result => {
                        if (result[0]) {
                            // skip if already exists.
                            errors.push({ message: `${department.name} department Already exist.`, department })
                        }
                        else {
                            db.department.create({
                                name: department.name
                            }).then(result => {
                                successes.push(department)
                            })
                        }
                    })

                );
            })

            Promise.all(promises).then(done => {
                res.json({ status: 200, successes, errors })
            })

        })
    }
    else {
        res.json({ status: 400, message: `Please Submit a CSV file with fields [name].` })
    }
}