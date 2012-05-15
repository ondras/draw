var Draw = OZ.Class();
Draw.URL = "ws://" + location.host + ":8888/";
Draw.prototype.init = function() {
	this._socket = new (window.WebSocket || window.MozWebSocket)(Draw.URL);
	this._canvas = OZ.$("canvas");
	this._file = OZ.$("file");
	this._ctx = this._canvas.getContext("2d");
	this._ec = [];
	this._mode = "";
	this._commands = [];
	this._imageSrc = "";
	this._lastCoords = [];
	
	OZ.Event.add(this._socket, "open", this._open.bind(this));
	OZ.Event.add(this._socket, "close", this._close.bind(this));
	OZ.Event.add(this._socket, "message", this._message.bind(this));
	OZ.Event.add(this._socket, "error", this._error.bind(this));
	
	OZ.Event.add(OZ.$("line"), "click", function() {
		this._setMode("line");
	}.bind(this));
	OZ.Event.add(OZ.$("clear"), "click", function() {
		this._setMode("clear");
	}.bind(this));
	OZ.Event.add(OZ.$("image"), "click", function() {
		this._setMode("image");
	}.bind(this));
	
	var options = OZ.$("color").getElementsByTagName("option");
	for (var i=0;i<options.length;i++) {
		var c = options[i].value;
		if (c == "#000") { options[i].style.color = "white"; }
		options[i].style.backgroundColor = c;
	}
	
	this._setMode("line");
}

Draw.prototype._setMode = function(mode) {
	var lastMode = "";
	if (this._mode) {
		lastMode = this._mode;
		var button = OZ.$(this._mode);
		OZ.DOM.removeClass(button, "active");
		var options = OZ.$(this._mode + "_options");
		options.style.display = "none";
	}
	
	this._mode = mode;
	var button = OZ.$(this._mode);
	OZ.DOM.addClass(button, "active");
	var options = OZ.$(this._mode + "_options");
	options.style.display = "";
	
	while (this._ec.length) { OZ.Event.remove(this._ec.pop()); }
	
	switch (mode) {
		case "clear":
			var command = {type:"clear"};
			this._execCommand(command);
			this._commands.push(command);
			this._setMode(lastMode);
		break;

		case "draw":
		break;

		case "image":
		break;
	}
}

Draw.prototype._change = function(e) {
	if (this._file.files.length > 0) {
		var reader = new FileReader();
		reader.onload = function(e) {
			this._imageSrc = reader.result;
		}.bind(this);
		reader.readAsDataURL(this._file.files[0]);
	}
}

Draw.prototype._open = function(e) {
	setInterval(this._check.bind(this), 30);
	OZ.Event.add(this._canvas, "mousedown", this._mousedown.bind(this));
	OZ.Event.add(this._file, "change", this._change.bind(this));
}

Draw.prototype._close = function(e) {
	console.log("Connection closed :/");
}

Draw.prototype._error = function(e) {
	console.log("Connection error :/");
}

Draw.prototype._eventToCoords = function(e) {
	var pos = OZ.DOM.pos(this._canvas);
	return [e.clientX - pos[0] - this._canvas.clientLeft, e.clientY- pos[1] - this._canvas.clientTop];
}

Draw.prototype._message = function(e) {
	var commands = JSON.parse(e.data);
	for (var i=0;i<commands.length;i++) { this._execCommand(commands[i]); }
}

Draw.prototype._execCommand = function(command) {
	switch (command.type) {
		case "clear":
			this._canvas.width = this._canvas.width;
		break;
		
		case "line":
			this._ctx.lineWidth = command.width;
			this._ctx.strokeStyle = command.color;
			this._ctx.lineCap = "round";
			this._ctx.lineJoin = "round";
			this._ctx.beginPath();
			for (var i=0;i<command.points.length;i++) {
				var x = command.points[i][0];
				var y = command.points[i][1];
				if (i) {
					this._ctx.lineTo(x, y);
				} else {
					this._ctx.moveTo(x, y);
				}
			}
			this._ctx.stroke();
		break;

		case "image":
			var img = OZ.DOM.elm("img");
			img.onload = function() {
				this._ctx.drawImage(img, command.x, command.y);
			}.bind(this);
			img.src = command.src;
		break;
	}
}

Draw.prototype._mousedown = function(e) {
	switch (this._mode) {
		case "line":
			this._ec.push(OZ.Event.add(document, "mousemove", this._mousemove.bind(this)));
			this._ec.push(OZ.Event.add(document, "mouseup", this._mouseup.bind(this)));
			this._lastCoords = this._eventToCoords(e);
		break;
		
		case "image":
			if (!this._imageSrc) { return; }
			var coords = this._eventToCoords(e);
			var command = {
				type: "image",
				src: this._imageSrc,
				x: coords[0],
				y: coords[1]
			}
			this._imageSrc = "";
			this._file.value = "";
			this._commands.push(command);
			this._execCommand(command);
		break;
	}
	
}

Draw.prototype._mousemove = function(e) {
	var coords = this._eventToCoords(e);
	var command = {
		type: "line",
		color: OZ.$("color").value,
		width: parseInt(OZ.$("width").value),
		points: [this._lastCoords, coords]
	}
	this._execCommand(command);
	
	this._lastCoords = coords;
	
	if (this._commands.length) {
		var last = this._commands[this._commands.length-1];
		if (last.type == "line") { /* just append to last command */
			last.points.push(coords);
			return;
		}
	}
	
	this._commands.push(command); /* create new command */
}

Draw.prototype._mouseup = function(e) {
	while (this._ec.length) { OZ.Event.remove(this._ec.pop()); }
}

Draw.prototype._check = function() {
	if (!this._commands.length) { return; }
	var str = JSON.stringify(this._commands);
	this._commands = [];
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
