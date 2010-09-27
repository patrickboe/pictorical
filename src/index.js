/*!
 * Pictorical Historical Photo Slides Application
 * Copyright (c) 2010 Patrick Boe
 * Version: 0.1 (09/27/2010)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 */

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
									zoom: 3,
									center: HardenaRestaurant,
									mapTypeId: google.maps.MapTypeId.ROADMAP
								}
				var map = new google.maps.Map($("#map")[0],startOptions);
				var pictoricalTitle=$('<div class="legend"><h1>Pictorical</h1> <p>Browse the map, then click to choose a slideshow area.</p></div>')[0];
				var terms=$($.trim($('footer').html()))[0];
				map.controls[google.maps.ControlPosition.TOP].push(pictoricalTitle);
				map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(terms);
				return map;
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
			  	  strokeWeight: 3
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
					window.location.hash="#map_selection";
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
		
		createPhotoDisplay: function(sources){
			return function(selectedCircle){
				var requestsMade=0;
				var responsesReceived=0;
				var allPhotos=[];
				var timeoutID;
				var displayAllPhotos=function(){
					allPhotos.sort(function(a,b){
						if(a.getDate() > b.getDate()) return 1;
						return -1;
					});
					pictorical.loadSlides(allPhotos);
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
						if(selectedCircle.getMap()!=null){
							allPhotos=allPhotos.concat(photos);
							if(responsesReceived==requestsMade){
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
					if(selectedCircle.getMap()!=null){
						displayAllPhotos();
					}
					timeoutID=null;
				},5000);
			};
		},
		
		flickr : {
			parseDate: function (flickrDate){
				var dateOnly=flickrDate.substring(0,flickrDate.indexOf(" "));
				var dateParts=dateOnly.split("-");
				return new Date(Number(dateParts[0]),Number(dateParts[1]),Number(dateParts[2]));
			},
			
			PhotoFactory: function(licenses){
				return function(rawPhoto){
					var _date=pictorical.flickr.parseDate(rawPhoto.datetaken);
					this.getID=function(){return "flickr"+String(rawPhoto.id);};
					this.getUrl=function(){return "http://farm"+rawPhoto.farm+".static.flickr.com/"+rawPhoto.server+"/"+rawPhoto.id+"_"+rawPhoto.secret+".jpg";};
					this.getDate=function(){return _date;};
					this.getPage=function(){return "http://www.flickr.com/photos/"+rawPhoto.owner+"/"+rawPhoto.id};
					this.getOwnerUrl=function(){return "http://www.flickr.com/people/" + rawPhoto.owner;};
					this.getOwnerName=function(){return rawPhoto.ownername;};
					this.getTitle=function(){return rawPhoto.title};
					this.getLicenseSnippet=function(){return licenses[rawPhoto.license];};
					this.getApiCredit=function(){return ""};
					this.getRaw=function(){return JSON.stringify(rawPhoto);};
				}
			},
			makeLicenseSnippet: function(license){
				var snippet="";
				if(license.url.search('creativecommons.org')>=0){
					var type=license.url.match(/\/licenses\/(.*\/)/)[1];
					snippet='<a rel="license" href="'+license.url+'" title="'+license.name+'">'+
						'<img alt="Creative Commons License" src="http://i.creativecommons.org/l/'+type+'80x15.png"/></a>'
				} 
				snippet+='<a rel="license" href="'+license.url+'">'+license.name+'</a>';
				return snippet;
			},
			
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
							constructArray(photos,pictorical.flickr.PhotoFactory(licenses));
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
								for (var i in licenses) licenses[i]=pictorical.flickr.makeLicenseSnippet(licenses[i]);
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
		},
		
		panoramio:{
			
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
							constructArray(photos,pictorical.panoramio.Photo);
							photosFoundCallback(photos);
						}
					);
			},
			
			Photo:
				function(rawPhoto){
					this.getID=function(){return "pano"+String(rawPhoto.photo_id);}
					this.getUrl=function(){return rawPhoto.photo_file_url;};
					this.getDate=function(){return new Date(rawPhoto.upload_date);};
					this.getPage=function(){return rawPhoto.photo_url;};
					this.getOwnerUrl=function(){return rawPhoto.owner_url;};
					this.getOwnerName=function(){return rawPhoto.owner_name;};
					this.getTitle=function(){return rawPhoto.photo_title;};
					this.getLicenseSnippet=function(){return "";};
					this.getApiCredit=function(){
						return '<a target="_top" href="http://www.panoramio.com">'+
						'<img width="67" height="14" src="http://www.panoramio.com/img/logo-tos.png">'+
						'</a>'+
						'<span>Photos are copyrighted by their owners</span>';
					};
					this.getRaw=function(){return JSON.stringify(rawPhoto);};
				}
		},
		
		
		
		loadSlides: function(photos){
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
			var $photoList=$("#slideshow ul");
			var loadPhoto=function(photo){
				$photoList.append('<li><img class="slide" usemap="#p'+photo.getID()+'" src="'+photo.getUrl()+'"/>'+
				'<map name="p'+photo.getID()+'">'+
				'<area shape="rect" class="prev" coords="0,0,40,40" href="#prev" title="Return to Previous Photo" alt="Previous"/>'+
				'<area shape="rect" class="next" coords="50,0,90,40" href="#next" title="Advance to Next Photo" alt="Next"/>'+
				'</map>'+
				'<a href='+photo.getPage()+'>'+htmlEncode(photo.getTitle())+'</a> by <a href='+photo.getOwnerUrl()+'>'+htmlEncode(photo.getOwnerName())+'</a>'+
				'<label>'+photo.getDate().toLocaleDateString()+'</label>'+
				photo.getLicenseSnippet()+photo.getApiCredit()+
		'</li>');
			};
			$("#slideshow ul.slideshow").empty();
			//add photos to the DOM
			for(var i in photos){
				loadPhoto(photos[i]);
			}
			//set the images to cycle once the first one loads
			$("#slideshow img.slide:first").load(function(){
				$("#map").hide();
				$("#slideshow").show()
					.find("ul.slideshow")
						.cycle({
						   timeout: 4000,
						   prev:   '.prev', 
						   next:   '.next',
						   after:	adjustImageMap
						});
				window.location.hash="#slideshow";
			});
		},
		
		showMap: function(){
			$("#slideshow").hide();
			$("#map").show();
		},
		
		showSlides: function(){
			$("#map").hide();
			$("#slideshow").show();
		}
}

function htmlEncode(value){ 
  return $('<div/>').text(value).html(); 
} 

function constructArray(arr,constructor){
	for (var i in arr) arr[i]=new constructor(arr[i]);
}

$(window).hashchange(function(){
	if(window.location.hash==""||window.location.hash=="#map_selection") pictorical.showMap();
	else pictorical.showSlides();
});

$(function(){
	if("hash" in window.location && window.location.hash.length){
		window.location="";
	}
	var displayAreaPhotos=pictorical.createPhotoDisplay([pictorical.flickr.createSource(),pictorical.panoramio.requestPhotos]);
	pictorical.loadMap(displayAreaPhotos);
});

//extend google's LatLng to include a distance finding method
google.maps.LatLng.prototype.distanceTo=
/** 
 * This distance formula is adapted slightly for google's object model from Chris Veness' code under 
 * the following copyright, license details available at the included url:
 */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Latitude/longitude spherical geodesy formulae & scripts (c) Chris Veness 2002-2010            */
/*   - www.movable-type.co.uk/scripts/latlong.html                                                */
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