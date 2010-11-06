/*!
 * Pictorical Historical Photo Slides Application
 * Copyright (c) 2010 Patrick Boe
 * Version: $CONF_version ($CONF_version_date)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 */
pictorical= function(){
	var noop=function(){},
	
	htmlEncode=function(value){ 
	  return $('<div/>').text(value).html(); 
	},

	constructArray = function(arr,constructor){
		for (var i=0; i<arr.length; i++) {
			arr[i]=new constructor(arr[i]);
		}
	},
	
	trace=function(s) {
	    try { console.log(s); } catch (e) { alert(s); }
	},
	
	makeScene=function($map,circle,onSelection,onSelectionLoaded){ //returns a function to be called on show
		var map;
		var mapClickListener;
		var selectionHandle;
		var preloaded;
		var geocoder;
		
		var displayHint=function(hint,isLoading){
			$map.find("p.hints")[isLoading?"addClass":"removeClass"]('loading')
				.text(hint);
		};
		
		var unlisten=function(listener){
		  if(listener){
		     google.maps.event.removeListener(listener);
		  }
		};
		
		var updateMapClickBehavior=function(lambda,repeat){
			/*
			 * can't just start accepting clicks right now because IE8 doesn't like event 
			 * listeners that spawn listeners for the same event, in this case map click - it
			 * just goes ahead and executes the handler right away, instead of waiting for 
			 * the event to happen again. so, we'll set the click event handler after a 
			 * brief timeout.
			 */
			var listenAdder = repeat ? google.maps.event.addListener : google.maps.event.addListenerOnce;
			return window.setTimeout(function(){
				mapClickListener=listenAdder(map,"click",lambda);
			},100);
		};
		
		var cancelMapClickBehavior=function(handle){
			window.clearTimeout(handle);
			unlisten(mapClickListener);
		};
		
		var distanceInMeters=function(locA,locB){
			return Math.round(locA.distanceTo(locB));
		};
		
		var drawStartingMap=function(){
			var tryToGeolocate=function(){
				/*
				 * this function is lightly adapted from google's maps api example code at 
				 * http://code.google.com/apis/maps/documentation/javascript/basics.html#Geolocation
				 */
				// Try W3C Geolocation (Preferred)
				var onFound=function(position){
					map.setCenter(new google.maps.LatLng(position.latitude,position.longitude));
				};
				if(navigator.geolocation) {
					navigator.geolocation.getCurrentPosition(function(position) { onFound(position.coords); }, noop);
				// Try Google Gears Geolocation
				} else if (google.gears) {
					var geo = google.gears.factory.create('beta.geolocation');
					geo.getCurrentPosition(onFound,noop);
				}
			},
			isSmall=$(window).width()<900,
			hardenaRestaurant=new google.maps.LatLng(39.928431,-75.171257),
			geocoder=new google.maps.Geocoder(),
			startOptions=
							{
								zoom: 13,
								center: hardenaRestaurant,
								streetViewControl: false,
								mapTypeControl: false,
								mapTypeId: google.maps.MapTypeId.ROADMAP
							},
			pictoricalTitle=$map.find('header')[0],
			searchnav=$map.find('nav')
				.find('input').autocomplete({
					select: function(event,ui){
						var place=ui.item.value;
						this.value=ui.item.label;
						map.setCenter(place.location);
						if(place.bounds){
							map.fitBounds(place.bounds);
						}
						cancelSelection();
						$(event.target).val("").blur();
						return false; //don't populate search box with value
					},
					focus: function(event,ui){
						this.value=ui.item.label;
						return false; //don't populate search box with value
					},
					source: function(request, response) {
						var adaptGeocoderResult=function(gcresult){
							return {
								label: gcresult.formatted_address,
								value: gcresult.geometry
							};
						};
						var adaptGoogleResponse=function(gcresults,gcstatus){
							var i;
							if(gcstatus===google.maps.GeocoderStatus.OK){
								for(i=0; i<gcresults.length; i++){
									gcresults[i]=adaptGeocoderResult(gcresults[i]);
								}
								response(gcresults);
							} else {
								response([]);
							}
						};
						geocoder.geocode({address:request.term},adaptGoogleResponse);
					}
				})
				.end()[0],
			terms=$map.find('footer')[0];
			map = new google.maps.Map($map[0],startOptions);
			tryToGeolocate();
			map.controls[google.maps.ControlPosition[isSmall?"TOP_LEFT":"TOP"]].push(pictoricalTitle);
			map.controls[google.maps.ControlPosition.TOP_RIGHT].push(searchnav);
			map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(terms);
			google.maps.event.addListener(map,"click",function(){
				$map.find('nav input').autocomplete('close');
			});
		};
		
		var drawCircleAt=function(location,radius) {
		  var clickedLocation = new google.maps.LatLng(location);
		  if(typeof radius === 'undefined'){
			  radius=1;
		  }
		  circle = new google.maps.Circle({
			  center: location, 
			  map: map,
			  radius: radius,
			  fillColor: "#FF0000",
			  fillOpacity: 0.3,
			  strokeColor: "#FF0000",
			  strokeOpacity: 0.8,
			  strokeWeight: 3
		  });
		};
		
		var cancelSelectionCallback=function(){
			if(selectionHandle){
				selectionHandle.cancel();
				selectionHandle=null;
			}
		};
		
		var clearMap=function(){
			if(circle){
				circle.setMap(null);
				circle=null;
			}
		};
		
		var cancelSelection=function(event){
			cancelSelectionCallback();
			clearMap();
			unlisten(mapClickListener);
			acceptSelections();
		};
		
		var acceptSelections=function(){
			updateMapClickBehavior(function(event){
				drawCircleAt(event.latLng);
				displayHint("Move to resize, then click again.");
				acceptResizing();
			});
		};
		
		var myOnSelectionLoaded=function(selection, hasResults){
			var res=onSelectionLoaded.apply(null,arguments);
			if(res) {
				displayHint("Click off the circle to cancel.");
			} else {
				displayHint("No results found. Try a bigger circle.");
				cancelSelection();
			}
			selectionHandle=null;
			return res;
		};
		
		var acceptResizing=function(){
			var finalizeSelection=function(event){
				unlisten(moveListener);
				unlisten(downListener);
				cancelMapClickBehavior(mapClickHandle);
				unlisten(circleListener);
				selectionMade();
				acceptUpdates();
			};
			var resize=function(event){ 
				circle.setRadius(distanceInMeters(circle.getCenter(), event.latLng)); 
			};
			var downListener=null;
			var circleListener=google.maps.event.addListenerOnce(circle,'click',finalizeSelection);
			var moveListener=google.maps.event.addListenerOnce(map,"mousemove",function(event){
				//we know user can move mouse to resize, so we can allow them to click anywhere to finalize
				unlisten(circleListener);
				cancelMapClickBehavior(mapClickHandle);
				//finalize selection when mousedown
				downListener=google.maps.event.addDomListenerOnce(document,'mousedown',finalizeSelection);
				resize(event);
				moveListener=google.maps.event.addListener(map,"mousemove",resize);
			});
			var mapClickHandle=updateMapClickBehavior(resize,true);
		};
		
		var selectionMade=function(){
			selectionHandle=onSelection(circle, myOnSelectionLoaded);
			displayHint("Loading results. Click off the circle to cancel.",true);
		};
		
		var acceptUpdates=function(){
			var 
			circleFocusListeners=[], 
			moveListener=null,
			
			addCircleBehavior=function(eventNames,action){
				for(var i=0;i<eventNames.length;i++){
					circleFocusListeners.push(google.maps.event.addListenerOnce(circle,eventNames[i],action));
				}
			},
			
			dropCircleBehavior=function(){
				while(circleFocusListeners.length>0){
				  unlisten(circleFocusListeners.pop());
				}
			},
			
			replaceCircleBehavior=function(nextEvents,nextAction){
				dropCircleBehavior();
				addCircleBehavior(nextEvents,nextAction);
			},
			
			endDrag=function(event){
				unlisten(moveListener);
				moveListener=null;
				selectionMade();
				map.setOptions({draggable:true});
				replaceCircleBehavior(["mousedown"],startDrag);
			}, 
			
			startDrag=function(event){ 
				map.setOptions({draggable:false});
				cancelSelectionCallback();
				moveListener=google.maps.event.addListener(map,"mousemove",followMouse);
				replaceCircleBehavior(["mouseup","click","mouseover"],endDrag); //mouseup isn't raised at the expected time on all browsers. click and mouseover are fallbacks.
				displayHint("You can move the circle.");
			},
			
			followMouse=function(event){
				circle.setCenter(event.latLng);
			};

			addCircleBehavior(["mousedown"],startDrag);
			
			updateMapClickBehavior(function(){
				displayHint("You can choose another circle.");
				dropCircleBehavior();
				cancelSelection();
			});
		},
		
		goToCircle=function(){
			map.setCenter(circle.getCenter());
			map.fitBounds(circle.getBounds());
		},
		
		loadSelection=function(selection){
			drawCircleAt(selection.getCenter(),selection.getRadius());
			acceptUpdates();
			preloaded=true;
		};
		
		drawStartingMap();
		if(!circle){
			acceptSelections();
		} else {
			loadSelection(circle);
		}
		return { 
			redraw: function(){
				google.maps.event.trigger(map, 'resize');
				if(preloaded){
					goToCircle();
					preloaded=false;
				}
			},
			
			select: function(selection){
				clearMap();
				loadSelection(selection);
			}
		};
	},
	
	slideshow=function($container,sources){
		var $slides=$container.find('ul.slideshow'),
		loadSlides=function(photos,onload){
			var adjustImageMap=function(){
				   //set up img map areas for current photo
				   var $this=$(this),
				   img=$this.find("img.slide")[0],
				   areaW=Math.round(img.clientWidth/2)-5,
					prevRightEdge=String(areaW),
				   nextLeftEdge=String(areaW+10),
				   w=String(img.clientWidth),
				   h=String(img.clientHeight),
				   prevRect="0,0,"+prevRightEdge+","+h,
				   nextRect=nextLeftEdge+",0,"+w+","+h;
				   if(img.clientWidth){
					   $this
					   .find("area.prev").attr("coords",prevRect)
					   .end()
					   .find("area.next").attr("coords",nextRect);
				   }
			   };
				
			var sizeSlideshow=function(){
				var $ul=$container.find('ul.slideshow:visible');
				var availHeight=String(Math.floor($('body').height()-$ul.offset().top*2)) + "px";
				$ul.css("height",availHeight);
				$ul.find("li:visible").each(adjustImageMap);
			};
			
			var loadPhoto=function(photo, seq, of){
				$slides.append('<li><img class="slide" usemap="#p'+photo.getID()+'" src="'+photo.getUrl()+'"/>'+
				'<map name="p'+photo.getID()+'">'+
				'<area shape="rect" class="prev" coords="0,0,40,40" href="#prev" title="Return to Previous Photo" alt="Previous"/>'+
				'<area shape="rect" class="next" coords="50,0,90,40" href="#next" title="Advance to Next Photo" alt="Next"/>'+
				'</map>'+
				'<footer><label>'+seq+' of '+of+'</label><a href='+photo.getPage()+'>'+htmlEncode(photo.getTitle())+'</a> by <a href='+
				photo.getOwnerUrl()+'>'+htmlEncode(photo.getOwnerName())+'</a>'+
				'<label>'+photo.getDate().toLocaleDateString()+'</label>'+
				photo.getLicenseSnippet()+photo.getApiCredit()+'</footer>'+
		'</li>');
			};
			if(!photos.length){
				onload(false);
				return;
			}
			$slides.cycle('destroy').empty();
			//add photos to the DOM
			for(var i=0;i<photos.length;i++){
				loadPhoto(photos[i],i+1,photos.length);
			}
			//set the images to cycle once the first one loads
			$slides.find("img.slide:first").load(function(){
				if (onload(true)){ 
					start();
					$slides.cycle({
						   timeout: 4000,
						   prev:   '.prev', 
						   next:   '.next',
						   after:	adjustImageMap,
						   requeueOnImageNotLoaded: false
					});
					sizeSlideshow();
					$(window)
						.unbind('resize',sizeSlideshow) //make sure we don't bind this multiple times
						.resize(sizeSlideshow);
				}
			});
		},
		
		start=function(){
			var ix=null, 
			states=[{name: 'resume', title:'Resume'},
			        {name: 'pause', title: 'Pause'}],
			$pause=$container.find('.pause'),
			advance=function(){
				var next=(ix+1)%2;
				$slides.cycle(states[ix].name);
				$pause.text(states[next].title);
				ix=next;
				return false;
			};
			$pause.unbind('click').click(advance);
			return function(){ix=0; advance();};
		}();
		
		return {
			display: function(selectedCircle, onload){
				var requestsMade=0;
				var responsesReceived=0;
				var allPhotos=[];
				var timeoutID;
				var cancelled=false;
				
				var displayAllPhotos=function(){
					allPhotos.sort(function(a,b){
						if(a.getDate() > b.getDate()) {return 1;}
						return -1;
					});
					loadSlides(allPhotos,function(hasPhotos){
						if(!cancelled){
							return onload(selectedCircle, hasPhotos);
						} else {
							return false;
						}
					});
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
					if(timeoutID){
						allPhotos=allPhotos.concat(photos);
						if(responsesReceived===requestsMade){
							cancelTimeout();
							displayAllPhotos();
						}
					}
				};
				for(var i=0;i<sources.length;i++){
					makeRequest(sources[i]);
				}
				timeoutID=window.setTimeout(function(){
					displayAllPhotos();
					timeoutID=null;
				},5000);
				return {
					cancel: function(){
						cancelTimeout();
						cancelled=true;
					}
				};
			}
		};
	},
	
	flickr = function(){
		var flickrBlacklist={},
		
		blacklistLoaded=false,
		blacklistLoadHandlers=[
			function(blacklist){
				for (var i=0;i<blacklist.length;i++){
					flickrBlacklist[blacklist[i]]=1;
				}
				blacklistLoaded=true;
			}
		],
		
		onBlacklistLoaded=function(data){
			for(var i=blacklistLoadHandlers.length-1;i>=0;i--){
				blacklistLoadHandlers[i](data);
			}
		},
		
		parseDate= function (flickrDate){
			var dateOnly=flickrDate.substring(0,flickrDate.indexOf(" "));
			var dateParts=dateOnly.split("-");
			return new Date(Number(dateParts[0]),Number(dateParts[1]),Number(dateParts[2]));
		},
		
		PhotoFactory= function(licenses){
			return function(rawPhoto){
				var _date=parseDate(rawPhoto.datetaken), that={
					getID: function(){return "flickr"+String(rawPhoto.id);},
					getUrl: function(){return "http://farm"+rawPhoto.farm+".static.flickr.com/"+rawPhoto.server+"/"+rawPhoto.id+"_"+rawPhoto.secret+".jpg";},
					getDate: function(){return _date;},
					getPage: function(){return "http://www.flickr.com/photos/"+rawPhoto.owner+"/"+rawPhoto.id;},
					getOwnerUrl: function(){return "http://www.flickr.com/people/" + rawPhoto.owner;},
					getOwnerID: function(){return rawPhoto.owner;},
					getOwnerName: function(){return rawPhoto.ownername;},
					getTitle: function(){return rawPhoto.title;},
					getLicenseSnippet: function(){return licenses[rawPhoto.license];},
					getApiCredit: function(){return "";},
					getRaw: function(){return JSON.stringify(rawPhoto);}
				};
				return that;
			};
		},
		
		makeLicenseSnippet= function(license){
			var snippet="";
			if(license.url.search('creativecommons.org')>=0){
				var type=license.url.match(/\/licenses\/(.*\/)/)[1];
				snippet='<a rel="license" href="'+license.url+'" title="'+license.name+'">'+
					'<img alt="Creative Commons License" src="http://i.creativecommons.org/l/'+type+'80x15.png"/></a>';
			} 
			snippet+='<a rel="license" href="'+license.url+'">'+license.name+'</a>';
			return snippet;
		};
		
		$.ajax({
				url: '$CONF_media_loc/blacklist.js',
				cache: true,
				dataType: 'jsonp',
				jsonpCallback: 'loadFlickrBlacklist',
				success: function(data){ onBlacklistLoaded(data); },
				error:function(){
					onBlacklistLoaded(["the loneliest pony"]);
				}
			});
		
		return {
			createSource: function()
			{
				var apiUrl="http://api.flickr.com/services/rest/?jsoncallback=?";
				var apiKey='$CONF_flickr_api_key';
				var licenses=[];
				var licensesLoaded=noop;
				var photosLoaded=function(photosFoundCallback){
					var processPhotos=function(data){
						var photos=[];
						var i=0;
						if(licenses.length){
							if(blacklistLoaded){
								if(data.photos){
									photos=data.photos.photo;
								}
								constructArray(photos,PhotoFactory(licenses));
								for (i=0; i<photos.length; i++) {
									if(flickrBlacklist[photos[i].getOwnerID()]){
										photos.splice(i,1);
										i--;
									}
								}
								photosFoundCallback(photos);
							} else {
								blacklistLoadHandlers.push(function(blacklist){
									processPhotos(data);
								});
							}
						} else{
							//we don't have license information yet. set this to run when we do.
							licensesLoaded=function(){
								processPhotos(data);
								licencesLoaded=noop;
							};
						}
					};
					return processPhotos;
				};
				$.getJSON(apiUrl,
						{
							method: 'flickr.photos.licenses.getInfo',
							format: 'json',
							api_key: apiKey
						},
						function(data){
							if(data.licenses.license){
								licenses=data.licenses.license;
								licenses.sort(function(a,b){
									return a.id>b.id;
								});
								for (var i=0;i<licenses.length;i++) {licenses[i]=makeLicenseSnippet(licenses[i]);}
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
	}(),
	
	panoramio= function(){
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
							to:30,
							minx:sw.lng(),
							miny:sw.lat(),
							maxx:ne.lng(),
							maxy:ne.lat(),
							size:"medium"
						},
						function(data){
							var photos=[];
							if(data.count){
								photos=data.photos;
							}
							constructArray(photos,Photo);
							photosFoundCallback(photos);
						});
				}
			};
		}(), 
		
		loader=function(){
			var showMap=function(){
				$("#slideshow").hide();
				$("#map").show();
				mapDisplayTools.redraw();
				if(window.location.hash.length){
					window.location.hash="";
				}
			},
			
			mapDisplayTools={
				redraw: noop
			},
			
			displaySlideshow=null,
			
			loadedHash=null,
			
			showSlides=function(selection){
				$("#map").hide();
				$("#slideshow").show();
				if(selection){
					window.location.hash="slideshow:"+selection.center.lat()+","+selection.center.lng()+","+selection.radius;
					loadedHash=window.location.hash;
				}
			},
			
			onSlidesLoaded=function(selection, hasResults){ 
				if(hasResults){
					showSlides(selection);
				} 
				return hasResults; 
			},
			
			hashToSlideshowSelection=function(hash){
				var keyVal=hash.split(":");
				var parts= keyVal.length===2 && keyVal[0] === "#slideshow" ? keyVal[1].split(",") : [];
				if(parts.length){
					return new google.maps.Circle({
						  center: new google.maps.LatLng(Number(parts[0]),Number(parts[1])), 
						  map: null,
						  radius: Number(parts[2]),
						  fillColor: "#FF0000",
						  fillOpacity: 0.3,
						  strokeColor: "#FF0000",
						  strokeOpacity: 0.8,
						  strokeWeight: 3
					});
				} else {
					return null;
				}
			},
			
			slideSources=[flickr.createSource(),panoramio.requestPhotos],
			
			onHashChange=function(){
				if(window.location.hash==="" || window.location.hash==="#") {
					showMap();
				}
				else if (loadedHash===window.location.hash){
					showSlides();
				} else {
					mapDisplayTools.select(routeHash());
				}
			},
			
			routeHash=function(){
				var selection=hashToSlideshowSelection(window.location.hash);
				if(selection){
					displaySlideshow(selection,onSlidesLoaded);
					return selection;
				} else {
					window.location="";
				}
			},
			
			modernize=function(){//was using the modernizr library here - but was using only one function, so why?
				if(!('placeholder' in document.createElement('input'))){
					//browser doesn't natively support placeholder attribute
					$("input[placeholder]").before(function(){
						var labelMarkup='<label>'+$(this).attr('placeholder')+': </label>';
						return $(labelMarkup);
					});
				}
			};
			
			return function(){
				var selection=null;
				modernize();
				displaySlideshow=slideshow($('#slideshow'),slideSources).display;
				$(window).hashchange(onHashChange);
				if("hash" in window.location && window.location.hash.length){
					selection=routeHash();
				} else {
					showMap();
				}
				mapDisplayTools=makeScene($('#map'),selection,displaySlideshow,onSlidesLoaded);
			};
		}();
		
		return loader;
}();

var addthis_config = {
  data_use_flash: false,
  data_use_cookies: false,
  ui_click: true
};

$(pictorical);