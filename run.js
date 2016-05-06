#!/usr/bin/env node

var app = require("./server").app;

var Server = require("./ws-proxy").Server;
var ws = new Server("0.0.0.0", 8888);
app.ws = ws;
ws.addApplication(app);
ws.run();
