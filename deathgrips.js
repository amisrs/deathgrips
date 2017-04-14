console.log("Starting bot...");
var Discord = require("discord.js");
var request = require("request");
var async = require("async");
var fs = require("fs");
var YouTube = require("youtube-node");

var youtube = new YouTube();
var bot = new Discord.Client();
var key = fs.readFileSync("key.txt", "utf-8").toString().split("\n")[0];
var token = fs.readFileSync("token.txt", "utf-8").toString().split("\n")[0];

youtube.setKey(key);
bot.login(token);

var queue = [];

bot.on("message", msg => {
    console.log("Heard message!");
    console.log(msg);
    var found = false;
    if(msg.content.startsWith("!dg") && (msg.author.username != "deathgrips")) {
        var argv = msg.content.split(" ");
        console.log(argv);
		argv.shift()

        var command = argv.shift();
        console.log(command);

        if(command == "add") {
            console.log("add");
            var toSearch = mushArgs(...argv);
            console.log("search terms: " + toSearch);
			youtube.search(toSearch, 1, function(error, result) {
				if(error) {
					console.log(error);
				} else {
					console.log(JSON.stringify(result, null, 2));
				}
			});
        }
    }	
});

bot.on("ready", () => {
    console.log("ready");
});

var mushArgs = function(...args) {
    var retval = "";
    for(var i=0; i < args.length; i++) {
        retval = retval.concat(args[i]);
		if(i != args.length - 1) {
			retval = retval.concat(" ");
		}
    } 
	return retval;
}
