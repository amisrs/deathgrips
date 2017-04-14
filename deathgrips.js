console.log("Starting bot...");
var Discord = require("discord.js");
var request = require("request");
var async = require("async");
var fs = require("fs");
var YouTube = require("youtube-node");
var ytdl = require("ytdl-core");

var youtube = new YouTube();
var bot = new Discord.Client();

var key = fs.readFileSync("key.txt", "utf-8").toString().split("\n")[0];
var token = fs.readFileSync("token.txt", "utf-8").toString().split("\n")[0];
var youtubeWatchURL = "https://www.youtube.com/watch?v=";
var durationRE = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/g;

youtube.setKey(key);
bot.login(token);

var downloadQueue = [];
var playQueue = [];
var textChannel = "";
var isPlaying = false;
var continuePlaying = false;
var dispatcher = "";

var helpMsg = `deathgrips instructions: \n
    !dg add [search]    - Add the top result of YouTube search to queue.\n
    !dg delete [number] - Delete [number] item from queue (use numbers from !dg queue)\n
    !dg play            - Start playing queue in your channel.\n
    !dg skip            - Be bm and skip current thing.\n
    !dg explode         - Be super bm and destroy the whole queue.\n
    !dg break           - Ends current song and halts queue.\n
    !dg queue           - Look at the queue.
    `;


bot.on("message", msg => {
    console.log("Heard message!");
    //console.log(msg);
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
	    	youtube.search(toSearch, 3, function(error, result) {
			    if(error) {
			    	console.log(error);
                    msg.channel.sendMessage("search error, try again");
    			} else {
	    			console.log(JSON.stringify(result,null,3));
		    		if(result.items.length > 0) {
			    		var gotVideo = false;
				    	for(var i=0; i<result.items.length && !gotVideo; i++) {
					    	if(result.items[i].id.kind == "youtube#video") {
							    var videoDeets = {
						    		"id": result.items[i].id.videoId,
								    "name": result.items[i].snippet.title,
                                }

			    	    	    gotVideo = true;
                                var length = getVideoLength(result.items[i].id.videoId, function(result) {
                                    videoDeets.length = result;
                            	    console.log(videoDeets);
                                    msg.channel.sendMessage("Queueing up: " + videoDeets.name + " ["+videoDeets.length+"]");
	    	    					downloadQueue.push(videoDeets);
		    	    			    console.log(downloadQueue);
                                    if(downloadQueue.length == 1 && !isPlaying) {
                                       startQueue(msg);
                                    }
                                });
    				        }
                        }
	    				if(!gotVideo) {
    		    			msg.channel.sendMessage("bad search terms, found no video");
	    				}
		    		}
			    }
            });
        } else if(command == "explode") {
			console.log("explode");
            msg.channel.sendMessage("nuked the queue");
			downloadQueue = [];
		} else if(command == "play") {
            if(isPlaying) {
                return msg.channel.sendMessage("already playing dunkass");
            }
		    startQueue(msg);
		} else if(command == "skip") {
            msg.channel.sendMessage("skipping...");
			dispatcher.end();
		} else if(command == "queue") {
			var qString = "";
			for(var i=0; i<downloadQueue.length; i++) {
				qString += i+". "+downloadQueue[i].name+" ["+downloadQueue[i].length+"]\n";
		    }
            if(downloadQueue.length == 0) {
                qString += "Empty queue!!";
            }
			msg.channel.sendMessage(qString);
		} else if(command == "delete") {
            if(isNaN(argv)) {
                msg.channel.sendMessage("cant delete non number dummy");
            } else {
    		    if(downloadQueue.length > argv) {
                    downloadQueue.splice(argv, 1);
                } else {
                    msg.channel.sendMessage("number is too high dude");
                }
            }
        } else if(command == "break"){
            if(!isPlaying) {
                msg.channel.sendMessage("not even playing man");
            } else {
                continuePlaying = false;
                dispatcher.end();
            }
        }
        else {
            msg.channel.sendMessage(helpMsg);
        }
    }
});

bot.on("ready", () => {
    console.log("ready");
})


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

var startQueue = function(msg) {
    const voiceChannel = msg.member.voiceChannel;
	if(!voiceChannel) {
		msg.channel.sendMessage("hey join a channel first chucklehead");
	} else {
		textChannel = msg.channel;
        voiceChannel.join().then(connection => {
    		if(downloadQueue.length > 0) {
                continuePlaying = true;
				playVideo(downloadQueue.shift(), connection);
			}
		});
    }
}

var playVideo = function(video, connection) {
	let stream = ytdl(youtubeWatchURL+video.id, { audioonly: true });
    sendNowPlaying(video.id);
	isPlaying = true;
	dispatcher = connection.playStream(stream);
    bot.user.setGame(video.name);
	dispatcher.on('end', () => {
		console.log("end");
		isPlaying = false;
        console.log(downloadQueue.length);
		if(downloadQueue.length > 0 && continuePlaying) {
			playVideo(downloadQueue.shift(), connection);
        }
    });
}


var sendNowPlaying = function(id) {
    textChannel.sendMessage("Now playing: " + youtubeWatchURL+id);
}

var getVideoLength = function(id, _callback) {
    youtube.getById(id, function(error, result) {
        if(error) {
            console.log("error getting length");
            console.log(error);
        } else {
            console.log(result.items[0].contentDetails.duration);
            console.log(durationRE);
            var match = durationRE.exec(result.items[0].contentDetails.duration);
            console.log(durationRE);
            console.log(match);
            var timeString = "";
            for(var i=1; i<match.length; i++) {
                if(match[i] == null) {
                    timeString += "00";
                } else {
                    timeString += padStart(match[i], 2, "0");
                }
                if(i != match.length -1) {
                    timeString += ":";
                }
            }
            durationRE.lastIndex = 0;
            _callback(timeString);
        }
    });
}

var padStart = function(value, size, padChar) {
    while(value.length < size) {
        value = padChar + value;
    }
    return value;
}
