import test from 'node:test';
import assert from 'node:assert/strict';
import { subscribeAiir } from '../src/lib/metadata/aiir-socket.mjs';

test('AIIR subscription sends the service ID and ignores other stations', () => {
 class Socket {
  constructor(url) { this.url = url; this.handlers = {}; Socket.instance = this; }
  addEventListener(name, handler) { this.handlers[name] = handler; }
  send(value) { this.sent = JSON.parse(value); }
  close() { this.closed = true; }
  emit(name, data) { this.handlers[name]({ data: JSON.stringify(data) }); }
 }
 const received = [];
 const stop = subscribeAiir('3581', data => received.push(data), { WebSocketImpl: Socket });
 assert.equal(Socket.instance.url,'wss://metadata.aiir.net/now-playing');
 Socket.instance.emit('open');
 assert.deepEqual(Socket.instance.sent,{action:'subscribe',serviceId:'3581'});
 Socket.instance.emit('message',{serviceId:'9999'});
 Socket.instance.emit('message',{serviceId:'3581',nowPlaying:{title:'Song'}});
 assert.equal(received.length,1);
 stop();
 assert.equal(Socket.instance.closed,true);
});
