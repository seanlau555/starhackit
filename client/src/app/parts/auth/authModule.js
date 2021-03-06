import {bindActionCreators} from 'redux';
import {createActionAsync, createReducerAsync} from 'redux-act-async';
import {createAction, createReducer} from 'redux-act';
import {connect} from 'react-redux';
import {browserHistory} from 'react-router';

import AuthenticatedComponent from './components/authenticatedComponent';
import LoginView from './views/loginView';
import LogoutView from './views/logoutView';
import ForgotView from './views/forgotView';
import RegisterView from './views/registerView';
import RegistrationCompleteView from './views/registrationCompleteView';
import ResetPasswordView from './views/resetPasswordView';
import AppView from './views/applicationView';

function Resources(rest){
  return {
    me() {
        return rest.get('me');
    },
    register(payload) {
        return rest.post('auth/register', payload);
    },
    login(payload) {
        return rest.post('auth/login', payload);
    },
    logout() {
        return rest.post('auth/logout');
    },
    verifyEmailCode(payload) {
        return rest.post('auth/verify_email_code/', payload);
    },
    requestPasswordReset(payload) {
        return rest.post('auth/reset_password', payload);
    },
    verifyResetPasswordToken(payload) {
        return rest.post('auth/verify_reset_password_token', payload);
    }
  }
}

function Actions(rest){
    let auth = Resources(rest);
    return {
        setToken: createAction('TOKEN_SET'),
        me: createActionAsync('ME', auth.me),
        login: createActionAsync('LOGIN', auth.login),
        logout: createActionAsync('LOGOUT', auth.logout),
        requestPasswordReset: createActionAsync('REQUEST_PASSWORD_RESET', auth.requestPasswordReset),
        register: createActionAsync('REGISTER', auth.register),
        verifyEmailCode: createActionAsync('VERIFY_EMAIL_CODE', auth.verifyEmailCode),
        verifyResetPasswordToken: createActionAsync('VERIFY_RESET_PASSWORD_TOKEN', auth.verifyResetPasswordToken)
    }
}

const defaultState = {
  authenticated: false
};

function AuthReducer(actions){
  return createReducer({
      [actions.setToken]: (state, payload) => ({
          ...state,
          token: payload
      }),
      [actions.me.ok]: (state) => ({
          ...state,
          authenticated: true
      }),
      [actions.login.ok]: (state, payload) => ({
          ...state,
          authenticated: true,
          token: payload.response.token
      }),
      [actions.login.error]: () => (defaultState),
      [actions.me.error]: () => (defaultState),
      [actions.logout.ok]: () => (defaultState),
      [actions.logout.error]: () => (defaultState)
  }, defaultState);
}

function Reducers(actions){
  return {
    auth: AuthReducer(actions),
    me: createReducerAsync(actions.me),
    login: createReducerAsync(actions.login),
    logout: createReducerAsync(actions.logout),
    register: createReducerAsync(actions.register),
    verifyEmailCode: createReducerAsync(actions.verifyEmailCode),
    requestPasswordReset: createReducerAsync(actions.requestPasswordReset),
    verifyResetPasswordToken: createReducerAsync(actions.verifyResetPasswordToken)
  }
}
let selectState = state => state.auth;
let isAuthenticated = state => selectState(state).auth.authenticated;

function Containers(context, actions){
    const mapDispatchToProps = (dispatch) => ({actions: bindActionCreators(actions, dispatch)});
    return {
        login(){
            const mapStateToProps = (state) => ({
                authenticated: isAuthenticated(state),
                login: selectState(state).login
            })
            return connect(mapStateToProps, mapDispatchToProps)(LoginView);
        },
        register(){
            const mapStateToProps = (state) => ({register: selectState(state).register})
            return connect(mapStateToProps, mapDispatchToProps)(RegisterView);
        },
        logout(){
            const mapStateToProps = (state) => ({
                authenticated: isAuthenticated(state)
            })
            return connect(mapStateToProps, mapDispatchToProps)(LogoutView);
        },
        forgot(){
            const mapStateToProps = () => ({});
            return connect(mapStateToProps, mapDispatchToProps)(ForgotView);
        },
        resetPassword(){
            const mapStateToProps = (state) => ({verifyResetPasswordToken: selectState(state).verifyResetPasswordToken})
            return connect(mapStateToProps, mapDispatchToProps)(ResetPasswordView);
        },
        registrationComplete(){
            const mapStateToProps = (state) => ({verifyEmailCode: selectState(state).verifyEmailCode})
            return connect(mapStateToProps, mapDispatchToProps)(RegistrationCompleteView);
        },
        authentication(){
          const mapStateToProps = (state) => ({authenticated: isAuthenticated(state)})
          return connect(mapStateToProps, mapDispatchToProps)(AuthenticatedComponent);
        },
        app(){
            const mapStateToProps = (state) => ({
                authenticated: isAuthenticated(state)
            })
            return connect(mapStateToProps, mapDispatchToProps)(AppView);
        }
    }
}

function Middleware(actions){
  const authMiddleware = (/*store*/) => next => action => {
    //console.log('auth action.type: ', action.type)
    switch(action.type){
      case actions.login.ok.getType():
        //Save jwt
        localStorage.setItem("JWT", action.payload.token);
        break;
      case actions.logout.ok.getType():
      case actions.logout.error.getType():
      case actions.login.error.getType():
        //Remove jwt
        localStorage.removeItem("JWT");
        break;
      case actions.verifyEmailCode.ok.getType():
        browserHistory.push(`/login`);
        break;
      default:
    }
    return next(action)
  }
  return authMiddleware;
}

function Routes(containers, store, actions){
    return {
      childRoutes : [
          {
              path: 'login',
              component: containers.login()
          }, {
              path: 'register',
              component: containers.register()
          }, {
              path: 'logout',
              component: containers.logout(),
              onEnter: () => store.dispatch(actions.logout())
          },{
              path: 'forgot',
              component: containers.forgot()
          },{
              path: 'resetPassword/:token',
              component: containers.resetPassword()
          },{
              path: 'verifyEmail/:code',
              component: containers.registrationComplete(),
              onEnter: nextState => {
                store.dispatch(actions.verifyEmailCode({code: nextState.params.code}))
              }
          }
      ]
    }
}

export default function(context, rest) {
    let actions = Actions(rest);
    let containers = Containers(context, actions)
    return {
        actions,
        reducers: Reducers(actions),
        middlewares: [Middleware(actions)],
        containers,
        routes: (store) => Routes(containers, store, actions)
    }
}
