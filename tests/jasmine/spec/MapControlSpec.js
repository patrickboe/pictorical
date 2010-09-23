setFixtures('<div id="map_canvas"></div>');

describe("MapControl", function() {
	var circle=null;
	var selectCircle=function(){
		circle=1;
	};
	var map=initMap(selectCircle);
	
	var expectEmptinessBehavior=function(){
		it("should have no circle", function(){
			expect(circle).toBeNull();
		});
		
		it("should create a circle at a click location", function(){
			
		});
	};
	
	describe("initial screen", function(){
		it("should show a street map centered at Hardena Restaurant (39.928431,-75.171257) in Philadelphia, fully zoomed out", function(){
			expect(map.getZoom()).toEqual(1);
			expect(map.getCenter().lat()).toEqual(39.928431);
			expect(map.getCenter().lon()).toEqual(-75.171257);
			expect(map.getMapTypeId()).toEqual("ROADMAP");
		});
		expectEmptinessBehavior();
	});
	
	describe("map with a circle", function(){
		
		it("should change circle radius to follow mouse", function(){});
		
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