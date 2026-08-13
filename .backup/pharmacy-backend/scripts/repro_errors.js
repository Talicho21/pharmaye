// use built-in global fetch (Node 18+)
(async () => {
  try {
    const creds = [
      { username: 'hawanadmin', password: 'hawan15', role: 'admin' },
      { username: 'expresstaff', password: 'express16', role: 'staff' },
    ];

    for (const c of creds) {
      console.log('---', c.role, '---');
      // call backend directly to avoid proxy port issues
      const login = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: c.username, password: c.password }),
      });
      const loginJson = await login.json().catch(() => ({}));
      console.log('login status:', login.status, 'body:', JSON.stringify(loginJson));

      const report = await fetch('http://localhost:5000/api/reports?range=24h', {
        method: 'GET',
        headers: { Authorization: `Bearer ${loginJson.token || ''}` },
      });
      const reportText = await report.text().catch(() => 'no body');
      console.log('report status:', report.status, 'body snippet:', reportText.substring(0, 200));
    }
  } catch (err) {
    console.error('repro script error', err);
    process.exit(1);
  }
})();
