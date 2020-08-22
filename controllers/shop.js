
const PDFDocument = require('pdfkit')

const db = require('../utils/database')
const { createInvoice } = require('../utils/createInvoice')
const Op = require('sequelize').Op;

const PAGINATION = 7;

// from config
const deliveryCharges = (distance, price, weight = 0, extraCharges = 0) => {
   return parseInt(distance * 2) + weight * 0.5 + extraCharges;
}

// *** CATEGORIES

exports.getCategories = (req, res) => {
   db.department.findAll({
      attributes: ['id', 'name'],
      include: {
         model: db.parentCategory,
         attributes: ['id', 'name'],
         include: {
            model: db.category,
            attributes: ['id', 'name']
         }
      }
   }).then(rows => {
      // console.log(rows);
      res.json(rows)

   })
}


db.sku.hasMany(db.attribute, { as: 'A0' })
db.sku.hasMany(db.attribute, { as: 'A1' })
db.sku.hasMany(db.attribute, { as: 'A2' })
db.sku.hasMany(db.attribute, { as: 'A3' })
db.sku.hasMany(db.attribute, { as: 'A4' })
db.sku.hasMany(db.attribute, { as: 'A5' })
db.sku.hasMany(db.attribute, { as: 'A6' })
db.sku.hasMany(db.attribute, { as: 'A7' })
db.sku.hasMany(db.attribute, { as: 'A8' })
db.sku.hasMany(db.attribute, { as: 'A9' })

// *** PRODUCTS ... SEARCHING

exports.getProducts = (req, res) => {

   let where = {};
   let catWhere = {};
   req.query.id ? (where.id = req.query.id) : null;
   req.query.ids ? (where.id = { [Op.in]: JSON.parse(req.query.ids) }) : null;
   req.query.categoryId ? (where.categoryId = req.query.categoryId) : null;
   req.query.category ? (where['$category.name$'] = { [Op.like]: `%${req.query.category}%` }) : null;
   req.query.brand ? (where['$product.brand$'] = { [Op.in]: req.query.brand.split(',') }) : null;
   req.query.parentCategory ? (where['$category.parentCategory.name$'] = { [Op.like]: `%${req.query.parentCategory}%` }) : null;
   req.query.minPrice ? (where['$skus.price$'] = { [Op.gte]: parseInt(req.query.minPrice) }) : null;
   req.query.maxPrice ? (where['$skus.price$'] = { [Op.lte]: parseInt(req.query.maxPrice) }) : null;

   if (req.query.minPrice && req.query.maxPrice) {
      where['$skus.price$'] = {
         [Op.and]: [
            {
               [Op.gte]: parseInt(req.query.minPrice)
            },
            {
               [Op.lte]: parseInt(req.query.maxPrice)
            }
         ]
      }
   }

   let selfJoins = []
   if (req.query.filter) {
      let filter = req.query.filter.split(',');
      let keys = Array.from(new Set(filter.map(f => f.split(':')[0])))
      let values = filter.map(f => f.split(':')[1])

      keys.forEach((key, i) => {
         if (i > 9) return;
         selfJoins.push({
            model: db.attribute,
            attributes: [],
            as: 'A' + i
         })
         where[`$skus.A${i}.name$`] = key;
         where[`$skus.A${i}.value$`] = {
            [Op.in]: filter.filter(f => f.split(':')[0] == key).map(f => f.split(':')[1]) // ? can be improved
         };

      })


   }

   if (req.query.search) {
      let search = req.query.search.split(' ').join('%');

      where[Op.or] = [
         {
            name: {
               [Op.like]: `%${search}%`
            }
         },
         {
            description: {
               [Op.like]: `%${search}%`
            }
         },
         {
            brand: {
               [Op.like]: `%${search}%`
            }
         },
         {
            keywords: {
               [Op.like]: `%${search}%`
            }
         },
         {
            '$category.name$': {
               [Op.like]: `%${search}%`
            }
         },
         {
            '$skus.json$': {
               [Op.like]: `%${search}%`
            }
         },
         {
            '$skus.name$': {
               [Op.like]: `%${search}%`
            }
         },
         {
            '$skus.images.src$': {
               [Op.like]: `%${search}%`
            }
         },
      ];

   }




   let page = Math.max(parseInt(req.query.page) - 1, 0) || 0;
   let limit = parseInt(req.query.limit) || PAGINATION;
   let offset = page * limit;
   offset += (parseInt(req.query.skip) || 0);
   let dir = req.query.dir || 'DESC';
   let order = req.query.order ? [[db.Sequelize.literal(req.query.order), dir]] : [['createdAt', dir]];

   let result = { meta: {} };

   db.product.findAll({
      subQuery: false,
      nest: true,
      where,
      attributes: [[db.sequelize.fn('COUNT', db.Sequelize.literal('DISTINCT product.id')), 'count']],
      include: [
         {
            model: db.category,
            attributes: [],
            include: {
               model: db.parentCategory,
               attributes: [],
            }
         },
         {
            model: db.sku,
            attributes: [],
            include: [
               {
                  model: db.image,
                  attributes: [],
               },
               ...selfJoins
            ]
         }
      ],
      raw: true,
   }).then(([total]) => {
      result.meta.count = total.count;
      result.meta.pageCount = Math.ceil(total.count / limit);
      return db.product.findAll({
         subQuery: false,
         nest: true,
         where,
         attributes: [[db.Sequelize.literal('DISTINCT `category->parentCategory`.`name`'), 'name']],
         include: [
            {
               model: db.category,
               attributes: [],
               required: true,
               include: {
                  model: db.parentCategory,
                  attributes: [],
                  required: true,
               }
            },
            {
               model: db.sku,
               attributes: [],
               include: [
                  {
                     model: db.image,
                     attributes: [],
                  },
                  {
                     model: db.attribute,
                     attributes: []
                  },
                  ...selfJoins
               ]
            }

         ],
         raw: true,
         nest: true
      })
   }).then(parentCategories => {
      return db.parentCategory.findAll({
         subQuery: false,
         nest: true,
         attributes: ['name'],
         where: {
            name: {
               [Op.in]: parentCategories.map(c => c.name)
            }
         },
         include: {
            model: db.category,
            attributes: ['name']
         }

      })
   }).then(parentCategories => {
      result.meta.categories = parentCategories;
      return db.product.findAll({
         subQuery: false,
         nest: true,
         where,
         attributes: [[db.Sequelize.literal('DISTINCT `product`.`brand`'), 'name'], 'id'],
         include: [
            {
               model: db.category,
               attributes: [],
               include: {
                  model: db.parentCategory,
                  attributes: [],
               }
            },
            {
               model: db.sku,
               attributes: [],
               include: [
                  {
                     model: db.image,
                     attributes: [],
                  },
                  {
                     model: db.attribute,
                     attributes: []
                  },
                  ...selfJoins
               ]
            }
         ],
         raw: true,
         nest: true
      })
   }).then(brands => {
      result.meta.brands = brands;

      return db.product.findAll({
         subQuery: false,
         nest: true,
         where,
         attributes: [db.Sequelize.literal('DISTINCT `skus->attributes`.`value`'), 'skus->attributes.name'],
         include: [
            {
               model: db.category,
               attributes: [],
               include: {
                  model: db.parentCategory,
                  attributes: [],
               }
            },
            {
               model: db.sku,
               attributes: [],
               include: [
                  {
                     model: db.image,
                     attributes: [],
                  },
                  {
                     model: db.attribute,
                     attributes: [],
                  },
                  ...selfJoins
               ]
            },
         ],
         raw: true,
         nest: true
      });
   }).then(skus => {
      result.meta.skus = skus;
      console.log('>>> Fetching Product Ids.');
      return db.product.findAll({
         offset, limit, where,
         order,
         subQuery: false,
         nest: true,
         group: ['id'],
         attributes: ['id'],
         include: [
            {
               model: db.category,
               attributes: [],
               required: true,
               include: {
                  model: db.parentCategory,
                  attributes: ['id', 'name'],
                  required: true,
               }
            },
            {
               model: db.sku,
               attributes: [],
               required: true,
               include: [
                  {
                     model: db.image,
                     attributes: [],
                  },
                  {
                     model: db.attribute,
                     attributes: []
                  },
                  ...selfJoins
               ]
            },
         ]
      })
   }).then(products => {
      let productIds = products.map(p => p.id);
      console.log('>>> Getting Products Info.');

      return db.product.findAll({
         where: {
            id: {
               [Op.in]: productIds
            }
         },
         include: [
            {
               model: db.category,
               attributes: ['id', 'name'],
               required: true,
               include: {
                  model: db.parentCategory,
                  attributes: ['id', 'name'],
                  required: true,
                  include: {
                     model: db.department,
                     attributes: ['id', 'name'],
                  }
               }
            },
            {
               model: db.sku,
               required: true,
               include: [
                  {
                     model: db.image,
                     order: [['src', 'ASC']],
                     attributes: ['id', 'src'],
                  },
                  {
                     model: db.attribute,
                     attributes: ['id', 'name', 'value']
                  },

               ]
            },
         ]

      })
   }).then(products => {
      result.products = products;
      res.json(result);
   })
}

exports.predictiveSearch = (req, res) => {
   let query = req.query.q;
   db.product.findAll({
      where: {
         [Op.or]: [
            {
               name: {
                  [Op.like]: `%${query}%`
               }
            },
            {
               keywords: {
                  [Op.like]: `%${query}%`
               }
            }
         ]
      },
      limit: 10,
      attributes: [[db.Sequelize.literal('DISTINCT name'), 'name']]
   }).then(products => {
      let strings = products.map(p => p.name);
      res.json(strings)
   })
}

// *** CART

exports.cart = async (req, res) => {
   // Expects {skuId,qty, action: (add,remove,delete)}
   // User has to be authenticated in middleware isAuth >> req.userId is available at this point.
   /**
    * Creates , removes , delete a cart item
    * @param skuId -- skuId of the product to be added to cart
    * @param qty -- quantity
    * @param action -- add | remove | delete
    * 
    * @returns cart -- on addition
    * @returns {status: 200 | 400  ,message: }
    * 
    */

   let qty = req.body.qty || 1;

   switch (req.body.action) {
      case 'add':
         let _sku = await db.sku.findByPk(req.body.skuId);
         if (!_sku) {
            return res.json({ status: 400, message: `No such Product SKU exists.` });
         }
         db.cart.findAll({
            where: {
               userId: req.userId,
               skuId: req.body.skuId
            },
            raw: true,
            nest: true,
         }).then(([cartItem]) => {
            if (cartItem) {
               // if the product is already in the user cart
               if (_sku.stockQuantity < Number(cartItem.quantity) + Number(req.body.qty)) {
                  return res.json({ status: 201, message: `Not in stock. Only ${_sku.stockQuantity} items in stock.` })
               }
               db.cart.update({
                  quantity: cartItem.quantity + qty,
               }, {
                  where: {
                     id: cartItem.id
                  },
               }).then(async result => {
                  result = await db.cart.findByPk(cartItem.id, {
                     include: {
                        model: db.sku,
                        attributes: ['name', 'price', 'id'],
                        include: [
                           {
                              model: db.product,
                              attributes: ['name', 'brand', 'id'],
                           },
                           {
                              model: db.image,
                              attributes: ['src'],
                           }
                        ]
                     }
                  })
                  return res.json({ status: 200, cartItem: result, message: 'Added Successfully.' })
               }).catch(err => res.status(500).json(err)) // ! don't send error report to user  
            } else {
               // new product in the cart

               if (_sku.stockQuantity < Number(req.body.qty)) {
                  return res.json({ status: 201, message: `Not in stock. Only ${_sku.stockQuantity} items in stock.` })
               }

               db.cart.create({
                  userId: req.userId,
                  skuId: req.body.skuId,
                  quantity: qty,
               }).then(async result => {
                  let ci = await db.cart.findByPk(result.id, {
                     include: {
                        model: db.sku,
                        attributes: ['name', 'price', 'id'],
                        include: [
                           {
                              model: db.product,
                              attributes: ['name', 'brand', 'id'],
                           },
                           {
                              model: db.image,
                              attributes: ['src'],
                           }
                        ]
                     }
                  })
                  return res.json({ status: 200, cartItem: ci, message: 'Added Successfully.' })
               }).catch(err => res.status(500).json(err)) // ! don't send error report to user
            }
         }).catch(err => res.status(500).json(err)) // ! don't send error report to user
         break;

      case 'remove':
         db.cart.findAll({
            where: {
               userId: req.userId,
               skuId: req.body.skuId
            },
            raw: true,
            nest: true,
         }).then(([cartItem]) => {
            if (cartItem) {
               // if the product is in the user cart
               if (cartItem.quantity > 1) {
                  db.cart.update({
                     quantity: cartItem.quantity - 1,
                  }, {
                     where: {
                        id: cartItem.id
                     }
                  }).then(async result => {
                     result = await db.cart.findByPk(cartItem.id, {
                        include: {
                           model: db.sku,
                           attributes: ['name', 'price', 'id'],
                           include: [
                              {
                                 model: db.product,
                                 attributes: ['name', 'brand', 'id'],
                              },
                              {
                                 model: db.image,
                                 attributes: ['src'],
                              }
                           ]
                        }
                     })
                     return res.json({ status: 200, cartItem: result, message: 'Removed from Cart.' });
                  }).catch(err => res.status(500).json(err)) // ! don't send error report to user  
               } else {
                  // only One product in the cart
                  db.cart.destroy({
                     where: {
                        id: cartItem.id,
                     }
                  }).then(result => res.json({ status: 200, message: "Deleted Successfully" })).catch(err => res.status(500).json(err)) // ! don't send error report to user
               }
            } else {
               // NO product in the cart BAD REQUEST
               res.json({ status: 400, message: 'NO Such Product in User Cart' })

            }
         }).catch(err => res.status(500).json(err)) // ! don't send error report to user
         break;

      case 'delete':
         db.cart.findAll({
            where: {
               userId: req.userId,
               skuId: req.body.skuId
            },
            raw: true,
            nest: true,
         }).then(([cartItem]) => {
            if (cartItem) {

               // Delete the cart Item
               db.cart.destroy({
                  where: {
                     id: cartItem.id,
                  }
               }).then(result => res.json({ status: 200, message: "Deleted Successfully" })).catch(err => res.status(500).json(err)) // ! don't send error report to user
            } else {
               // NO product in the cart BAD REQUEST
               res.json({ status: 400, message: 'NO Such Product in User Cart' })

            }
         }).catch(err => res.status(500).json(err)) // ! don't send error report to user
         break;

      default:
         return res.json({ status: 400, message: 'Invalid Cart Action' });

   }

}

exports.getCart = (req, res) => {
   // expects authenticated user >> req.useId
   db.cart.findAll({
      where: {
         userId: req.userId
      },
      include: {
         model: db.sku,
         attributes: ['name', 'price', 'id', 'stockQuantity', 'weight', 'extraCharges'],
         include: [
            {
               model: db.product,
               attributes: ['name', 'brand', 'id'],
            },
            {
               model: db.image,
               attributes: ['src'],
            }
         ]
      }
   }).then(cart => {
      // If there are some products in the cart which were DELETED by ADMIN
      // they need to be deleted from the cart.

      cart.filter(ci => !ci.sku).map(deleted => deleted.destroy().then(del => console.log(' >> Deleted cartId', del.id, ' as the product was deleted')))

      cart = cart.filter(ci => ci.sku)

      return res.json(cart);
   }).catch(err => {
      console.log(err);
      return res.status(500).json(err);

   })
}

// *** ORDERS

exports.getStatus = (req, res) => {
   db.status.findAll({
      attributes: ['id', 'index', 'status']
   }).then(status => res.json(status))
      .catch(err => {
         console.log(err);
         res.json([])
      })
}

exports.getOrders = (req, res) => {
   let where = {}
   let limit = 5;
   let offset = (parseInt(req.query.page) - 1) * limit || 0;
   req.query.id ? (where.id = req.query.id) : null
   req.query.date ? (where.createdAt = { [Op.gt]: new Date(req.query.date) }) : null
   db.order.findAll({
      where: {
         userId: req.userId,
         ...where
      },
      order: [['createdAt', 'DESC']],
      offset: offset,
      limit: limit,
      include: [
         {
            model: db.orderItem,
            include: {
               model: db.sku,
               include: [
                  {
                     model: db.product,
                  },
                  {
                     model: db.image
                  }
               ]
            },


         },
         {
            model: db.status,
            attributes: ['status', 'index']
         }
      ],
   }).then(orders => {
      orders = orders.map(o => {
         o = o.toJSON();
         o.deliveryCharges = o.price - o.orderItems.reduce((total, oi) => oi.sku.price, 0);
         return o;
      })
      console.log(orders);

      res.json(orders);
   }).catch(err => {
      res.json(err)
      console.error(err);

   })
}

exports.cancelOrder = async (req, res) => {
   try {
      const order = await db.order.findByPk(req.body.id)
      if (order.userId === req.userId) {
         order.remarks = req.body.reason
         order.isCancelled = true
         await order.save()
         res.json({ order: order, message: "This order is cancelled" })
      }
      else {
         res.json({ status: 400, message: "NOT Authorized.! Order does not belong to you." })
      }
   }
   catch (e) {
      res.json(e.message)
   }
}

exports.postOrder = (req, res) => {
   /*
      Authenticated User : `req.userId` is available.
      
      the whole cart will be added as order.
      total price will be calculated here based on products.
      order.status = ordered.

      instance order = {
         shippingAddress : Address,
         paymentType:  'cod' | 'card' ,
      }

   */

   // Calculate the amount to pay.
   let price = 0;
   let order = {};
   let orderCart;

   // Fetch Cart
   db.cart.findAll({
      where: {
         userId: req.userId
      },
      include: {
         model: db.sku,
         include: {
            model: db.product
         }
      }
   }).then(async cart => {
      // If there are some products in the cart which were DELETED by ADMIN
      // they need to be deleted from the cart.

      if (!cart.length) {
         let error = new Error('Your Cart is Empty!');
         error.status = 400;
         throw error;
      }

      // cart = cart.filter(ci => !ci.sku).map(deleted => deleted.destroy().then(del => console.log(' >> Deleted cartId', del.id, ' as the product was deleted')))
      orderCart = cart.filter(ci => {
         if (ci.sku) {
            if (ci.quantity > ci.sku.stockQuantity) {
               let err = new Error(`Only ${ci.sku.stockQuantity} stocks left of ${ci.sku.product.name}. Please reduce quantity.`)
               throw err;
            }
            return true;
         }
         console.log(`NOT in stock.${ci.quantity} vs ${ci.sku.stockQuantity}`);
         return false;
      })

      // 

      price = orderCart.reduce((acc, cur) => acc + cur.sku.price * Math.min(cur.quantity, cur.sku.stockQuantity), 0);
      let totalWeight = orderCart.reduce((acc, cur) => acc + cur.sku.weight * Math.min(cur.quantity, cur.sku.stockQuantity), 0);
      let totalExtraCharges = orderCart.reduce((acc, cur) => acc + cur.sku.extraCharges * Math.min(cur.quantity, cur.sku.stockQuantity), 0);
      console.log('ORDER PRICE >> ', price);

      let _address = await db.shippingAddress.findByPk(req.body.shippingAddress.id)
      _address = _address.toJSON();

      let delivery_charges = deliveryCharges(_address.distance, price, totalWeight, totalExtraCharges);

      console.log(`${price} + ${delivery_charges} = ${price + delivery_charges}`);

      price += delivery_charges;


      order.price = price;
      order.shippingAddress = JSON.stringify(_address);
      order.paymentType = req.body.paymentType;
      order.userId = req.userId;
      order.statusId = 1;
      order.cancelled = null

      let date = new Date();
      date.setDate(date.getDate() + 2)

      order.deliverOn = date.toISOString();

      if (!orderCart.length) {
         let err = new Error('Cart Not Eligible for Order.');
         err.status = 400;
         throw err;
      }

      return db.order.create({
         ...order,

      })
   }).then(async (_order) => {

      order = _order;
      let orderItems = [];

      orderCart.forEach((ci) => {
         orderItems.push(new Promise(async (resolve, reject) => {
            for (let i = 0; i < ci.quantity; i++) {
               await db.sku.findByPk(ci.skuId).then(async _sku => {
                  if (+_sku.stockQuantity > 0) {
                     _sku.stockQuantity = _sku.stockQuantity - 1;
                     await _sku.save();
                     console.log(`Remaining Stock . ${_sku.stockQuantity}`);
                     db.orderItem.create({
                        orderId: _order.id,
                        skuId: ci.skuId,
                     })
                  }
                  else {
                     console.log(ci.skuId, ' is OUT OF STOCK.!');
                  }
               })
            }
            resolve()
         }))

      })

      return Promise.all(orderItems)
   }).then(result => {
      return db.order.findByPk(order.id, {
         include: [
            {
               model: db.orderItem,
               include: {
                  model: db.sku,
                  include: [
                     {
                        model: db.product,
                     },
                     {
                        model: db.image,
                     }
                  ]
               },


            },
            {
               model: db.status,
               attributes: ['status', 'index']
            }
         ]
      })
   }).then(order => {
      console.log(' >>> ORDER PLACED.');

      // EMPTY CART 
      db.cart.findAll({
         where: {
            userId: req.userId
         }
      }).then(cart => {
         cart.forEach(ci => ci.destroy())
      })
      res.json(order);
   })
      .catch(err => {
         console.log(err.message);
         res.json({ message: err.message, status: err.status })
      })



   // Use some payment API to proceed the payment which returns a promise on the status of payment.
   // if payment is Successful

}

//deleting Order
// exports.delOrder = async (req,res)=>{
//      try{
//       const order = await db.order.findByPk(req.body.id)
//       if(order.userId === req.userId){
//          await order.destroy()
//          res.json({status:"200",message:"Order cancel successfully"})
//       }
//       else{
//          res.json({status:"400",message:"Unauthorised"})
//       }
//      }
//      catch(e){
//         console.log(e)
//         res.json(e)
//      }
// }

// INVOICE

exports.getInvoice = async (req, res) => {
   let orderId = req.params.id;
   let filename = 'invoice-' + orderId;

   let order = await db.order.findByPk(orderId, {
      include: {
         all: true,
         nested: true
      },

   });

   if (order) {
      if (order.userId == req.userId) {
         res.setHeader('COntent-Type', 'application/pdf');
         res.setHeader('Content-Disposition', 'inline; filename="' + filename + '"')

         order = order.toJSON();

         let filtered = [];
         for (let oi of order.orderItems) {
            let existing = filtered.find(foi => foi.skuId == oi.skuId);
            if (existing) {
               existing.quantity++;
            }
            else {
               filtered.push({ ...oi, quantity: 1 })
            }
         }

         order.orderItems = filtered;

         let doc = new PDFDocument({ size: 'A4', margin: 50 });

         doc.pipe(res);

         createInvoice(doc, order);


         doc.end();
      }
      else {
         res.status(401).end('NOT Authorized.')
      }
   }
   else {
      res.status(404).end('Order Not Found.');
   }


}
