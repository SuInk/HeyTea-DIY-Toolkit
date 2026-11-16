const app = require('./app');

const PORT = process.env.PORT || 8787;
const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`HeyTea proxy server running at http://${HOST}:${PORT}`);
});
