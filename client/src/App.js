import React, { useState, Component } from 'react';

import { Switch, Route } from 'react-router-dom'
import './App.css';
import Navbar from './components/Navbar/Navbar'
import Home from './containers/Home/Home';
import E404 from './containers/E404/E404'
import Modal from './components/Modal/Modal';
import SignUp from './components/SignUp/SignUp';
import { Profile, Products, Admin, Details } from './containers'
import { connect } from 'react-redux';
import * as actions from './store/actions';

import AdminTMP from './containers/Admin/Admin_tmp'


class App extends Component {

  render() {
    return (
      <React.Fragment>

        <Navbar />
        <Modal visible={this.props.authModalVisible || this.props.response.status == 401}
          // closeModal={this.props.closeModal} 
          closeBtn={this.props.closeModal}>
          <SignUp />
        </Modal>

        <Switch>
          <Route path='/' exact >
            <Home {...this.props} />
          </Route>

          <Route path='/products' exact >
            <Products />
          </Route>


          {this.props.userId ?
            <Route path="/profile">
              <Profile />
            </Route>
            : null
          }
          <Route path="/admin">
            <Admin />
          </Route>

          <Route path="/details">
            <Details />
          </Route>

          <Route component={E404} />
        </Switch>
      </React.Fragment>
    );
  }
}

const mapStateToProps = state => {
  return {
    ...state
  }
}

const mapDispatchToProps = dispatch => {
  return {
    closeModal: () => dispatch({ type: actions.CLOSE_AUTH_MODAL }),
    openModal: () => dispatch({ type: actions.OPEN_AUTH_MODAL }),
    logout: () => dispatch(actions.logout())
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(App);
