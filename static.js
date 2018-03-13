var express = require("express");
var app = express();
var server = require("http").Server(app);

server.listen(2000);
app.use(express.static("public"));