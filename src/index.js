/*!
 * Pictorical Historical Photo Slides Application
 * Copyright (c) 2010 Patrick Boe
 * Version: 0.1 (09/27/2010)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 */
pictorical= function(){
	var htmlEncode=function(value){ 
	  return $('<div/>').text(value).html(); 
	} 

	var constructArray = function(arr,constructor){
		for (var i in arr) arr[i]=new constructor(arr[i]);
	}
	
	var makeScene=function($map,selectionCallback){
		var map;
		var circle;
		var mapClickListener=null;

		var displayHint=function(hint,isLoading){
			var $hints=$map.find("p.hints");
			$hints.toggleClass('loading',!!isLoading);
			$hints.text(hint);
		};
		
		var updateMapClickBehavior=function(lambda){
			mapClickListener=google.maps.event.addListener(map,"click",lambda);
		};
		
		var distanceInMeters=function(locA,locB){
			return Math.round(locA.distanceTo(locB));
		};
		
		var drawStartingMap=function(){
			var HardenaRestaurant=new google.maps.LatLng(39.928431,-75.171257);
			var startOptions=
							{
								zoom: 15,
								center: HardenaRestaurant,
								mapTypeId: google.maps.MapTypeId.ROADMAP
							}
			var pictoricalTitle=$('header')[0];
			var terms=$('footer').clone()[0];
			map = new google.maps.Map($map[0],startOptions);
			map.controls[google.maps.ControlPosition.TOP].push(pictoricalTitle);
			map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(terms);
		};
		
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
		  	  strokeWeight: 3
		  });
		};
		
		var deleteCircle=function(){
			circle.setMap(null);
			circle=null;
		};
		
		var cancelSelection=function(event){
			deleteCircle();
			google.maps.event.removeListener(mapClickListener);
			acceptSelections();
		};
		
		var acceptSelections=function(){
			updateMapClickBehavior(function(event){
				drawCircleAt(event.latLng);
				google.maps.event.removeListener(mapClickListener);
				displayHint("Move your mouse to size the circle, then click again.");
				acceptResizing();
			});
		};
		
		var onSelectionCallbackDone = function(hasResults){ 
			if(hasResults) {
				displayHint("Click off the circle to cancel.");
			} else {
				displayHint("No results found. Try a bigger circle.");
				cancelSelection();
			}
		};
		
		var acceptResizing=function(){
			var finalizeSelection=function(event){
				google.maps.event.removeListener(mapMoveListener);
				google.maps.event.removeListener(mapClickListener);
				google.maps.event.removeListener(doneOnCircleListener);
				window.location.hash="#map_selection";
				//selectionCallback(circle, onSelectionCallbackDone);
				displayHint("Loading results. Click off the circle to cancel.",true);
				acceptUpdates();
			};
			var doneOnCircleListener=google.maps.event.addListener(circle,"mousedown",finalizeSelection);
			var mapMoveListener=google.maps.event.addListener(map,"mousemove",function(event){
				circle.setRadius(distanceInMeters(circle.getCenter(), event.latLng));
			});
			updateMapClickBehavior(finalizeSelection);
		};
		
		var acceptUpdates=function(){
			var circleListeners=[], enterEvents=["mousedown","mouseover"],leaveEvents=["mouseup","mouseout"];
			var setCircleBehavior=function(eventNames,action){
				for(var i in eventNames){
					circleListeners.push(google.maps.event.addListener(circle,eventNames[i],action));
				}
			};
			var changeCircleDrag=function(nextEvents,nextAction,draggable){
				while(circleListeners.length>0){
					google.maps.event.removeListener(circleListeners.pop());
				}
				setCircleBehavior(nextEvents,nextAction);
				map.setOptions({draggable:!draggable});
			};
			var addDrag=function(){changeCircleDrag(leaveEvents,dropDrag,true);};
			var dropDrag=function(){changeCircleDrag(enterEvents,addDrag,false);};
			setCircleBehavior(enterEvents,addDrag);
			updateMapClickBehavior(function(){
				displayHint("You can choose another circle if you want.");
				cancelSelection();
			});
		};
		
		drawStartingMap();
		acceptSelections();
	}; 

	var slideshow=function($slides,sources){
		var loadSlides=function(photos,onload){
			var adjustImageMap=function(){
				   //set up img map areas for current photo
				   var $this=$(this);
				   var img=$this.find("img.slide")[0];
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
			var loadPhoto=function(photo){
				$slides.append('<li><img class="slide" usemap="#p'+photo.getID()+'" src="'+photo.getUrl()+'"/>'+
				'<map name="p'+photo.getID()+'">'+
				'<area shape="rect" class="prev" coords="0,0,40,40" href="#prev" title="Return to Previous Photo" alt="Previous"/>'+
				'<area shape="rect" class="next" coords="50,0,90,40" href="#next" title="Advance to Next Photo" alt="Next"/>'+
				'</map>'+
				'<a href='+photo.getPage()+'>'+htmlEncode(photo.getTitle())+'</a> by <a href='+photo.getOwnerUrl()+'>'+htmlEncode(photo.getOwnerName())+'</a>'+
				'<label>'+photo.getDate().toLocaleDateString()+'</label>'+
				photo.getLicenseSnippet()+photo.getApiCredit()+
		'</li>');
			};
			if(!photos.length){
				onload(false);
				return;
			}
			$slides.empty();
			//add photos to the DOM
			for(var i in photos){
				loadPhoto(photos[i]);
			}
			//set the images to cycle once the first one loads
			$slides.find("img.slide:first").load(function(){
				onload(true);
				pictorical.showSlides()
				window.location.hash="#slideshow";
				$slides.cycle({
					   timeout: 4000,
					   prev:   '.prev', 
					   next:   '.next',
					   after:	adjustImageMap
				});
			});
		};
		
		return {
			display: function(selectedCircle, onload){
				var requestsMade=0;
				var responsesReceived=0;
				var allPhotos=[];
				var timeoutID;
				var displayAllPhotos=function(){
					allPhotos.sort(function(a,b){
						if(a.getDate() > b.getDate()) return 1;
						return -1;
					});
					loadSlides(allPhotos,onload);
				};
				var makeRequest=function(requestFunction){
					requestsMade++;
					requestFunction(selectedCircle,acceptPhotos);
				};
				var cancelTimeout=function(){
					window.clearTimeout(timeoutID);
					timeoutID=null;
				};
				var acceptPhotos=function(photos){
					responsesReceived++;
					if(!!timeoutID){
						if(selectedCircle.getMap()!==null){
							allPhotos=allPhotos.concat(photos);
							if(responsesReceived===requestsMade){
								cancelTimeout();
								displayAllPhotos();
							}
						} else {
							cancelTimeout();
						}
					}
				}
				for(var i in sources){
					makeRequest(sources[i]);
				}
				timeoutID=window.setTimeout(function(){
					if(selectedCircle.getMap()!==null){
						displayAllPhotos();
					}
					timeoutID=null;
				},5000);
			}
		};
	};
	
	var flickr = function(){
		var parseDate= function (flickrDate){
			var dateOnly=flickrDate.substring(0,flickrDate.indexOf(" "));
			var dateParts=dateOnly.split("-");
			return new Date(Number(dateParts[0]),Number(dateParts[1]),Number(dateParts[2]));
		};
		
		var PhotoFactory= function(licenses){
			return function(rawPhoto){
				var _date=parseDate(rawPhoto.datetaken), that={
					getID: function(){return "flickr"+String(rawPhoto.id);},
					getUrl: function(){return "http://farm"+rawPhoto.farm+".static.flickr.com/"+rawPhoto.server+"/"+rawPhoto.id+"_"+rawPhoto.secret+".jpg";},
					getDate: function(){return _date;},
					getPage: function(){return "http://www.flickr.com/photos/"+rawPhoto.owner+"/"+rawPhoto.id},
					getOwnerUrl: function(){return "http://www.flickr.com/people/" + rawPhoto.owner;},
					getOwnerName: function(){return rawPhoto.ownername;},
					getTitle: function(){return rawPhoto.title},
					getLicenseSnippet: function(){return licenses[rawPhoto.license];},
					getApiCredit: function(){return ""},
					getRaw: function(){return JSON.stringify(rawPhoto);},
				};
				return that;
			}
		};
		
		var makeLicenseSnippet= function(license){
			var snippet="";
			if(license.url.search('creativecommons.org')>=0){
				var type=license.url.match(/\/licenses\/(.*\/)/)[1];
				snippet='<a rel="license" href="'+license.url+'" title="'+license.name+'">'+
					'<img alt="Creative Commons License" src="http://i.creativecommons.org/l/'+type+'80x15.png"/></a>'
			} 
			snippet+='<a rel="license" href="'+license.url+'">'+license.name+'</a>';
			return snippet;
		};
		
		return {
			createSource: function()
			{
				var apiUrl="http://api.flickr.com/services/rest/?jsoncallback=?";
				var apiKey='5c047b2b54845211d9662958d1cc5b9d';
				var licenses=[];
				var licensesLoaded=function(){};
				var photosLoaded=function(photosFoundCallback){
					var processPhotos=function(data){
						var photos=[];
						if(licenses.length){
							if(!!data.photos){
								photos=data.photos.photo;
							}
							constructArray(photos,PhotoFactory(licenses));
							photosFoundCallback(photos)
						} else{
							//we don't have license information yet. set this to run when we do.
							licensesLoaded=function(){
								processPhotos(data);
								licencesLoaded=function(){};
							};
						}
					};
					return processPhotos;
				};
				$.getJSON(apiUrl,
						{
							method: 'flickr.photos.licenses.getInfo',
							format: 'json',
							api_key: apiKey,
						},
						function(data){
							if(!!data.licenses.license){
								licenses=data.licenses.license;
								licenses.sort(function(a,b){
									return a.id>b.id
								});
								for (var i in licenses) licenses[i]=makeLicenseSnippet(licenses[i]);
								licensesLoaded();
							}
						});
				return function(selectedCircle, photosFoundCallback){
					$.getJSON(apiUrl,
						{
								method: 'flickr.photos.search',
								format: 'json',
								api_key: apiKey,
								lat: String(selectedCircle.getCenter().lat()),
								lon: String(selectedCircle.getCenter().lng()),
								radius: String(selectedCircle.getRadius()/1000.0),
								min_upload_date: '2003-12-31 00:00:00',
								license: '1,2,3,4,5,6,7,8',
								sort: 'interestingness-desc',
								extras: 'license,date_taken,owner_name',
								per_page: 30 //flickr's terms of service specifies a max of 30 per page
						},
						photosLoaded(photosFoundCallback)
					);
				};
			}
		};
	}();
	
	var panoramio= function(){
		var Photo=
			function(rawPhoto){
				return {
					getID: function(){return "pano"+String(rawPhoto.photo_id);},
					getUrl: function(){return rawPhoto.photo_file_url;},
					getDate: function(){return new Date(rawPhoto.upload_date);},
					getPage: function(){return rawPhoto.photo_url;},
					getOwnerUrl: function(){return rawPhoto.owner_url;},
					getOwnerName: function(){return rawPhoto.owner_name;},
					getTitle: function(){return rawPhoto.photo_title;},
					getLicenseSnippet: function(){return "";},
					getApiCredit: function(){
						return '<a target="_top" href="http://www.panoramio.com">'+
						'<img width="67" height="14" src="http://www.panoramio.com/img/logo-tos.png">'+
						'</a>'+
						'<span>Photos are copyrighted by their owners</span>';
					},
					getRaw: function(){return JSON.stringify(rawPhoto);}
				};
			};
		return {
			requestPhotos: function(selectedCircle,photosFoundCallback){
				var bounds=selectedCircle.getBounds();
				var ne=bounds.getNorthEast();
				var sw=bounds.getSouthWest();
				/**
				 * Turns out they don't really mean min and max, they mean westernmost & 
				 * easternmost / northernmost & southernmost - tested on the international dateline.
				 * This method still seems to work on the south pole, though I don't think 
				 * I quite comprehend why. Is this wrong, and do you care? If so, let me 
				 * know. -Patrick Boe
				 */
				$.getJSON("http://www.panoramio.com/map/get_panoramas.php?callback=?",
						{
							set:"public",
							from:0,
							to:29,
							minx:sw.lng(),
							miny:sw.lat(),
							maxx:ne.lng(),
							maxy:ne.lat(),
							size:"medium"
						},
						function(data){
							var photos=[];
							if(!!data.count){
								photos=data.photos;
							}
							constructArray(photos,Photo);
							photosFoundCallback(photos);
						});
				}
			};
		}();
	
	return{
		showMap: function(){
			$("#slideshow").hide();
			$("#map").show();
		},
		
		showSlides: function(){
			$("#map").hide();
			$("#slideshow").show();
		},
		
		load: function(){
			var displayAreaPhotos=
				slideshow($('#slideshow ul.slideshow'),
						[flickr.createSource(),panoramio.requestPhotos]).
					display;
			makeScene($('#map'),displayAreaPhotos);
		}
	};
}();

$(window).hashchange(function(){
	if(window.location.hash===""||window.location.hash==="#map_selection") pictorical.showMap();
	else pictorical.showSlides();
});

$(function(){
	if("hash" in window.location && window.location.hash.length){
		window.location="";
	}
	pictorical.load();
});

/** 
 * The following formulas are adapted slightly for google's object model from Chris Veness' code under 
 * the following copyright, license details available at the included url:
 */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Latitude/longitude spherical geodesy formulae & scripts (c) Chris Veness 2002-2010            */
/*   - www.movable-type.co.uk/scripts/latlong.html                                                */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
//extend google's LatLng to include a distance/bearing methods
google.maps.LatLng.prototype.distanceTo=
/**
 * Returns the distance from this point to the supplied point, in meters 
 * (using Haversine formula)
 *
 * from: Haversine formula - R. W. Sinnott, "Virtues of the Haversine",
 *       Sky and Telescope, vol 68, no 2, 1984
 *
 * @param   {google.maps.LatLng} point: Latitude/longitude of destination point
 * @param   {Number} [precision=4]: no of significant digits to use for returned value
 * @returns {Number} Distance in meters between this point and destination point
 */
function(point, precision) {
  // default 4 sig fig reflects typical 0.3% accuracy of spherical model
  if (typeof precision === 'undefined') precision = 4;  
  
  var R = 6371;
  var lat1 = this.lat().toRad(), lon1 = this.lng().toRad();
  var lat2 = point.lat().toRad(), lon2 = point.lng().toRad();
  var dLat = lat2 - lat1;
  var dLon = lon2 - lon1;

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1) * Math.cos(lat2) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c * 1000;
  return d.toFixed(precision);
}

/**
 * Returns the (initial) bearing from this point to the supplied point, in degrees
 *   see http://williams.best.vwh.net/avform.htm#Crs
 *
 * @param   {LatLon} point: Latitude/longitude of destination point
 * @returns {Number} Initial bearing in degrees from North
 */
google.maps.LatLng.prototype.bearingTo = function(point) {
  var lat1 = this._lat.toRad(), lat2 = point._lat.toRad();
  var dLon = (point._lon-this._lon).toRad();

  var y = Math.sin(dLon) * Math.cos(lat2);
  var x = Math.cos(lat1)*Math.sin(lat2) -
          Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
  var brng = Math.atan2(y, x);
  
  return (brng.toDeg()+360) % 360;
}

/**
 * Returns the destination point from this point having travelled the given distance (in km) on the 
 * given initial bearing (bearing may vary before destination is reached)
 *
 *   see http://williams.best.vwh.net/avform.htm#LL
 *
 * @param   {Number} brng: Initial bearing in degrees
 * @param   {Number} dist: Distance in km
 * @returns {LatLon} Destination point
 */
google.maps.LatLng.prototype.destinationPoint = function(brng, dist) {
  dist = dist/this._radius;  // convert dist to angular distance in radians
  brng = brng.toRad();  // 
  var lat1 = this._lat.toRad(), lon1 = this._lon.toRad();

  var lat2 = Math.asin( Math.sin(lat1)*Math.cos(dist) + 
                        Math.cos(lat1)*Math.sin(dist)*Math.cos(brng) );
  var lon2 = lon1 + Math.atan2(Math.sin(brng)*Math.sin(dist)*Math.cos(lat1), 
                               Math.cos(dist)-Math.sin(lat1)*Math.sin(lat2));
  lon2 = (lon2+3*Math.PI)%(2*Math.PI) - Math.PI;  // normalise to -180...+180

  if (isNaN(lat2) || isNaN(lon2)) return null;
  return new google.maps.LatLng(lat2.toDeg(), lon2.toDeg());
}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

//extend Number object with methods for converting degrees/radians

/** Convert numeric degrees to radians */
if (typeof(Number.prototype.toRad) === "undefined") {
	Number.prototype.toRad = function() {
	 return this * Math.PI / 180;
	}
}

/** Convert radians to numeric (signed) degrees */
if (typeof(Number.prototype.toDeg) === "undefined") {
	Number.prototype.toDeg = function() {
	 return this * 180 / Math.PI;
	}
}

