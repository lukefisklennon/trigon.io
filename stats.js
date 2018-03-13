const request = require ("request");
const fs = require ("fs");

var total = 0;

var file = fs.readFileSync ("droplets.txt", "utf-8");
var droplets = file.split("\n\n");

var responses = 0;

var names = {};

for (i in droplets) {
    var split = droplets[i].split("\n");
    var name = split[0];
    var ip = split[2];
    names[ip] = name;
    request("http://" + ip + ":3000/players/", function (error, response, body) {
        console.log(names[response.request.href.split(":")[1].split("//")[1]] + ": " + body + " players");
        total += Number (body);
        responses++;
        if (responses >= droplets.length) {
            console.log("Total: " + total + " players");
        }
    });
}
