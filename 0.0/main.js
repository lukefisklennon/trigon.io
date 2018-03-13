var io = io("http://localhost:3000/");
var ww = 3000;
var wh = 3000;
var player = {id:0,x:ww/2,y:wh/2};
var players = [];
var perm = {};
var bullets = [];

var canvas = document.getElementById("canvas");
var game = canvas.getContext("2d");

var w;
var h;

var gridWidth = 30;

var name;
var cls = 0;
var rotation = 0;
var ready = 0;

var resizeCanvas = function() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	w = canvas.width;
	h = canvas.height;
};

window.addEventListener("resize", resizeCanvas, false);
resizeCanvas();

var menuElement = document.getElementById("menu");
var playButton = document.getElementById("play");
var aliasBox = document.getElementById("alias");

var classes = [
	{
		reloadTime: 200,
		bulletSpeed: 2,
		bulletLife: 5000,
		boostPower: 2,
		friction: 0.02,
		maxHealth: 100,
		width: 60,
		height: 80
	}
];

//Function: angle from points
var afp = function(x1,y1,x2,y2) {
	return Math.atan2(y2-y1,x2-x1);
};

//Function: point from angle
var pfa = function(x,y,a,d) {
	return [Math.cos(a)*d+x,Math.sin(a)*d+y];
};

//Function: distance from points
var dfp = function(x1,y1,x2,y2) {
	return Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));
};

//Function: return random number in range
var random = function(r) {
	return Math.floor(Math.random()*r);
};

var cx = function(n) {
	return n-player.x+w/2-classes[cls].width/2;
};

var cy = function(n) {
	return n-player.y+h/2-classes[cls].height/2;
};

var collision = function(x1,y1,w1,h1,x2,y2,w2,h2) {
	return !(x2 > x1+w1 || x2+w2 < x1 || y2 > y1+h1 || y2+h2 < y1);
};

var shapes = [
	function(width,height) {
		game.moveTo(0,-height/2);
		game.lineTo(-width/2,height/2);
		game.lineTo(width/2,height/2);
		game.lineTo(0,-height/2);
	}
];

var drawShape = function(x,y,width,height,r,s,c1,c2,lw) {
	game.fillStyle = c1;
	game.save();
	game.beginPath();
	game.translate(x+width/2,y+height/2);
	game.rotate(r+Math.PI*1.5);
	shapes[s](width,height);
	game.fill();
	game.lineWidth = lw;
	game.lineCap = "round";
	game.strokeStyle = c2;
	game.stroke();
	game.restore();
};

var drawCircle = function(x,y,r,c) {
	game.fillStyle = c;
	game.beginPath();
	game.arc(x,y,r,0,2*Math.PI);
	game.closePath();
	game.fill();
};

var drawLine = function(x1,y1,x2,y2,c,lw,b) {
	game.lineWidth = lw;
	game.lineCap = b;
	game.strokeStyle = c;
	game.beginPath();
	game.moveTo(x1,y1);
	game.lineTo(x2,y2);
	game.stroke();
	game.closePath();
};

var drawRect = function(x,y,width,height,c,a) {
	game.fillStyle = c;
	game.globalAlpha = a;
	game.fillRect(x,y,width,height);
	game.globalAlpha = 1;
};

var drawText = function(t,s,a,x,y,c) {
	game.fillStyle = c;
	game.textAlign = a;
	game.font = s;
	game.fillText(t,x,y);
};

var renderPlayer = function(o) {
	if (perm[o.id] == undefined) {
		c = cls;
		r = rotation;
		n = name;
	} else {
		c = perm[o.id].cls;
		r = o.a;
		n = perm[o.id].name;
	};
	drawShape(cx(o.x),cy(o.y),60,80,r,0,"#0000FF","#0000CC",10);
	p = classes[c].width-(o.hp/classes[c].maxHealth*classes[c].width)/classes[c].maxHealth*100;
	color = "#FF0000";
	if (p < 30) {
		color = "#00FF00";
	};
	drawLine(cx(o.x)+p*0.5,cy(o.y)+classes[c].height+30,cx(o.x)+classes[c].width-p*0.5,cy(o.y)+classes[c].height+30,color,12,"round");
	drawText(n,"bold 20px Arial","center",cx(o.x)+classes[c].width/2,cy(o.y)+classes[c].height+70,"#000000");
};

var renderBullet = function(o) {
	drawCircle(cx(o.x),cy(o.y),10,"#0000CC");
};

var updateBullet = function(o) {
	m = (Date.now()-o.lastUpdate)/5;
	if ((Date.now()-o.created) > o.life) {
		bullets.splice(bullets.indexOf(o),1);
	};
	point = pfa(o.x,o.y,o.angle,o.speed*m);
	o.x = point[0];
	o.y = point[1];
	f = 0;
	if (o.x < 0) {
		o.x = 0;
		f = 1;
	};
	if (o.x > ww) {
		o.x = ww;
		f = 1;
	};
	if (o.y < 0) {
		o.y = 0;
		f = 2;
	};
	if (o.y > wh) {
		o.y = wh;
		f = 2;
	};
	if (f > 0) {
		if (f == 1) {
			o.angle = Math.PI-o.angle;
		} else {
			o.angle = 0-o.angle;
		};
	};
	o.lastUpdate = Date.now();
};

var background = function() {
	tx = (player.x/gridWidth-Math.floor(player.x/gridWidth))*gridWidth;
	ty = (player.y/gridWidth-Math.floor(player.y/gridWidth))*gridWidth;
	for (i=0;i<(w/gridWidth)+1;i++) {
		ttx = (i*gridWidth)-tx;
		drawLine(ttx,0,ttx,h,"#A3A3A3",1,"butt");
	};
	for (i=0;i<(h/gridWidth)+1;i++) {
		tty = (i*gridWidth)-ty;
		drawLine(0,tty,w,tty,"#A3A3A3",1,"butt");
	};
	drawRect(cx(-w),cy(0),w,wh,"#000000",0.4);
	drawRect(cx(ww),cy(0),w,wh,"#000000",0.4);
	drawRect(cx(-w),cy(-h),ww+w*2,h,"#000000",0.4);
	drawRect(cx(-w),cy(wh),ww+w*2,h,"#000000",0.4);
};

io.on("ready",function(n) {
	ready = 1;
	name = n;
	menuElement.style.opacity = "0";
	setTimeout(function(){menuElement.style.visibility = "hidden";},1000);
});

io.on("die",function() {
	ready = 0;
	menuElement.style.visibility = "visible";
	menuElement.style.opacity = "1";
});

io.on("self",function(object) {
	player = {id:object.id,x:object.x,y:object.y};
});

io.on("player",function(object) {
	players.push({id:object.id,x:object.x,y:object.y});
	perm[object.id] = {name:object.name,cls:object.cls};
});

io.on("death",function(id) {
	for (i in players) {
		if (players[i].id == id) {
			players.splice(i,1);
		};
	};
});

io.on("fire",function(owner,id,x,y,a,s,l) {
	bullets.push({id:id,owner:owner,x:x,y:y,angle:a,speed:s,life:l,created:Date.now(),lastUpdate:Date.now()});
});

io.on("deleteBullet",function(id) {
	for (i in bullets) {
		if (bullets[i].id == id) {
			bullets.splice(i,1);
		};
	};
});

io.on("update",function(pa) {
	players = [];
	for (i in pa) {
		if (pa[i].id == player.id) {
			player = {id:pa[i].id,x:pa[i].x,y:pa[i].y,a:pa[i].a,hp:pa[i].hp};
		} else {
			players.push({id:pa[i].id,x:pa[i].x,y:pa[i].y,a:pa[i].a,hp:pa[i].hp});
		};
	};
});

document.onmousedown = function() {
	if (ready) {
		//setTimeout(function(){io.emit("mousedown",1);},200);
		io.emit("mousedown",1);
	};
};

document.onmouseup = function() {
	if (ready) {
		//setTimeout(function(){io.emit("mousedown",0);},200);
		io.emit("mousedown",0);
	};
};

document.onmousemove = function(e) {
	if (ready) {
		rotation = afp(w/2,h/2,e.pageX,e.pageY);
		//setTimeout(function(){io.emit("mousemove",rotation);},200);
		io.emit("mousemove",rotation);
	};
};

playButton.onclick = function() {
	localStorage.alias = aliasBox.value;
	io.emit("ready",aliasBox.value);
};

var update = function() {
	game.clearRect(0,0,w,h);
	background();
	for (i=0;i<bullets.length;i++) {
		renderBullet(bullets[i]);
	};
	for (i=0;i<players.length;i++) {
		renderPlayer(players[i]);
	};
	if (ready) {
		renderPlayer(player);
	};
	frame(update);
};

var frame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || window.mozRequestAnimationFrame;
update();

setInterval(function() {
	for (i=0;i<bullets.length;i++) {
		updateBullet(bullets[i]);
	};
},5);

if (localStorage.alias) {
	aliasBox.value = localStorage.alias;
} else {
	localStorage.alias = "";
};