const axios = require('axios');
const config = require('../config/config');

// TODO: Replace with your actual DrChrono API credentials
const DRCHRONO_BASE_URL = 'https://drchrono.com/api';

let drchronoAccessToken = '';

/**
 * Create a patient in DrChrono, with auto-refresh on auth failure
 * @param {Object} user - User demographics (name, email, phone, gender, dob, etc.)
 * @param {Object} address - Address object (street, city, state, postalCode, country)
 * @returns {Promise<Object>} - The created patient response from DrChrono
 */
async function createDrChronoPatient(user, address) {
  // Map gender to DrChrono's expected values
  let gender = undefined;
  if (user.detail?.gender) {
    const g = user.detail.gender.toLowerCase();
    if (g === 'male') gender = 'Male';
    else if (g === 'female') gender = 'Female';
    else if (g === 'other') gender = 'Other';
    else gender = 'Undisclosed';
  }

  // Compose last name: all but the first word, or fallback to 'User'
  let last_name = '';
  if (user.name) {
    const nameParts = user.name.trim().split(' ');
    last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ' ';
  } else {
    last_name = ' ';
  }

  // Race: send if present, skip ethnicity
  const race = user.detail?.race || undefined;


  const payload = {
    first_name: user.name?.split(' ')[0] || user.name || 'Unknown',
    last_name: last_name,
    email: user.email,
    cell_phone: user.phone,
    gender: gender,
    date_of_birth: user.detail?.dob ? new Date(user.detail.dob).toISOString().split('T')[0] : undefined,
    address: address?.street,
    city: address?.city,
    state: address?.state,
    zip_code: address?.postalCode,
    country: address?.country,
    doctor: config.drchrono.doctorId,
    race,
  };

  // Helper to actually make the API call
  async function doCreatePatient(token) {
    return axios.post(
      `${DRCHRONO_BASE_URL}/patients`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  try {
    // Try with current token
    const response = await doCreatePatient(drchronoAccessToken);
    return response.data;
  } catch (error) {
    // If auth failed, try refreshing token and retrying once
    if (error.response && error.response.status === 401) {
      try {
        const newToken = await getDrChronoAccessTokenFromRefresh();
        drchronoAccessToken = newToken;
        const retryResponse = await doCreatePatient(newToken);
        return retryResponse.data;
      } catch (refreshError) {
        console.error('DrChrono token refresh failed:', refreshError.response?.data || refreshError.message);
        throw refreshError;
      }
    }
    console.error('Error creating DrChrono patient:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Generate a new DrChrono access token from a refresh token
 * @returns {Promise<string>} - The new access token
 */
async function getDrChronoAccessTokenFromRefresh() {
  const client_id = config.drchrono.clientId;
  const client_secret = config.drchrono.clientSecret;
  const refresh_token = config.drchrono.refreshToken;

  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('client_id', client_id);
  params.append('client_secret', client_secret);
  params.append('refresh_token', refresh_token);

  try {
    const response = await axios.post(
      'https://drchrono.com/o/token/',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    // Response contains: access_token, expires_in, token_type, scope, refresh_token
    return response.data.access_token;
  } catch (error) {
    console.error('Error refreshing DrChrono access token:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  createDrChronoPatient,
  getDrChronoAccessTokenFromRefresh,
}; 