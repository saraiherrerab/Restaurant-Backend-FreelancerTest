import http from 'http';
import app from './app';
import { initSocketGateway } from './socket/socketGateway';

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

// Initialize Socket.io
initSocketGateway(server);

server.listen(PORT, () => {
  console.log(`🚀 GourmetReserve Backend running on http://localhost:${PORT}`);
});
