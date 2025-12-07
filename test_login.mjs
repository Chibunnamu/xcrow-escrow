import fetch from 'node-fetch';

async function testLogin() {
  try {
    console.log('Testing login with correct password...');
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'chimjize123@gmail.com',
        password: 'password123'
      })
    });
    console.log('Login status:', response.status);
    const data = await response.json();
    console.log('Login response:', data);
  } catch (error) {
    console.log('Error:', error.message);
  }
}

testLogin();
