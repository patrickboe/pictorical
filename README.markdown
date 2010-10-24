Pictorical Historical Photo Slides Application
Copyright (c) 2010 Patrick Boe
Version: 0.1 (09/27/2010)
Dual licensed under the MIT and GPL licenses:
http://www.opensource.org/licenses/mit-license.php
http://www.gnu.org/licenses/gpl.html
 
## Install Requirements
You need Paver, django, pyYAML, and markdown. To install them all, run:
	pip install -r requirements.txt
You also need to install the google app engine sdk.
 
## Build
	paver build
	
## Run
Edit options.env in the pavement.py to point to your local google app engine. Then to start the app, run:
	paver run
 
## Deploy
	paver deploy