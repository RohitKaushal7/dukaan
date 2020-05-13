import React, { Component } from 'react';
import {NavLink} from 'react-router-dom';
import './Product.css';
import PropTypes from 'prop-types';
import {ProductConsumer} from '../Context';


export default class Products extends Component {
    render() {
        const {id, title, img, price, inCart} = this.props.product;
        return (
            <div className="col-9 mx-auto col-md-6 col-lg-3 my-3" >
                <div className="card">
                  <ProductConsumer>
                      {value =>(<div className="img-container p-5" onClick={() => value.handelDetail(id)}>
                        <NavLink to="/details">
                            <img src={img} alt="product" className="card-img-top"/>
                        </NavLink>
                        <button className="cart-btn" disabled={inCart?true:false} onClick={() => value.addToCart(id)}>
                        {inCart?(<p className="text-capitalize mb-0" disabled>in cart</p>):<i className="fa fa-cart-plus" aria-hidden="true"/>}
                        </button>
                    </div>)}
                    </ProductConsumer>
                    <div className="card-footer d-flex justify-content-between">
                        <p className="align-self-center mb-0">
                            {title}
                        </p>
                        <h5 className="text-blue font-italic mb-0">
                          <span className="mr-1">&</span>
                           {price}
                        </h5>
                    </div>
                </div>
            </div>
        )
    }
}

Products.propTypes ={
    product:PropTypes.shape(
        {
            id:PropTypes.number,
            img:PropTypes.string,
            title:PropTypes.string,
            price:PropTypes.number,
            inCart:PropTypes.bool
        }.isRequired
    )
}