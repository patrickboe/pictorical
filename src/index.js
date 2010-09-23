pictorical={
		showCircleSelectMap: function(selectionCallback) {
			var map;
			var circle;
			var mapClickListener=null;
			var updateMapClickBehavior=function(lambda){
				mapClickListener=google.maps.event.addListener(map,"click",lambda);
			}
			var findDistance=function(locA,locB){
				return Math.round(distVincenty(locA.lat(),locA.lng(),locB.lat(),locB.lng()));
			};
			var drawStartingMap=function(){
				var HardenaRestaurant=new google.maps.LatLng(39.928431,-75.171257);
				var startOptions=
								{
									zoom: 16,
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

			var distVincenty=
			// This distance calculation formula is from http://www.movable-type.co.uk/scripts/latlong-vincenty.html
			/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
			/* Vincenty Inverse Solution of Geodesics on the Ellipsoid (c) Chris Veness 2002-2010             */
			/*                                                                                                */
			/* from: Vincenty inverse formula - T Vincenty, "Direct and Inverse Solutions of Geodesics on the */
			/*       Ellipsoid with application of nested equations", Survey Review, vol XXII no 176, 1975    */
			/*       http://www.ngs.noaa.gov/PUBS_LIB/inverse.pdf                                             */
			/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

			/**
			 * Calculates geodetic distance between two points specified by latitude/longitude using 
			 * Vincenty inverse formula for ellipsoids
			 *
			 * @param   {Number} lat1, lon1: first point in decimal degrees
			 * @param   {Number} lat2, lon2: second point in decimal degrees
			 * @returns (Number} distance in metres between points
			 */
			function(lat1, lon1, lat2, lon2) {
			  var a = 6378137, b = 6356752.314245,  f = 1/298.257223563;  // WGS-84 ellipsoid params
			  // replaced original calls to a missing toRad() function with a custom toRadians() function - Patrick Boe
			  var toRadians=function(deg){return Math.PI*deg/180}
			  var L = toRadians(lon2-lon1);
			  var U1 = Math.atan((1-f) * Math.tan(toRadians(lat1)));
			  var U2 = Math.atan((1-f) * Math.tan(toRadians(lat2)));
			  var sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
			  var sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
			  
			  var lambda = L, lambdaP, iterLimit = 100;
			  do {
			    var sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
			    var sinSigma = Math.sqrt((cosU2*sinLambda) * (cosU2*sinLambda) + 
			      (cosU1*sinU2-sinU1*cosU2*cosLambda) * (cosU1*sinU2-sinU1*cosU2*cosLambda));
			    if (sinSigma==0) return 0;  // co-incident points
			    var cosSigma = sinU1*sinU2 + cosU1*cosU2*cosLambda;
			    var sigma = Math.atan2(sinSigma, cosSigma);
			    var sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
			    var cosSqAlpha = 1 - sinAlpha*sinAlpha;
			    var cos2SigmaM = cosSigma - 2*sinU1*sinU2/cosSqAlpha;
			    if (isNaN(cos2SigmaM)) cos2SigmaM = 0;  // equatorial line: cosSqAlpha=0 (§6)
			    var C = f/16*cosSqAlpha*(4+f*(4-3*cosSqAlpha));
			    lambdaP = lambda;
			    lambda = L + (1-C) * f * sinAlpha *
			      (sigma + C*sinSigma*(cos2SigmaM+C*cosSigma*(-1+2*cos2SigmaM*cos2SigmaM)));
			  } while (Math.abs(lambda-lambdaP) > 1e-12 && --iterLimit>0);

			  if (iterLimit==0) return NaN  // formula failed to converge

			  var uSq = cosSqAlpha * (a*a - b*b) / (b*b);
			  var A = 1 + uSq/16384*(4096+uSq*(-768+uSq*(320-175*uSq)));
			  var B = uSq/1024 * (256+uSq*(-128+uSq*(74-47*uSq)));
			  var deltaSigma = B*sinSigma*(cos2SigmaM+B/4*(cosSigma*(-1+2*cos2SigmaM*cos2SigmaM)-
			    B/6*cos2SigmaM*(-3+4*sinSigma*sinSigma)*(-3+4*cos2SigmaM*cos2SigmaM)));
			  var s = b*A*(sigma-deltaSigma);
			  
			  s = s.toFixed(3); // round to 1mm precision
			  return s;
			};
			
			map=drawStartingMap();
			acceptSelections();
		},
		displayAreaPhotos: function(selectedCircle){
			
		}
}

$(pictorical.showCircleSelectMap(pictorical.displayAreaPhotos));