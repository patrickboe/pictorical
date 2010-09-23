setFixtures('<div id="map_canvas"></div>');

describe("MapControl", function() {
	var setup=function(){
		var HardenaRestaurant = new google.maps.LatLng(39.928431,-75.171257);
		var myOptions = {
		  zoom: 8,
		  center: HardenaRestaurant,
		  mapTypeId: google.maps.MapTypeId.ROADMAP
		};
		var map = new google.maps.Map(document.getElementById("map_canvas"),myOptions);
	};
	
	it("should start empty", function(){});
	
	describe("when empty", function(){
		it("should have no circle", function(){});
		
		it("should create a circle at a click location", function(){});
	});
	
	describe("map with a circle", function(){
		
		it("should change circle size to follow mouse", function(){});
		
		it("should display the chosen circle after a second click", function(){});
		
		describe("chosen circle", function(){
			it("should not change circle size to follow mouse", function(){});
			
			it("should display a close button", function(){});
			
			it("should call this control's callback when chosen", function(){});
		
			it("should empty the map when the user clicks the X", function(){});
		
		});
	});
});

describe("distance measurement", function(){
	it("should say that the distance from Philadelphia to Sea Isle City is about 100km", function(){
		var Philadelphia=new google.maps.LatLng(39.952346,-75.163785);
		var SeaIsleCity=new google.maps.LatLng(39.153455,-74.692934);
	});
	
	it("should say that the distance from B2 to POPE is about 0.05km", function(){
		var B2=new google.maps.LatLng(39.930826,-75.162503);
		var POPE=new google.maps.LatLng(39.930801,-75.162095);
	});
})