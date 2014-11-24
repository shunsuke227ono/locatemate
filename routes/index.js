var express = require('express');
var data = require('./data');//ここにあるdata。
var router = express.Router();
var config = require('../config');
var FB = require('fb');

/* memo: when upload index.js, restart server*/

/* GET home page. */
router.get('/', function(req, res){
//  res.render('myPage', {servicename:'Locate Mate', username:'USERNAME' });
  res.render('facebook_login',{layout:false});
});

router.get('/search_page.html', function(req,res){
	console.log('req get');
	data.getData(function(jsonData){
		res.render('search_page.handlebars',{feedData:jsonData.photofeed, layout:false});
	});
});

router.get('/javascripts/facebook_map.js', function(req, res){
	res.render('facebook_map.handlebars',{layout:false});
});

router.post('/auth', function(req,res){
	console.log('recieved short-lived-token');
	console.log('accesstoken; ; '+req.body.authResponse.accessToken);
		//verify app id
	//exchange for long term access token
	FB.api('oauth/access_token',
		{grant_type:'fb_exchange_token',
			client_id: config.facebook.appId,
			client_secret: config.facebook.appSecret,
			fb_exchange_token: req.body.authResponse.accessToken
		},
		function(response){
			if(!response||response.error){
				console.log(!response?'error occured':res.error);
				return;
			}
			console.log('long term token obtained');
			console.log('long term token:: ' + response.access_token);
			req.session.accessToken = response.access_token;
			req.session.expires = response.expires ? res.expires:0;
			
			var defaultPIC;	
			FB.api('/me',
				{access_token: req.session.accessToken},
				function(response){
					if(response && !response.error){
						console.log('recieved: '+JSON.stringify(response));
						console.log("session fbid: "+ req.session.fbid);
						req.pool.getConnection(function(err, connection){
							query = "SELECT fbid FROM user WHERE fbid = "+ response.id+";";
							//to check if the user already exist in db.
							console.log(query);
							connection.query(query,
								function(err, rows, fields){
									console.log("rows: " + rows.length);
									if(rows.length == 0){
										//if the id does not exists yet
										defaultPIC = "http://www.google.com.au/url?sa=i&rct=j&q=&esrc=s&source=images&cd=&cad=rja&uact=8&ved=0CAcQjRw&url=http%3A%2F%2Fartsci.ucla.edu%2F%3Fq%3Dimages%2Fprofile-picture-placeholder&ei=Y3RPVMTYFdjh8AXfm4GICQ&bvm=bv.77880786,d.dGc&psig=AFQjCNFou-VfveLxmgbfABNd_UY6sXc_bA&ust=1414579680805692";
										query = "INSERT INTO user values ('"+response.name+"',"+response.id+",'"+response.location.name+"',"+"'"+defaultPIC+"'"+");";//empty for picture
										connection.query(query,
											function(err, rows, fields){
												if(err) throw err;
											});
									}
									connection.release();
									if(err) throw err;
								});
						});
						req.session.fbid = response.id;
						console.log("session fbid: "+ req.session.fbid);
						req.session.myName = response.name;
						FB.api('/me/picture',
							{access_token: req.session.accessToken},
							function(response){
								console.log("accesstoken: " + req.session.accessToken);
								console.log(response);
								console.log("response hahahahahahah: " + JSON.stringify(response));
								if(response && !response.error){
									console.log('PPPPPPPrecieved for picture: '+JSON.stringify(response));
									req.pool.getConnection(function(err, connection){
										query = "SELECT picture FROM user WHERE fbid = "+ req.session.fbid+";";
										console.log(query);
										connection.query(query,
											function(err, rows, fields){
												if(rows[0] == defaultPIC){
													query = "UPDATE user SET picture = "+response.data.url+" WHERE fbid="+req.session.fbid+";";
													connection.query(query,
														function(err,rows,fields){
															if(err) throw err;
														});
												}
												connection.release();
												res.send(200);
												if(err) throw err;
											});
									});
								}else{
									//case if the user doent have profile picture.
									console.log("RERRERRRRR");
									res.send(200);
								}
							});
					}
				});
		});
});

//here was GET /model.data.json before
router.get('/friendsData', function(req, res){
	
	var accessToken = req.session.accessToken;

	if(!accessToken){
		console.log('access token not available');
		window.location.assign("http://localhost:3000/facebook_login.html");
		//->login page ka
		res.send(404);
	}else{
		FB.api("/me/friends",
			{access_token: req.session.accessToken},
			function(response){
				if(response&&!response.error){
					console.log('recieved_friends: ' + JSON.stringify(response.data));
					//for each friend in the response get the location data
					processFriends(response.data, req,//pass req as args to use it in processFriends to get fbid, accesstoken
						function(locationData){
							console.log('finished processing friends' + 
										JSON.stringify(locationData));
							res.send(JSON.stringify(locationData));
						});
				}else{
					console.log(response.error);
					res.send(500);
				}
			});
	}
});

router.get('/rangeFriend', function(req, res){
	var accessToken = req.session.accessToken;
	var locationData = {locations:[]};
	var processed = 0;
	if(!accessToken){
		console.log("access token not available");
		window.location.assign("http://localhost:3000/facebook_login.html");
		res.send(404);
	}else{
		FB.api("/me",
			{access_token: accessToken},
			function(response){
				if(response&&!response.error){
					console.log("recieved me for range filter: " + JSON.stringify(response.data));
					var myID = response.id;
					req.pool.getConnection(function(err, connection){
						if(err) throw err;
						var query = "SELECT fbid2 from friend WHERE fbid1="+myID+";";
						connection.query(query,
							function(err, rows, fields){
								if(err) throw err;
								connection.release();
								var index = 0;
								while(index < rows.length){
									var personID = rows[index].fbid2;
									getPeopleData(req, personID, 
										function(){
											if(processed == rows.length){
												res.send(JSON.stringify(locationData));
											}
										}
									);
									index++;
									console.log("processed: " + processed);
									console.log("rows.length: " + rows.length);
								}
							});
					});
				}else{
					console.log(response.error);
					res.send(500);
				}
		});
	}

	function getPeopleData(req,personID, callback){
		req.pool.getConnection(function(err, connection){
			if(err) throw err;
			var query = "SELECT lat, lng, userName, locationName, picture FROM post WHERE fbid="+personID+";";
			console.log(query);
			connection.query(query,
				function(err, rows, fields){
					if(err) throw err;
					connection.release();
					for(var i=0; i<rows.length; i++){
						var markerInfo = {
							name: rows[i].userName,
							lat: rows[i].lat,
							lng: rows[i].lng,
							locationName: rows[i].locationName,
							picture: rows[i].picture
						};
						locationData.locations.push(markerInfo);
					}
					processed++;
					callback();
			});
		});
	}

});

router.get('/rangeEveryone', function(req, res){
	var locationData = {locations: []};
	var processed = 0;
	req.pool.getConnection(function(err, connection){
		if(err) throw err;
		var query = "SELECT lat, lng, userName, locationName, picture FROM post";
		console.log(query);
		connection.query(query,
			function(err, rows, fields){
				if(err) throw err;
				connection.release();
				for(var i=0; i<rows.length; i++){
					var markerInfo = {
						name: rows[i].userName,
						lat: rows[i].lat,
						lng: rows[i].lng,
						locationName: rows[i].locationName,
						picture: rows[i].picture
					};
					locationData.locations.push(markerInfo);
				}
				res.send(locationData);

		});	
	});
});

function processFriends(friends, req, callback){
	//this is default function for mapping friends and storeing to db.
	//need to make another function to correspond to filter and update mapping form db
	console.log('processing friends ' + friends);
	var friendCount = friends.length;
	var friendsProcessed = 0;
	var friendsInserted = 0;
	var locationData = {friendslocations:[]};
	//friendslocations is the name of property.
	var accessToken = req.session.accessToken;
	var myID = req.session.fbid;
	
	var insertIndex = 0;
	//if we dont use insertIndex, while would be infinity and call too many req.pool~~ and crush.
	//to limit how many we call req.pool~ we neeed to have frinedIndex in addition to friendsInserted.
	//have to do req.pool~first. if you do while loop first, while waiting req.pool~ while go ahead and
	//you only see insertIndex = 1;
	//と思ったけど、functionの中でconnection.queryだけ使うこともできないから、どうせinsertFriendの中で、
	//req.pool.get~~しないといけない。
	//by passing friendInsert as args, we can process each friend properly.
	while(insertIndex < friendCount){
		//Get friend locations and add to the location Data
		var friendInsert = friends[insertIndex];
		console.log("error? insertIndex: "+insertIndex);
		console.log("insert processing "+ friendInsert.name);
		var query = 'SELECT fbid1, fbid2 FROM friend WHERE friend.fbid1=' + myID + ' AND friend.fbid2='+ friendInsert.id + ';';
		console.log(query);
		insertFriend(friendInsert, query, req);
		// cant insert to user table here because we dont have location info.
		//insert to user only when the user himself login to the service.
		insertIndex++;
	}
//	});
	function insertFriend(friend, query, req){
		//by getting friend as args, それぞれのfriend情報受け取れる。
		//もしfunctionとしてわけないとconnection.query待ってる間に、
		//friendIndexが進んで、friend が変わっていく。
		req.pool.getConnection(function(err, connection){
			if(err) throw err;
			console.log("insert function for " + friend.name);
			connection.query(query,
				function(err, rows, fields){
					if(err) throw err;
					if(rows.length==0){
						console.log("adding " + friend.name + ' to friend table');
						var query = 'INSERT INTO friend values ('+myID+','+friend.id+');';
						console.log(query);
						connection.query(query,
							function(err, rows, fields){
								if(err) throw err;
								//connection.release();
							}
						);
					}
					connection.release();
				}
			);
		});
	}
	var	friendIndex = 0;
	while(friendIndex < friendCount){
		var friend = friends[friendIndex];
		console.log(friend.name+"no tern");
		getFriendLocations(friend, req, 
						function(name, locations){
							//このnameとlocationはこのcallbackが始まる前のgetFriendLocationsで
							//定義されてこのcallbackに渡されるのか。
							//その前のやつってのは、下の関数宣言でみれる。
							//get friends will call this callback with
							//name of friends and locations.
							//Add code to add these places to locationData object here
							var placeIndex = 0;
							var placeCount = locations.length;
							while(placeIndex < placeCount){
								var place = locations[placeIndex].place.location;
								console.log('adding place: ' + JSON.stringify(place));
								var markerInfo ={name: name,
												lat:place.latitude,
												lng:place.longitude};
								locationData.friendslocations.push(markerInfo);
								placeIndex++;
							}
							friendsProcessed++;
							//if we've processed all the friends return the location data
							if(friendsProcessed == friendCount){
								callback(locationData);//これはprocessFriendのcallback
								//ここじゃなくてwhileの後に書いたりしたら、これは同時進行型なので、
								//whileが終わる前に処理されてしまう。
								//なので、前後関係保存するためにwhileの中でカウントしてif使う。
								//while自体は1セットなので、while内のコード全てが終わったら次のループに行くので、
								//処理回数と、friendsProcessのカウント回数はちゃんと一致する。
								//そうしてしっかり処理し終わった情報をcallbackに渡すことができる。
								//friendIndex==friendCountでもいいのか プリントに書いた
							}
						});
		friendIndex++;
	}
}
function getFriendLocations(friend, req, callback){
	console.log('getting location information for '+ friend.name);
	FB.api("/"+friend.id+"/tagged_places",
		{access_token: req.session.accessToken},
		function(placesResponse){
			//placeResponseはこのcallbackの直前にFB.apiによって得られる。
			if(placesResponse && !placesResponse.error){
				console.log(placesResponse.data);
				var placeIndex = 0;
				var placeCount = placesResponse.data.length;
				while(placeIndex < placeCount){
					var place = placesResponse.data[placeIndex];
					insertLocations(friend, place, req);
					placeIndex++;
				}
				callback(friend.name, placesResponse.data);//ここでcallbackに引数渡してる。
			}else{
				console.log(response.error);
				res.send(500);
			}
		});
}
function insertLocations(friend,placeData, req){
	//placeData is each json for location
	var query = "SELECT id FROM post WHERE post.id="+ placeData.id + ";";
	req.pool.getConnection(function(err, connection){
		if(err) throw err;
		console.log(query);
		connection.query(query,
			function(err, rows, fields){
				if(err) throw err;
				if(rows.length==0){
					console.log("adding place to table for " + friend.name);
					var date = "";
					for(var i=0; i<19; i++){
						var c = placeData.created_time[i];
						if(c=='T') date += ' ';
						else date += c;
					}
					var query = "INSERT INTO post values ("+placeData.id+","+friend.id+","+placeData.place.location.latitude+","+placeData.place.location.longitude+",'"+placeData.place.name+"','"+friend.name+"','"+date+"','hangout',"+"'url'"+");";
					console.log(query);
					connection.query(query,
						function(err, rows, fields){
							if(err) throw err;
					});
				}
				connection.release();
			});
		});		
}

router.get('/wishlist.html', function(req, res){
	data.getData(function(jsonData){
		res.render('wishlist.handlebars',{wishData:jsonData.wishlist, layout:false});
	});
});


router.post('/addWish',function(req, res){
	console.log('router add wish');
	//doing writeData with argument of "req.body". function() is callback function. using callback for debug here.
	//wrote sorce of writeDate() in routes dir (same as this).
	data.writeData(req.body,
		function(){
			console.log("added" + req.body.name);
			res.send(200);
		});
});



module.exports = router;
