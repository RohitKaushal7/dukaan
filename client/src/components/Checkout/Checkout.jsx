import React, { useState, useEffect } from 'react'
import { Card, Paper, CardMedia, CardContent, Typography, CardActions, Button, Select, MenuItem, Fab, InputLabel, CardActionArea } from '@material-ui/core';
import './Checkout.scss'
import { connect } from 'react-redux';
import AddIcon from '@material-ui/icons/Add';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Order from './OrderSum'
import AddressEditor from '../../containers/Profile/AddressEditor'

function Checkout(props) {

    const [user, setUser] = useState({});
    useEffect(() => {
        fetch('/profile', {
            headers: {
                'Authorization': 'Bearer ' + props.idToken
            }
        }).then(res => {
            res.json().then(res => {
                setUser(res.user)

            })
        })
    }, []
    )

    const [radio, setRadio] = useState(0)
    const radiochange = (i) => {
        setRadio(i)
    }

    const [addr, SetAddr] = useState(3)
    const [addingAddress, setAddingAddress] = useState(false);
    const [addressEditMode, setAddressEditMode] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null)

    const viewAdd = (i) => {
        if (addr === i) {
            SetAddr(3)
        }
        else {
            SetAddr(i)
        }
    }
    const [idx, SetIdx] = useState(0)

    const [box, setBox] = useState(true)
    const takeBox = (i) => {
        setBox(!box)
        SetIdx(i)
    }

    const addAddress = (address) => {
        fetch('/add-address', {
            headers: {
                'Authorization': 'Bearer ' + props.idToken,
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify(address)
        }).then(async res => {
            res = await res.json();
            console.log(res);
            if (res.status == 200) {
                setAddingAddress(false);
                setUser((user) => ({
                    ...user,
                    addresses: [
                        ...user.addresses,
                        {
                            ...address,
                            id: res.addressId
                        }
                    ]
                }))
            }
            else {
                props.setResponse(res);
            }

        }).catch(err => {
            console.log(err);

        })
    }
    const removeAddress = (id) => {
        fetch('/remove-address', {
            headers: {
                'Authorization': 'Bearer ' + props.idToken,
                'Content-Type': 'application/json'
            },
            method: 'DELETE',
            body: JSON.stringify({ id })
        }).then(async res => {
            res = await res.json();
            console.log(res);
            if (res.status == 200) {
                setUser((user) => ({
                    ...user,
                    addresses: user.addresses.filter(add => add.id != id)
                }))
            }
            else {
                props.setResponse(res);
            }

        }).catch(err => {
            console.log(err);

        })
    }

    const editAddress = (address) => {
        setAddressEditMode(true);
        setEditingAddress(address);
    }
    const editAddressPost = (address) => {
        removeAddress(address.id);
        addAddress(address);
        setAddressEditMode(false);
        setEditingAddress(null);
    }
    return (
        box ?
            (
                (user && user.addresses) ?
                    <Paper style={{ marginTop: '15px', boxShadow: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                            <div className="address_det">
                                <h3>
                                    <span className="span1">
                                        1
                        </span>
                                    <span className="span2">
                                        Delivery Address
                        </span>
                                </h3>
                                <div >
                                    <div>
                                        {user.addresses.slice(0, addr).map((add, i) => {
                                            return (
                                                <label for="radio" className="add_radio">
                                                    <input type="radio" id="radio" name='address' value={i} checked={radio === i} onChange={() => radiochange(i)} />
                                                    <div className="user_add">
                                                        <div style={{ width: '100%' }}>
                                                            <div className="user_1">
                                                                <p>
                                                                    <span className="span_name">{user.addresses[i].name}</span>
                                                                    <span className="span_place">Home</span>
                                                                    <span className="span_num">{user.addresses[i].mobile}</span>
                                                                </p>
                                                                <span className="address_show">
                                                                    {add.address}
                                                                    <br />
                                                                    <span> {add.state}, {add.country} - {add.zip}</span>
                                                                </span>
                                                                {(radio === i) ? <button onClick={() => takeBox(i)}>
                                                                    Deliver Here
                                          </button> : null}
                                                            </div>
                                                            {(radio === i && !addressEditMode) ? <div className="user_edit">
                                                                <button onClick={() => editAddress(add)}>
                                                                    Edit
                                          </button>
                                                            </div> : null}
                                                        </div>
                                                    </div>
                                                </label>
                                            )
                                        })}
                                    </div>
                                    {(user.addresses.length > 3) ?
                                        <div style={{ backgroundColor: 'white' }}>
                                            <div className="adder" onClick={() => viewAdd(user.addresses.length)}>
                                                <ExpandMoreIcon style={{ margin: '0 22px 0 26px', verticalAlign: 'middle' }} className={(addr === user.addresses.length) ? "uparrow" : null} />
                          View all {user.addresses.length} addresses
                      </div>
                                        </div> : null}
                                    <section style={{ marginTop: '8px', backgroundColor: 'white' }}>
                                        <AddressEditor addAddress={addAddress} editMode={addressEditMode} address={editingAddress} />
                                        {addressEditMode ? <AddressEditor addAddress={editAddressPost} onCancel={() => setAddressEditMode(false)} editMode={addressEditMode} address={editingAddress} /> : null}
                                    </section>
                                    <div style={{ marginTop: '8px', backgroundColor: 'white' }}>
                                        <div className="order_sum">
                                            <span className="span1" style={{ margin: '0 22px 0 26px', verticalAlign: 'middle' }}>
                                                2
                             </span>
                              ORDER SUMMARY
                          </div>
                                    </div>
                                    <div style={{ marginTop: '8px', marginBottom: '8px', backgroundColor: 'white' }}>
                                        <div className="order_sum">
                                            <span className="span1" style={{ margin: '0 22px 0 26px', verticalAlign: 'middle' }}>
                                                3
                             </span>
                              PAYMENT OPTIONS
                          </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </Paper>
                    : null
            ) :
            <Order idx={idx} address={user.addresses} takeBox={takeBox} user={user} />
    )
}
const mapStateToProps = state => {
    return {
        ...state
    }
}
const mapDispatchToProps = dispatch => {
    return {

    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Checkout);