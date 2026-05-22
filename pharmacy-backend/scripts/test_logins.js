// Simple login tester for local backend
(async () => {
  const url = process.env.BACKEND_URL || 'http://localhost:5000/api/auth/login';

  const tests = [
    { username: 'eseruadmin', password: 'eseru16' },
    { username: 'expresstaff1', password: 'express16' },
    { username: 'testers12', password: 'testersdev1' },
  ];

  for (const t of tests) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t),
      });
      const text = await res.text();
      console.log('TEST', t.username, '=>', res.status);
      console.log(text);
    } catch (err) {
      console.error('ERROR', t.username, err.message || err);
    }
    console.log('---');
  }
})();
