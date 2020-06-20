import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardMedia, CardContent, Typography, CardActions, Button, Select, MenuItem, Fab, InputLabel, CardActionArea } from '@material-ui/core';
import CartIcon from '@material-ui/icons/AddShoppingCart'

import './Product.scss'

const Product = (props) => {
    const product = props.product;

    const [selectedSKU, setSelectedSKU] = useState(product.skus ? product.skus[0] : null);


    return (
        <Card className="product" variant="outlined">
            <CardMedia
                className="card-image"
                title="Product"
                image={selectedSKU ? selectedSKU.images ? selectedSKU.images[0].src : null : null}
            />
            <CardContent>
                <div className="badge badge-info pb-1">{product.category.name}</div>
                <h5 className="mb-0">{product.name}</h5>
                <Typography variant="body2" color="textSecondary" className="mb-2 company" component="p">{product.brand}</Typography>
                {/* <Typography variant="body2" color="textSecondary" className="desc" component="p">
                        {product.description}
                    </Typography> */}

                <Typography variant="button" color="textPrimary" component="p">
                    Rs {selectedSKU ? selectedSKU.price : '$$$'} <span className="info"></span>
                </Typography>
                {/* <Typography variant="body2" color="textSecondary" className="delivery" component="p">
                        standard delivery time : 6pm-7pm
                </Typography> */}
            </CardContent>
            <CardContent className="sku-select">
                {product.skus ?
                    product.skus[0] ?
                        <div className="variants">
                            <InputLabel id="variant-label" >{selectedSKU.type}</InputLabel>
                            <Select defaultValue={product.skus[0]} labelId="variant" className="pack-size" onChange={(e) => setSelectedSKU(e.target.value)}>
                                {
                                    product.skus.map(sku => <MenuItem key={sku.id} value={sku}>{sku.name}</MenuItem>)
                                }
                            </Select>
                        </div>
                        : null
                    : null
                }
            </CardContent>
            <div className="space"></div>
            <CardActions className="card-actions">
                {/* <div className="btn btn-full add-to-cart"><CartIcon /> Add to Cart</div> */}
                <Link to={`/product/${product.id}`} ><Button style={{ color: '#aaa' }}>Details</Button></Link>
                <Fab size="small" title="Add to Cart" variant="round" style={{ background: '#e35f21', color: 'white', boxShadow: '-1px 2px 10px 0 #e35f2199' }} onClick={() => props.addToCart(selectedSKU.id)}><CartIcon /></Fab>

            </CardActions>

        </Card>
    );
}

export default Product;