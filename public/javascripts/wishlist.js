function addWish(){
	var wishElement = this;
	var addReq = new XMLHttpRequest();

	console.log(this.className);
	var name = " ";
	var lat = " ";
	var lng = " ";
	var img = this.parentNode.parentNode.getElementsByClassName("listing-img");
	var img_src = img[0].src;
	var prof_img = " ";
	console.log(img_src);
	
	var wishData = {"name":name, "lat":lat, "lng":lng, "panel-img":img_src, "prof-img":prof_img, "pin-icon":""};

	var postURL = "http://localhost:3000/addWish";
	addReq.open("POST", postURL, true);
	addReq.setRequestHeader('Content-Type','application/json');
	addReq.send(JSON.stringify(wishData));//json string is used to send.
}
var pin = document.getElementsByClassName("listing-pin");
var i;
for(i=0; i<pin.length; i++){
	pin[i].addEventListener("click", addWish);//not adWish(),but addWish!!!
	console.log("add");
}

