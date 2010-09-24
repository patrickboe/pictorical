//extend google's LatLng to include a distance finding method
google.maps.LatLng.prototype.distanceTo=
// This distance formula is adapted slightly for google's object model from Chris Veness' code under the following copyright:
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Latitude/longitude spherical geodesy formulae & scripts (c) Chris Veness 2002-2010            */
/*   - www.movable-type.co.uk/scripts/latlong.html                                                */
/*                                                                                                */
/*  Sample usage:                                                                                 */
/*    var p1 = new LatLon(51.5136, -0.0983);                                                      */
/*    var p2 = new LatLon(51.4778, -0.0015);                                                      */
/*    var dist = p1.distanceTo(p2);          // in km                                             */
/*    var brng = p1.bearingTo(p2);           // in degrees clockwise from north                   */
/*    ... etc                                                                                     */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/**
 * Returns the distance from this point to the supplied point, in meters 
 * (using Haversine formula)
 *
 * from: Haversine formula - R. W. Sinnott, "Virtues of the Haversine",
 *       Sky and Telescope, vol 68, no 2, 1984
 *
 * @param   {LatLon} point: Latitude/longitude of destination point
 * @param   {Number} [precision=4]: no of significant digits to use for returned value
 * @returns {Number} Distance in meters between this point and destination point
 */
function(point, precision) {
  // default 4 sig fig reflects typical 0.3% accuracy of spherical model
  if (typeof precision == 'undefined') precision = 4;  
  
  var R = 6371;
  var toRadians=function(deg){return Math.PI*deg/180};
  var lat1 = toRadians(this.lat()), lon1 = toRadians(this.lng());
  var lat2 = toRadians(point.lat()), lon2 = toRadians(point.lng());
  var dLat = lat2 - lat1;
  var dLon = lon2 - lon1;

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1) * Math.cos(lat2) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c * 1000;
  return d.toFixed(precision);
}

pictorical={
		loadMap: function(selectionCallback) {
			var map;
			var circle;
			var mapClickListener=null;
			var updateMapClickBehavior=function(lambda){
				mapClickListener=google.maps.event.addListener(map,"click",lambda);
			}
			var findDistance=function(locA,locB){
				return Math.round(locA.distanceTo(locB));
			};
			var drawStartingMap=function(){
				var HardenaRestaurant=new google.maps.LatLng(39.928431,-75.171257);
				var startOptions=
								{
									zoom: 12,
									center: HardenaRestaurant,
									mapTypeId: google.maps.MapTypeId.ROADMAP
								}
				return new google.maps.Map($("#map_canvas")[0],startOptions);
			}
			var drawCircleAt=function(location) {
			  var clickedLocation = new google.maps.LatLng(location);
			  circle = new google.maps.Circle({
				  center: location, 
				  map: map,
				  radius: 50,
				  fillColor: "#FF0000",
			  	  fillOpacity: 0.3,
			  	  strokeColor: "#FF0000",
			  	  strokeOpacity: 0.8,
			  	  strokeWeight: 1
			  });
			};
			var deleteCircle=function(){
				circle.setMap(null);
				circle=null;
			};
			var acceptSelections=function(){
				updateMapClickBehavior(function(event){
					drawCircleAt(event.latLng);
					google.maps.event.removeListener(mapClickListener);
					acceptChanges();
				});
			};
			var acceptChanges=function(){
				var finalizeSelection=function(event){
					google.maps.event.removeListener(mapMoveListener);
					google.maps.event.removeListener(mapClickListener);
					google.maps.event.removeListener(doneOnCircleListener);
					selectionCallback(circle);
					map.setCenter(circle.getCenter());
					map.fitBounds(circle.getBounds());
					acceptCancellations();
				};
				var doneOnCircleListener=google.maps.event.addListener(circle,"mousedown",finalizeSelection);
				var mapMoveListener=google.maps.event.addListener(map,"mousemove",function(event){
					circle.setRadius(findDistance(circle.getCenter(), event.latLng));
				});
				updateMapClickBehavior(finalizeSelection);
			};
			var acceptCancellations=function(){
				var cancelSelection=function(event){
					deleteCircle();
					google.maps.event.removeListener(mapClickListener);
					acceptSelections();
				};
				updateMapClickBehavior(cancelSelection);
			};
			
			map=drawStartingMap();
			acceptSelections();
		},
		
		displayAreaPhotos: function(selectedCircle){
			var acceptPhotos=function(photos){
				if(selectedCircle.getMap()!=null){
					photos.sort(function(a,b){
						if(a.getDate() > b.getDate()) return 1;
						return -1;
					});
					pictorical.showSlides(photos);
				}
			}
			pictorical.requestFlickrPhotos(selectedCircle,acceptPhotos);
		},
		
		requestFlickrPhotos: function(selectedCircle, photosFoundCallback){
			var yqlQuery="select * from flickr.photos.search(0,5)" +
			" where lat="+ String(selectedCircle.getCenter().lat()) +
			" and lon="+ String(selectedCircle.getCenter().lng()) +
			" and radius="+ String(selectedCircle.getRadius()/1000.0) +
			" and min_upload_date='2003-12-31 00:00:00' and license='1,2,3,4,5,6'" +
			" and sort='interestingness-desc' and media='photos' and" +
			" extras='license,date_taken,owner_name'";
			$.getJSON("http://query.yahooapis.com/v1/public/yql?callback=?",
				{
						q: yqlQuery,
						format: "json"
				},
				function(data){
					var photos=[];
					if(!!data.query.results){
						if(data.query.count==1){
							//make the result an array
							photos.push(data.query.results.photo);
						} else {
							//it's already an array
							photos=data.query.results.photo;
						}
					}
					transformArray(photos,function(photo){return new pictorical.flickrPhoto(photo)})
					photosFoundCallback(photos)
				}
			);
		},
		
		showSlides: function(photos){
			var adjustImageMap=function(){
				   //set up img map areas for current photo
				   var $this=$(this);
				   var img=$this.find("img")[0];
				   var areaW=Math.round(img.clientWidth/2)-5
				   var prevRightEdge=String(areaW);
				   var nextLeftEdge=String(areaW+10);
				   var w=String(img.clientWidth);
				   var h=String(img.clientHeight);
				   $this
				   	.find("area.prev")
				   		.attr("coords","0,0,"+prevRightEdge+","+h)
				   	.end()
				   	.find("area.next")
			   			.attr("coords", nextLeftEdge+",0,"+w+","+h)
			   };
			var $photoList=$("#slideshow ul");
			var loadPhoto=function(photo){
				$photoList.append('<li><label>'+String(photo.getDate())+'</label>'+
				'<img usemap="#p'+photo.getID()+'" src="'+photo.getUrl()+'"/>'+
				'<map name="p'+photo.getID()+'">'+
				'<area shape="rect" class="prev" coords="0,0,40,40" href="#prev" title="Return to Previous Photo" alt="Previous"/>'+
				'<area shape="rect" class="next" coords="50,0,90,40" href="#next" title="Advance to Next Photo" alt="Next"/>'+
				'</map></li>');
			};
			//add photos to the DOM
			for(var i in photos){
				loadPhoto(photos[i]);
			}
			//set the images to cycle once the first one loads
			$("#slideshow img:first").load(function(){
				$("#map_canvas").hide();
				$("#slideshow").show()
					.find("ul.slideshow")
						.cycle({
						   timeout: 0,
						   prev:   '.prev', 
						   next:   '.next',
						   after:	adjustImageMap
						});
			});
		},
		
		showMap: function(){
			$("#slideshow").hide().find("ul.slideshow").empty();
			$("#map_canvas").show();
		},
		
		flickrPhoto: function(rawPhoto){
			this.getID=function(){return "flickr"+String(rawPhoto.id)}
			this.getUrl=function(){return "http://farm"+rawPhoto.farm+".static.flickr.com/"+rawPhoto.server+"/"+rawPhoto.id+"_"+rawPhoto.secret+".jpg";};
			this.getDate=function(){return rawPhoto.datetaken};
		}
}

transformArray=function(arr,lambda){
	for (var i in arr){
		arr[i]=lambda(arr[i]);
	}
}

$(function(){
	$("a.back").click(function(){
		pictorical.showMap();
		return false;
	});
	pictorical.loadMap(pictorical.displayAreaPhotos);
});