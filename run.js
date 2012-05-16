#!/usr/bin/env v8cgi

var app = require("./server").app;

var Server = require("websocket").Server;
var ws = new Server("0.0.0.0", 8888);
app.ws = ws;
ws.addApplication(app);
ws.run();
