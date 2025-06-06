const { firebase } = require("./config");

const firebaseJson =  {
    type:firebase.type,
    project_id:firebase.project_id,
    private_key_id:firebase.private_key_id,
    private_key:firebase.private_key,
    client_email:firebase.client_email,
    client_id:firebase.client_id,
    auth_uri:firebase.auth_uri,
    token_uri:firebase.token_uri,
    auth_provider_x509_cert_url:firebase.auth_provider_x509_cert_url,
    client_x509_cert_url:firebase.client_x509_cert_url,
    universe_domain:firebase.universe_domain
}
  
module.exports = firebaseJson