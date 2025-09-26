const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const { getConfig } = require('./config');

const config = getConfig();

const googleAuthClient = new OAuth2Client(config.clientId);

async function verifyIdToken(idToken) {
  const ticket = await googleAuthClient.verifyIdToken({
    idToken,
    audience: config.clientId
  });
  return ticket.getPayload();
}

function getGoogleApis(accessToken) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return {
    classroom: google.classroom({ version: 'v1', auth })
  };
}

module.exports = {
  verifyIdToken,
  getGoogleApis
};

