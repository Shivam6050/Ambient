import { createServer } from 'node:http';
import { toNodeHandler, localhostHostValidation, localhostOriginValidation } from '@modelcontextprotocol/node';
import { mcpHandler } from './server.js';

const port = Number(process.env.MCP_PORT || 5100);
const host = process.env.MCP_HOST || '127.0.0.1';

const nodeHandler = toNodeHandler(mcpHandler);
const validateHost = localhostHostValidation();
const validateOrigin = localhostOriginValidation();

const server = createServer((req, res) => {
  if (!validateHost(req, res) || !validateOrigin(req, res)) return;
  void nodeHandler(req, res);
});

server.listen(port, host, () => {
  console.log(`Ambient MCP server listening at http://${host}:${port}/mcp`);
});

process.on('SIGINT', async () => {
  await mcpHandler.close();
  server.close(() => process.exit(0));
});
