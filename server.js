var clients = [];
var commands = [];

var app = {
	ws: null,
	path: "/draw",
	onmessage: function(client, data) {
		var cs = JSON.parse(data);
		for (i=0;i<cs.length;i++) {
			var c = cs[i];
			if (c.type == "clear") {
				commands = [];
			} else {
				commands.push(c);
			}
		}

		for (var i=0;i<clients.length;i++) {
			if (clients[i] != client) { 
				this.ws.send(clients[i], data);
			}
		}
	},
	onconnect: function(client, headers) {
		clients.push(client);
		if (commands.length) { this.ws.send(client, JSON.stringify(commands)); }
	},
	ondisconnect: function(client, code, message) {
		var index = clients.indexOf(client);
		if (index != -1) { clients.splice(index, 1); }
		if (!clients.length) { commands = []; }
	}
};

exports.app = app;

