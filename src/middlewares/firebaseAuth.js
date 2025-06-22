const admin = require('firebase-admin');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const firebaseJson = require('../config/firebaseCred');
const {authService} = require('../services');
const { firebase } = require('../config/config');
const { default: axios } = require('axios');

admin.initializeApp({
  credential: admin.credential.cert(firebaseJson),
});

const firebaseAuth = (allowUserType = 'All') => async (req, res, next) => {
  console.log('firebaseAuth middleware called', { authorization: req.headers?.authorization });
  return new Promise(async (resolve, reject) => {
    const token = req.headers?.authorization?.split(' ')[1];
    // console.log('Token:', token); 
    // token not found
    if (!token) {
      reject(new ApiError(httpStatus.BAD_REQUEST, 'Please Authenticate!'));
    }
    try {
      const payload = await admin.auth().verifyIdToken(token, true);
      // console.log('FirebaseAuthPayload:', payload);
      const user = await authService.getUserByFirebaseUId(payload.uid);
      // console.log('FirebaseAuthUser:', user);
      if (!user) {
        // console.log('Request path:', req.path);
        if (['/onBoarding'].includes(req.path) || req.path.includes('secretSignup') || req.path.includes('/vendor/onBoarding')) {
          // console.log('New user payload:', payload);
          req.newUser = payload;
          req.routeType = allowUserType;
        } else reject(new ApiError(httpStatus.NOT_FOUND, `User with firebase UID ${payload.uid} not found in the database.`));
      } else {
        if (!allowUserType.split(',').includes(user.__t) && allowUserType !== 'All') {
          reject(new ApiError(httpStatus.FORBIDDEN, "Sorry, but you can't access this"));
        }
        if (user.isBlocked) {
          reject(new ApiError(httpStatus.FORBIDDEN, 'User is blocked'));
        }
        if (user.isDeleted) {
          reject(new ApiError(httpStatus.GONE, "User doesn't exist anymore"));
        }
        req.user = user;
      }

      resolve();
    } catch (err) {
      if (err.code === 'auth/id-token-expired') {
        reject(new ApiError(httpStatus.UNAUTHORIZED, 'Session is expired'));
      }
      console.log('FirebaseAuthError:', err);
      reject(new ApiError(httpStatus.UNAUTHORIZED, 'Failed to authenticate'));
    }
  })
    .then(() => next())
    .catch(err => next(err));
};

const generateToken = async(req,res,next) => {

  try{
     console.log(req.params.uid)
      const token =  await admin.auth().createCustomToken(req.params.uid);
      // console.log(token)
      // console.log(getAuth(restApp));
      const FIREBASE_API_KEY = firebase.api_key;
      const resp = await axios({
        url: `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken?key=${FIREBASE_API_KEY}`,
        method: 'post',
        data: {
          token: token,
          returnSecureToken: true
        },
        json: true,
      });
      // console.log(resp.data)
      if (resp.data.error) {
        return res.status(500).json({
          status: false,
          msg: resp.data.error.message
        })
      }
      const idToken = resp.data.idToken;
      // console.log(idToken);
      
  
      // const user = await signInWithCustomToken(getAuth(restApp),token);
      // const idToken = user._tokenResponse.idToken

      return res.status(200).json({
          status: true,
          token: idToken
      });

  }catch(err){
      // console.log(err)
      return res.status(500).json({
          status:false,
          msg:err.message
      })
  }
}

module.exports = {firebaseAuth,generateToken};