fs = require('fs');
path = require('path');

exports.getData = function(callback){
	fs.readFile(path.join(path.join(__dirname, '../model'),'data.json'),
	function(err, data){
		if(err) throw err;
		var obj = JSON.parse(data);
		callback(obj);
	});
};
exports.writeData = function(jsonData, callback){
	console.log("write data");
	fs.readFile(path.join(__dirname, '../model', 'data.json'),
		function(err,data){
		//上でdate.jsonを読んでstringにした。それにaddするためにjsonオブジェクトにしてる感じか。このfunctionはreadFileの一連で、readFIleのcallbackか。つまりdataには読まれたdataが入ってる。
		var obj = JSON.parse(data);
		//add new wsih. to add data at the last, use length
		console.log("before: "+ obj.wishlist.length);
		obj.wishlist[obj.wishlist.length] = jsonData;
		console.log("after: "+obj.wishlist.length);
		console.log(JSON.stringify(obj));
		//今手持ちのjsonオブジェクトにはaddで来たんだけど、それを外部のファイル（元のdata.json）に書き込むためにオブジェクトをstringにする。
		console.log("a");
		//wirteFileの使い方: http://nodejs.org/docs/latest/api/fs.html#fs_fs_writefile_filename_data_options_callback
		//filenameの指定の仕方を、以下のようにしたらできる。
		fs.writeFile(path.join(__dirname, '../model', 'data.json'),
			JSON.stringify(obj),
			function(err){
				if(err) throw err;
				callback();
			}
		);
		console.log("x");
	});
};
