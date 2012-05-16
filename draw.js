var Draw = OZ.Class();
Draw.URL = "ws://" + location.host + ":8888/draw";
Draw.prototype.init = function() {
	this._socket = new (window.WebSocket || window.MozWebSocket)(Draw.URL);
	this._canvas = OZ.$("canvas");
	this._file = OZ.$("file");
	this._text = OZ.$("text_value");
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
	
	OZ.Touch.onActivate(OZ.$("line"), function() {
		this._setMode("line");
	}.bind(this));
	OZ.Touch.onActivate(OZ.$("clear"), function() {
		this._setMode("clear");
	}.bind(this));
	OZ.Touch.onActivate(OZ.$("image"), function() {
		this._setMode("image");
	}.bind(this));
	OZ.Touch.onActivate(OZ.$("text"), function() {
		this._setMode("text");
	}.bind(this));
	
	var options = OZ.$("line_color").getElementsByTagName("option");
	for (var i=0;i<options.length;i++) {
		var c = options[i].value;
		if (c == "#000") { options[i].style.color = "white"; }
		options[i].style.backgroundColor = c;
	}
	var options = OZ.$("text_color").getElementsByTagName("option");
	for (var i=0;i<options.length;i++) {
		var c = options[i].value;
		if (c == "#000") { options[i].style.color = "white"; }
		options[i].style.backgroundColor = c;
	}
	
	this._setMode("line");
	OZ.Touch.onStart(this._canvas, this._mousedown.bind(this));
	OZ.Event.add(this._file, "change", this._change.bind(this));
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
}

Draw.prototype._close = function(e) {
	console.log("Connection closed :/");
}

Draw.prototype._error = function(e) {
	console.log("Connection error :/");
}

Draw.prototype._eventToCoords = function(e) {
	var epos = OZ.Touch.pos(e);
	var pos = OZ.DOM.pos(this._canvas);
	return [epos[0] - pos[0] - this._canvas.clientLeft, epos[1] - pos[1] - this._canvas.clientTop];
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

		case "text":
			this._ctx.fillStyle = command.color;
			this._ctx.font = command.size + "px sans-serif";
			this._ctx.textBaseline = "top";
			this._ctx.fillText(command.text, command.x, command.y);
		break;
	}
}

Draw.prototype._mousedown = function(e) {
	OZ.Event.prevent(e);
	switch (this._mode) {
		case "line":
			this._ec.push(OZ.Touch.onMove(document, this._mousemove.bind(this)));
			this._ec.push(OZ.Touch.onEnd(document, this._mouseup.bind(this)));
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
		
		case "text":
			if (!this._text.value) { return; }
			var coords = this._eventToCoords(e);
			var command = {
				type: "text",
				text: this._text.value,
				color: OZ.$("text_color").value,
				size: parseInt(OZ.$("text_size").value),
				x: coords[0],
				y: coords[1]
			}
			this._text.value = "";
			this._commands.push(command);
			this._execCommand(command);
		break;
	}
	
}

Draw.prototype._mousemove = function(e) {
	var coords = this._eventToCoords(e);
	var command = {
		type: "line",
		color: OZ.$("line_color").value,
		width: parseInt(OZ.$("line_width").value),
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
