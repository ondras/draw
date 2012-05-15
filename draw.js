var Draw = OZ.Class();
Draw.prototype.init = function(url) {
	this._socket = new MozWebSocket(url);
	this._canvas = OZ.$("canvas");
	this._ctx = this._canvas.getContext("2d");
	this._ec = [];
	this._commands = [];
	
	this._lastPoint = null;
	
	OZ.Event.add(this._socket, "open", this._open.bind(this));
	OZ.Event.add(this._socket, "close", this._close.bind(this));
	OZ.Event.add(this._socket, "message", this._message.bind(this));
	
	OZ.Event.add(OZ.$("clear"), "click", this._clear.bind(this));
	
	var options = OZ.$("color").getElementsByTagName("option");
	for (var i=0;i<options.length;i++) {
		var c = options[i].value;
		if (c == "#000") { options[i].style.color = "white"; }
		options[i].style.backgroundColor = c;
	}
}

Draw.prototype._clear = function(e) {
	this._commands.push("c");
}

Draw.prototype._change = function(e) {
	this._commands.push("c");
}

Draw.prototype._open = function(e) {
	setInterval(this._check.bind(this), 30);
	OZ.Event.add(this._canvas, "mousedown", this._mousedown.bind(this));
}

Draw.prototype._close = function(e) {
//	alert("Connection closed :/");
}

Draw.prototype._eventToCoords = function(e) {
	var pos = OZ.DOM.pos(this._canvas);
	return [e.clientX - pos[0] - this._canvas.clientLeft, e.clientY- pos[1] - this._canvas.clientTop];
}

Draw.prototype._message = function(e) {
	this._draw(JSON.parse(e.data));
}

Draw.prototype._mousedown = function(e) {
	this._lastPoint = null;
	this._ec.push(OZ.Event.add(document, "mousemove", this._mousemove.bind(this)));
	this._ec.push(OZ.Event.add(document, "mouseup", this._mouseup.bind(this)));
	var coords = this._eventToCoords(e);
	var style = {
		c: OZ.$("color").value,
		w: parseInt(OZ.$("width").value)
	}
	this._commands.push(style, coords[0], coords[1]);
}

Draw.prototype._mousemove = function(e) {
	var coords = this._eventToCoords(e);
	this._commands.push(coords[0], coords[1]);
}

Draw.prototype._mouseup = function(e) {
	while (this._ec.length) { OZ.Event.remove(this._ec.pop()); }
}

Draw.prototype._check = function() {
	if (!this._commands.length) { return; }
	var str = JSON.stringify(this._commands);
	this._draw(this._commands);
	this._socket.send(str);
}

Draw.prototype._draw = function(commands) {
	var inPath = false;
	this._ctx.lineCap = "round";
	this._ctx.lineJoin = "round";
	
	while (commands.length) {
		var command = commands.shift();
		if (typeof(command) == "number") { /* continue drawing */
		
			var x = command;
			var y = commands.shift();
			
			if (!inPath) {
				this._ctx.beginPath();
				inPath = true;
				if (this._lastPoint) { this._ctx.moveTo(this._lastPoint[0], this._lastPoint[1]); }
			}

			if (this._lastPoint) {
				this._ctx.lineTo(x, y);
			} else {
				this._ctx.moveTo(x, y);
			}
			this._lastPoint = [x, y];
			
		} else {
			this._lastPoint = null;
			if (typeof(command) == "string") { /* command */
				if (command == "c") { this._canvas.width = this._canvas.width; }
			} else { /* configuration */
				if (inPath) {
					this._ctx.stroke();
					inPath = false;
				}
				this._ctx.lineWidth = command.w;
				this._ctx.strokeStyle = command.c;
			}
		}
		
	}

	if (inPath) { this._ctx.stroke(); }

	
}
