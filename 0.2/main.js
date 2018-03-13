var io = io("http://localhost:3000/");
var ww = 3000;
var wh = 3000;
var player = {id:0,x:ww/2,y:wh/2,points:10,score:0};
var players = [];
var perm = {};
var bullets = [];
//var ast = [];

var canvas = document.getElementById("canvas");
var game = canvas.getContext("2d");

var w;
var h;

var gridWidth = 40;
var slw = 10;

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
var classBox = document.getElementById("class");
var pointsBox = document.getElementById("points");
var boardElement = document.getElementById("board");
var upgradesContainer = document.getElementById("upgrades");
var upgradeElements = [];

var classes = [
	//Fighter
	{
		reloadTime: 400,
		bulletSpeed: 1.5,
		bulletLife: 2000,
		bulletDamage: 5,
		boostPower: 2,
		mass: 0.02,
		maxHealth: 100,
		healthRegen: 0.01,
		width: 60,
		height: 80,
		c1: "#0000FF",
		c2: "#0000CC"
	},
	//Tanky
	{
		reloadTime: 400,
		bulletSpeed: 1,
		bulletLife: 2000,
		bulletDamage: 3,
		boostPower: 1,
		mass: 0.04,
		maxHealth: 150,
		healthRegen: 0.03,
		width: 70,
		height: 90,
		c1: "#FF0000",
		c2: "#CC0000"
	},
	//Striker
	{
		reloadTime: 500,
		bulletSpeed: 4,
		bulletLife: 3000,
		bulletDamage: 8,
		boostPower: 2,
		mass: 0.03,
		maxHealth: 60,
		healthRegen: 0.007,
		width: 60,
		height: 90,
		c1: "#cc00cc",
		c2: "#990099"
	},
	//Speedy
	{
		reloadTime: 400,
		bulletSpeed: 3,
		bulletLife: 1000,
		bulletDamage: 3,
		boostPower: 4,
		mass: 0.01,
		maxHealth: 80,
		healthRegen: 0.007,
		width: 60,
		height: 80,
		c1: "#00FF00",
		c2: "#00CC00"
	},
	//Destroyer
	{
		reloadTime: 500,
		bulletSpeed: 1,
		bulletLife: 2000,
		bulletDamage: 4,
		boostPower: 2,
		mass: 0.04,
		maxHealth: 120,
		healthRegen: 0.1,
		width: 90,
		height: 80,
		c1: "#CCCCCC",
		c2: "#AAAAAA"
	}
];

var menuClasses = [
	{
		description: "The basic design: good at everything, but not great at everything. The perfect class for those who are too busy to think too much.",
		stats: [3,3,2,2,3]
	},
	{
		description: "Tanky, hence the name: can take many a hit before feeling slightly irritated. Great if going fast makes you dizzy.",
		stats: [5,1,3,4,3]
	},
	{
		description: "Mean and lean. Well not actually that lean. Can strike from afar, dealing a plethora of damage (look that one up on your favourite search engine).",
		stats: [2,2,5,3,4]
	},
	{
		description: "Fast, very fast. Sometimes, too fast. Speed is key, according those who play the class (they overlook getting destroyed all the time).",
		stats: [1,5,2,1,4]
	},
	{
		description: "The embodiment of not being nice. Basically, destroy at all costs, by crashing into other ships. Prehaps it should be called 'The Battle Ram'.",
		stats: [3,2,4,5,1]
	}
];

var menuClassesStats = ["Health","Speed","Damage","Weight","Range"];

var upgrades = [
	{
		name: "Max Health",
		level: 1
	},
	{
		name: "Health Regen",
		level: 1
	},
	{
		name: "Boost Power",
		level: 1
	},
	{
		name: "Reload Speed",
		level: 1
	},
	{
		name: "Bullet Damage",
		level: 1
	},
	{
		name: "Bullet Range",
		level: 1
	},
	{
		name: "Bullet Speed",
		level: 1
	},
	{
		name: "Ability",
		level: 1
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
	function(width,height,c2) {
		game.moveTo(0,-height/2);
		game.lineTo(-width/2,height/2);
		game.lineTo(width/2,height/2);
		game.lineTo(0,-height/2);
		game.fill();
		drawLine(0,-height/2,-width/2,height/2,c2,slw,"round");
		drawLine(-width/2,height/2,width/2,height/2,c2,slw,"round");
		drawLine(width/2,height/2,0,-height/2,c2,slw,"round");
	},
	function(width,height,c2) {
		game.moveTo(-width/4,-height/2);
		game.lineTo(-width/2,height/2);
		game.lineTo(width/2,height/2);
		game.lineTo(width/4,-height/2);
		game.fill();
		drawLine(-width/4,-height/2,-width/2,height/2,c2,slw,"round");
		drawLine(-width/2,height/2,width/2,height/2,c2,slw,"round");
		drawLine(width/2,height/2,width/4,-height/2,c2,slw,"round");
		drawLine(-width/4,-height/2,width/4,-height/2,c2,slw,"round");
	},
	function(width,height,c2) {
		game.moveTo(0,-height/2);
		game.lineTo(width/2,0);
		game.lineTo(width/2,height/2);
		game.quadraticCurveTo(0,0,-width/2,height/2);
		game.lineTo(-width/2,0);
		game.fill();
		drawLine(0,-height/2,width/2,0,c2,slw,"round");
		drawLine(0,-height/2,-width/2,0,c2,slw,"round");
		drawLine(width/2,0,width/2,height/2,c2,slw,"round");
		drawLine(-width/2,0,-width/2,height/2,c2,slw,"round");
		drawCurve(-width/2,height/2,width/2,height/2,0,0,c2,slw,"round");
	},
	function(width,height,c2) {
		game.moveTo(0,-height/2);
		game.lineTo(width/2,height/2);
		game.lineTo(0,height/4);
		game.lineTo(-width/2,height/2);
		game.lineTo(0,-height/2);
		game.fill();
		drawLine(0,-height/2,width/2,height/2,c2,slw,"round");
		drawLine(width/2,height/2,0,height/4,c2,slw,"round");
		drawLine(0,height/4,-width/2,height/2,c2,slw,"round");
		drawLine(-width/2,height/2,0,-height/2,c2,slw,"round");
	},
	function(width,height,c2) {
		game.moveTo(width/4,-height/2);
		game.lineTo(width/2,height/2);
		game.quadraticCurveTo(width/4,height/4,0,height/2);
		game.quadraticCurveTo(-width/4,height/4,-width/2,height/2);
		game.lineTo(-width/4,-height/2);
		game.quadraticCurveTo(0,-height/1.5,width/4,-height/2);
		game.fill();
		drawLine(width/4,-height/2,width/2,height/2,c2,slw,"round");
		drawCurve(width/2,height/2,0,height/2,width/4,height/4,c2,slw,"round");
		drawCurve(0,height/2,-width/2,height/2,-width/4,height/4,c2,slw,"round");
		drawLine(-width/2,height/2,-width/4,-height/2,c2,slw,"round");
		drawCurve(-width/4,-height/2,width/4,-height/2,0,-height/1.5,c2,slw,"round");
	}
];

var drawShip = function(x,y,width,height,r,s,c1,c2) {
	game.fillStyle = c1;
	game.save();
	game.beginPath();
	game.translate(x+width/2,y+height/2);
	game.rotate(r+Math.PI*1.5);
	shapes[s](width,height,c2);
	//game.fill();
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

var drawCurve = function(x1,y1,x2,y2,xc,yc,c,lw,b) {
	game.lineWidth = lw;
	game.lineCap = b;
	game.strokeStyle = c;
	game.beginPath();
	game.moveTo(x1,y1);
	game.quadraticCurveTo(xc,yc,x2,y2);
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

//var renderAst = function(o) {
//	drawCircle(cx(o.x),cy(o.y),o.r,"#CCCCCC");
//};

var renderPlayer = function(o) {
	if (/*perm[o.id] == undefined*/o.id == player.id) {
		c = cls;
		r = rotation;
		n = name;
	} else {
		c = perm[o.id].cls;
		r = o.a;
		n = perm[o.id].name;
	};
	drawShip(cx(o.x),cy(o.y),classes[c].width,classes[c].height,r,c,classes[c].c1,classes[c].c2);
	//p = classes[c].width-(o.hp/classes[c].maxHealth*classes[c].width)/classes[c].maxHealth*100;
	p = o.hp/classes[c].maxHealth*70;
	color = "#00FF00";
	if (p < 30) {
		color = "#FF0000";
	};
	//drawLine(cx(o.x)+p*0.5,cy(o.y)+classes[c].height+30,cx(o.x)+classes[c].width-p*0.5,cy(o.y)+classes[c].height+30,color,12,"round");
	//drawLine(cx(o.x)+classes[c].width/2-70,cy(o.y)+classes[c].height+30,cx(o.x)+classes[c].width/2+70,cy(o.y)+classes[c].height+30,"#CCCCCC",12,"round");
	drawLine(cx(o.x)+classes[c].width/2-p,cy(o.y)+classes[c].height+30,cx(o.x)+classes[c].width/2+p,cy(o.y)+classes[c].height+30,color,12,"round");
	drawText(n,"bold 20px Arial","center",cx(o.x)+classes[c].width/2,cy(o.y)+classes[c].height+70,"#000000");
};

var findById = function(a,id) {
	return a.indexOf(a.find(function(o){return o.id == id;}));
};

var renderBullet = function(o) {
	drawCircle(cx(o.x),cy(o.y),o.r,o.c);
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

var hud = function() {
	drawText("Points: "+player.points,"bold 20px Arial","left",10,h-10,"#000000");
};

var updatePoints = function() {
	pointsBox.innerHTML = "Points: "+player.points+"<br>Score: "+player.score;
};

var updateUpgrades = function() {
	for (j=0;j<upgrades.length;j++) {
		if (upgrades[j].level*10 > player.points) {
			document.getElementById("uc"+j).style.color = "#b30000";
		} else {
			document.getElementById("uc"+j).style.color = "#FFFFFF";
		};
	};
};

var upgradeClick = function(e) {
	id = e.target.parentNode.getAttribute("id");
	if (id && id.length == 2) {
		id = Number(id.substr(1,1));
		if (upgrades[id].level*10 <= player.points) {
			io.emit("upgrade",id);
			player.points -= upgrades[id].level*10;
			upgrades[id].level++;
			document.getElementById("uc"+id).innerHTML = upgrades[id].level*10;
			updateUpgrades();
			updatePoints();
		};
	};
};

var setupUpgrades = function() {
	upgradesContainer.innerHTML = "";
	for (i=0;i<upgrades.length;i++) {
		upgradesContainer.innerHTML += "<div class=\"upgrade round\" id=\"u"+i+"\"><div class=\"uinner\">"+upgrades[i].name+"<span id=\"uc"+i+"\"class=\"ucost\">10</span></div></div>";//<div class=\"ubar round\"></div>
		upgradeElements.push(document.getElementById("u"+i));
		upgradesContainer.onclick = upgradeClick;
	};
	updateUpgrades();
};

io.on("ready",function(n) {
	ready = 1;
	name = n;
	menuElement.style.opacity = "0";
	setTimeout(function(){menuElement.style.visibility = "hidden";},1000);
	pointsBox.style.visibility = "visible";
	upgradesContainer.style.visibility = "visible";
	updatePoints();
	setupUpgrades();
});

io.on("die",function() {
	ready = 0;
	menuElement.style.visibility = "visible";
	menuElement.style.opacity = "1";
	upgradesContainer.style.visibility = "hidden";
	pointsBox.style.visibility = "hidden";
	player.points = 10;
	player.score = 0;
	for (i=0;i<upgrades.length;i++) {
		upgrades[i].level = 1;
	};
	updatePoints();
});

io.on("self",function(object) {
	player = {id:object.id,x:object.x,y:object.y,points:10,score:0};
});

io.on("player",function(object) {
	players.push({id:object.id,x:object.x,y:object.y});
	perm[object.id] = {name:object.name,cls:object.cls};
});

//io.on("asteroid",function(o) {
	//ast.push({id:o.id,x:o.x,y:o.y,r:o.r,hp:o.hp});
//});

io.on("death",function(id) {
	for (i in players) {
		if (players[i].id == id) {
			players.splice(i,1);
		};
	};
});

io.on("fire",function(owner,id,x,y,a,s,l,r,c) {
	bullets.push({id:id,owner:owner,x:x,y:y,angle:a,speed:s,life:l,created:Date.now(),lastUpdate:Date.now(),r:r,c:c});
});

io.on("deleteBullet",function(id) {
	for (i in bullets) {
		if (bullets[i].id == id) {
			bullets.splice(i,1);
		};
	};
});

io.on("points",function(p,s) {
	player.points = p;
	player.score = s;
	updatePoints();
	updateUpgrades();
});

io.on("board",function(a) {
	html = "";
	for (i=0;i<a.length;i++) {
		bold = "";
		if (a[i].id == player.id) {
			bold = " style=\"font-weight:bold;\"";
		};
		html += "<tr"+bold+"><td class=\"bname\">"+(i+1)+". "+a[i].name+"</td><td class=\"bscore\">"+a[i].score+"</td></tr>";
	};
	boardElement.innerHTML = html;
});

io.on("update",function(pa,aa) {
	players = [];
	//ast = [];
	for (i in pa) {
		if (pa[i].id == player.id) {
			player = {id:pa[i].id,x:pa[i].x,y:pa[i].y,a:pa[i].a,hp:pa[i].hp,points:player.points,score:player.score};
		} else {
			players.push({id:pa[i].id,x:pa[i].x,y:pa[i].y,a:pa[i].a,hp:pa[i].hp});
		};
	};
	//for (i in aa) {
		//ast[findById(ast,aa[i].id)] = {id:aa[i].id,x:aa[i].x,y:aa[i].y,r:aa[i].r,hp:aa[i].hp};
		//ast.push({id:aa[i].id,x:aa[i].x,y:aa[i].y,r:aa[i].r,hp:aa[i].hp});
	//};
});

canvas.onmousedown = function() {
	if (ready) {
		//setTimeout(function(){io.emit("mousedown",1);},200);
		io.emit("mousedown",1);
	};
};

canvas.onmouseup = function() {
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
	cls = Number(classBox.value);
	io.emit("ready",aliasBox.value,cls);
};

var update = function() {
	game.clearRect(0,0,w,h);
	background();
	//for (i=0;i<ast.length;i++) {
	//	renderAst(ast[i]);
	//};
	for (i=0;i<bullets.length;i++) {
		renderBullet(bullets[i]);
	};
	for (i=0;i<players.length;i++) {
		renderPlayer(players[i]);
	};
	if (ready) {
		renderPlayer(player);
	};
	//hud();
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