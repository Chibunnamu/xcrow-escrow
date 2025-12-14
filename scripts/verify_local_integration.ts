
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const jar = new CookieJar();
const client = wrapper(axios.create({ 
  baseURL: 'http://localhost:5000',
  jar,
  withCredentials: true 
}));


import * as fs from 'fs';
import * as path from 'path';

function log(msg: string) {
  console.log(msg);
  fs.appendFileSync(path.resolve('scripts/verification_output.txt'), msg + '\n');
}

async function verifyFlow() {
  // Clear log file
  fs.writeFileSync(path.resolve('scripts/verification_output.txt'), '');

  const email = `test.user.${Date.now()}@example.com`;
  log(`\n--- Starting Integration Verification ---`);
  log(`Targeting: http://localhost:5000`);
  log(`User: ${email}`);

  try {
    // 1. Signup
    log(`\n[1] Registering User...`);
    const signupRes = await client.post('/api/signup', {
      email,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      country: 'Nigeria'
    });
    log(`Status: ${signupRes.status}`);
    log(`User ID: ${signupRes.data.user.id}`);
    
    // 2. Login
    log(`\n[2] Logging In...`);
    const loginRes = await client.post('/api/login', {
      username: email,
      password: 'password123'
    });
    log(`Status: ${loginRes.status}`);

    // 3. Check Current User & Consent Status
    log(`\n[3] Checking User Profile...`);
    const userRes = await client.get('/api/user');
    log(`Current Consent (emailNotifications): ${userRes.data.user.emailNotifications}`);

    // 4. Grant Consent
    log(`\n[4] Granting Consent...`);
    const consentRes = await client.post('/api/user/consent', { consent: true });
    log(`Response: ${JSON.stringify(consentRes.data)}`);

    // 5. Verify Updated Profile
    log(`\n[5] Verifying Update...`);
    const updatedUserRes = await client.get('/api/user');
    log(`New Consent: ${updatedUserRes.data.user.emailNotifications}`);

    if (updatedUserRes.data.user.emailNotifications === true) {
      log(`\nSUCCESS: User consent flow verification passed.`);
    } else {
      log(`\nFAILURE: User consent not updated.`);
    }

  } catch (error: any) {
    log(`\nERROR: verification failed`);
    if (error.response) {
       log(`Status: ${error.response.status}`);
       log(`Data: ${JSON.stringify(error.response.data)}`);
    } else {
       log(error.message);
    }
  }
}

verifyFlow();
