/**
 * Realtime Collaboration Gateway (WebSocket)
 * Phase 4: WebSocket Server & Room Pub/Sub
 */

import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';

class RealtimeGateway {
  constructor() {
    this.wss = null;
    /** @type {Map<string, Set<WebSocket>>} sessionId -> Set<WebSocket> */
    this.rooms = new Map();
    this.heartbeatInterval = null;
  }

  /**
   * Initialize WebSocket server mounted on HTTP server
   * @param {import('http').Server} httpServer
   */
  init(httpServer) {
    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/ws',
    });

    this.wss.on('connection', (ws, req) => {
      const parsedUrl = url.parse(req.url, true);
      const initialSessionId = parsedUrl.query.sessionId;
      const initialUserId = parsedUrl.query.userId;

      console.log(`⚡ [Realtime] WS client connected (sessionId: ${initialSessionId}, userId: ${initialUserId})`);

      ws.isAlive = true;
      ws.sessionId = null;
      ws.userId = initialUserId || null;

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      if (initialSessionId) {
        this.subscribe(initialSessionId, ws, initialUserId);
      }

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (err) {
          console.error('[Realtime] Failed to parse message:', err);
        }
      });

      ws.on('close', () => {
        console.log(`⚡ [Realtime] WS client disconnected (sessionId: ${ws.sessionId}, userId: ${ws.userId})`);
        this.unsubscribe(ws);
      });

      ws.on('error', (err) => {
        console.error('[Realtime] Socket error:', err);
      });

      // Send initial welcome
      this.sendTo(ws, {
        type: 'CONNECTED',
        message: 'Galaxy Together Realtime Gateway connected',
        sessionId: ws.sessionId,
      });
    });

    // Heartbeat to sweep dead sockets every 30s
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          this.unsubscribe(ws);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    console.log('⚡ Realtime Gateway (WebSocket) mounted on /ws');
  }

  /**
   * Handle incoming client messages
   */
  handleClientMessage(ws, message) {
    switch (message.type) {
      case 'SUBSCRIBE':
        if (message.sessionId) {
          this.subscribe(message.sessionId, ws, message.userId);
        }
        break;
      case 'UNSUBSCRIBE':
        this.unsubscribe(ws);
        break;
      case 'SEAT_HOLD':
        if (ws.sessionId) {
          this.broadcast(ws.sessionId, 'SEAT_HELD', {
            seatId: message.seatId,
            seatCode: message.seatCode || message.seatId,
            userId: message.userId || ws.userId,
            memberName: message.memberName,
            colorKey: message.colorKey,
            colorHex: message.colorHex,
          });
        }
        break;
      case 'SEAT_RELEASE':
        if (ws.sessionId) {
          this.broadcast(ws.sessionId, 'SEAT_RELEASED', {
            seatId: message.seatId,
            userId: message.userId || ws.userId,
            memberName: message.memberName,
          });
        }
        break;
      case 'PING':
        this.sendTo(ws, { type: 'PONG', timestamp: new Date().toISOString() });
        break;
      default:
        console.log(`[Realtime] Unhandled client message: ${message.type}`);
    }
  }

  /**
   * Subscribe socket to a session room
   */
  subscribe(sessionId, ws, userId) {
    // Unsubscribe from prior room if changing
    if (ws.sessionId && ws.sessionId !== sessionId) {
      this.unsubscribe(ws);
    }

    ws.sessionId = sessionId;
    if (userId) ws.userId = userId;

    if (!this.rooms.has(sessionId)) {
      this.rooms.set(sessionId, new Set());
    }
    this.rooms.get(sessionId).add(ws);

    console.log(`⚡ [Realtime] Subscribed socket to room ${sessionId} (total subscribers: ${this.rooms.get(sessionId).size})`);

    this.sendTo(ws, {
      type: 'SUBSCRIBED',
      sessionId,
      subscriberCount: this.rooms.get(sessionId).size,
    });
  }

  /**
   * Unsubscribe socket from its current session room
   */
  unsubscribe(ws) {
    const sessionId = ws.sessionId;
    if (!sessionId || !this.rooms.has(sessionId)) return;

    const room = this.rooms.get(sessionId);
    room.delete(ws);
    if (room.size === 0) {
      this.rooms.delete(sessionId);
    }
    ws.sessionId = null;
  }

  /**
   * Broadcast an event to all subscribers in a session room
   * @param {string} sessionId
   * @param {string} eventType
   * @param {object} payload
   */
  broadcast(sessionId, eventType, payload = {}) {
    if (!sessionId || !this.rooms.has(sessionId)) {
      console.log(`⚠️ [Realtime] Cannot broadcast ${eventType}: room ${sessionId} has no subscribers!`);
      return;
    }

    const message = JSON.stringify({
      type: eventType,
      sessionId,
      payload,
      timestamp: new Date().toISOString(),
    });

    const room = this.rooms.get(sessionId);
    console.log(`📢 [Realtime] Broadcasting ${eventType} to ${room.size} clients in room ${sessionId}`);
    for (const client of room) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  /**
   * Helper to send JSON to a single client
   */
  sendTo(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Clean up
   */
  close() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.wss) this.wss.close();
  }
}

export const realtimeGateway = new RealtimeGateway();
