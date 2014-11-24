$('document').ready(function(){
	var optionlist = document.getElementById('search-option');
	optionlist.addEventListener("change", function(){
		var option = optionlist.options[optionlist.selectedIndex].value;
		if(option == "friend"){
			//add eventListener to search box
			console.log("friend filter!");
			var search = document.getElementById('search-box-material');
			search.addEventListener('keypress', function(search){
				var input = document.getElementById('search-box-material').value;
				console.log(input);
				var alpha = 'abcdefghijklnmopqrstuvwxyz';
				var valid = false;
				var errMsg;
				for(var i=0; i<input.length; i++){
					var c = input[i];
					for(var k=0; k<alpha.length; k++){
						if(c==alpha[k]) valid = true;
					}
					if(!valid){
						errMsg = document.createTextNode("input error!");
				 	    document.getElementById('header-search').appendChild(errMsg);
					}
				}
			});		
		}
	});

});
/*
function checkinput(){
	var x = document.getElementById("search-box-material").value;
	if(x.search(/\W/)){
		console.log("invalid input");
		x.replace(/\W/,"");
	}else{
		console.log("input ok");
	}
}*/
