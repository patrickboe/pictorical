/*!
 * Pictorical Historical Photo Slides Application
 * Copyright (c) 2010 Patrick Boe
 * Version: $CONF_version ($CONF_version_date)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 */
pictorical= function(){
	var htmlEncode=function(value){ 
	  return $('<div/>').text(value).html(); 
	},

	constructArray = function(arr,constructor){
		for (var i=0; i<arr.length; i++) {
			arr[i]=new constructor(arr[i]);
		}
	},
	
	makeScene=function($map,circle,onSelection,onSelectionLoaded){ //returns a function to be called on show
		var map;
		var mapClickListener;
		var selectionHandle;
		var preloaded;
		var geocoder;
		
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
			var HardenaRestaurant=new google.maps.LatLng(39.928431,-75.171257),
			geocoder=new google.maps.Geocoder(),
			startOptions=
							{
								zoom: 15,
								center: HardenaRestaurant,
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
						if(!!place.bounds){
							map.fitBounds(place.bounds);
						}
						return false; //don't populate search box
					},
					focus: function(){
						return false; //don't populate search box
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
				}).end()[0],
			terms=$('footer').clone()[0];
			map = new google.maps.Map($map[0],startOptions);
			map.controls[google.maps.ControlPosition.TOP].push(pictoricalTitle);
			map.controls[google.maps.ControlPosition.TOP_RIGHT].push(searchnav);
			map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(terms);
		};
		
		var drawCircleAt=function(location,radius) {
		  var clickedLocation = new google.maps.LatLng(location);
		  if(typeof radius === 'undefined'){
			  radius=50;
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
			if(!!selectionHandle){
				selectionHandle.cancel();
				selectionHandle=null;
			}
		};
		
		var clearMap=function(){
			if(!!circle){
				circle.setMap(null);
				circle=null;
			}
			if(!!mapClickListener){
				google.maps.event.removeListener(mapClickListener);
			}
		};
		
		var cancelSelection=function(event){
			cancelSelectionCallback();
			clearMap();
			acceptSelections();
		};
		
		var acceptSelections=function(){
			updateMapClickBehavior(function(event){
				drawCircleAt(event.latLng);
				google.maps.event.removeListener(mapClickListener);
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
				google.maps.event.removeListener(mapMoveListener);
				google.maps.event.removeListener(mapClickListener);
				google.maps.event.removeListener(doneOnCircleListener);
				selectionMade();
				acceptUpdates();
			};
			var doneOnCircleListener=google.maps.event.addListener(circle,"mousedown",finalizeSelection);
			var mapMoveListener=google.maps.event.addListener(map,"mousemove",function(event){
				circle.setRadius(distanceInMeters(circle.getCenter(), event.latLng));
			});
			updateMapClickBehavior(finalizeSelection);
		};
		
		var selectionMade=function(){
			selectionHandle=onSelection(circle, myOnSelectionLoaded);
			displayHint("Loading results. Click off the circle to cancel.",true);
		};
		
		var acceptUpdates=function(){
			var 
			circleFocusListeners=[], 
			moveListener=null,
			enterEvents=["mouseover","mousedown"],
			leaveEvents=["mouseout","mouseup"],
			
			addCircleBehavior=function(eventNames,action){
				for(var i=0;i<eventNames.length;i++){
					circleFocusListeners.push(google.maps.event.addListener(circle,eventNames[i],action));
				}
			},
			
			replaceCircleBehavior=function(nextEvents,nextAction){
				while(circleFocusListeners.length>0){
					google.maps.event.removeListener(circleFocusListeners.pop());
				}
				addCircleBehavior(nextEvents,nextAction);
			},
			
			addDraggability=function(event){
				replaceCircleBehavior(leaveEvents,dropDraggability);
				map.setOptions({draggable:false});
				addCircleBehavior(["mousedown","click"],startDrag);
			},
			
			dropDraggability=function(event){
				replaceCircleBehavior(enterEvents,addDraggability);
				map.setOptions({draggable:true});
			}, 
			
			startDrag=function(event){ 
				cancelSelectionCallback();
				moveListener=google.maps.event.addListener(map,"mousemove",followMouse);
				replaceCircleBehavior(["mouseup","click"],endDrag); //mouseup isn't raised at the expected time on all browsers. click is a fallback.
				displayHint("You can move the circle.");
			},
			
			endDrag=function(event){ 
				google.maps.event.removeListener(moveListener);
				moveListener=null;
				replaceCircleBehavior(leaveEvents,dropDraggability);
				addCircleBehavior(["mousedown"],startDrag);
				selectionMade();
			},
			
			followMouse=function(event){
				circle.setCenter(event.latLng);
			};

			addCircleBehavior(enterEvents,addDraggability);
			updateMapClickBehavior(function(){
				displayHint("You can choose another circle.");
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
				   $this
				   .find("area.prev").attr("coords",prevRect)
				   .end()
				   .find("area.next").attr("coords",nextRect);
			   };
			
			var loadPhoto=function(photo){
				$slides.append('<li><img class="slide" usemap="#p'+photo.getID()+'" src="'+photo.getUrl()+'"/>'+
				'<map name="p'+photo.getID()+'">'+
				'<area shape="rect" class="prev" coords="0,0,40,40" href="#prev" title="Return to Previous Photo" alt="Previous"/>'+
				'<area shape="rect" class="next" coords="50,0,90,40" href="#next" title="Advance to Next Photo" alt="Next"/>'+
				'</map>'+
				'<footer><a href='+photo.getPage()+'>'+htmlEncode(photo.getTitle())+'</a> by <a href='+photo.getOwnerUrl()+'>'+htmlEncode(photo.getOwnerName())+'</a>'+
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
				loadPhoto(photos[i]);
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
		
		sizeSlideshow=function(){
			var $ul=$container.find('ul.slideshow:visible');
			var availHeight=String($('body').height()-$ul.offset().top*2) + "px";
			$ul.css("height",availHeight);
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
			$pause.click(advance);
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
					if(!!timeoutID){
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
		
		onBlacklistLoaded=function(blacklist){
			for (var i=0;i<blacklist.length;i++){
				flickrBlacklist[blacklist[i]]=1;
			}
			blacklistLoaded=true;
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
				url: 'blacklist',
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
				var licensesLoaded=function(){};
				var photosLoaded=function(photosFoundCallback){
					var processPhotos=function(data){
						var photos=[];
						var i=0;
						if(licenses.length){
							if(blacklistLoaded){
								if(!!data.photos){
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
								onBlacklistLoaded=function(blacklist){
									curOnBlacklistLoaded(blacklist);
									processPhotos(data);
								};
							}
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
							api_key: apiKey
						},
						function(data){
							if(!!data.licenses.license){
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
				redraw: function(){}
			},
			
			displaySlideshow=null,
			
			loadedHash=null,
			
			showSlides=function(selection){
				$("#map").hide();
				$("#slideshow").show();
				if(!!selection){
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
				if(window.location.hash==="") {showMap();}
				else if (loadedHash===window.location.hash){
					showSlides();
				} else {
					mapDisplayTools.select(routeHash());
				}
			},
			
			routeHash=function(){
				var selection=hashToSlideshowSelection(window.location.hash);
				if(!!selection){
					displaySlideshow(selection,onSlidesLoaded);
					return selection;
				} else {
					window.location="";
				}
			},
			
			modernize=function(){
				// if placeholder isn't supported:
				if (typeof Modernizr !== 'undefined' && !Modernizr.input.placeholder){
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

$(pictorical);