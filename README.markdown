Pictorical Historical Photo Slides Application  
Copyright (c) 2010 Patrick Boe  
Version: 0.1 (09/27/2010)  
Dual licensed under the MIT and GPL licenses:  
http://www.opensource.org/licenses/mit-license.php  
http://www.gnu.org/licenses/gpl.html

##Set Up a Dev Environment
Clone the repository, then change to the project's src/build directory.

You need Paver, django, pyYAML, and markdown. To install what you don't have yet, run:

	pip install -r requirements.txt

You also need to install the [Google App Engine SDK for Python](http://code.google.com/appengine/downloads.html#Google_App_Engine_SDK_for_Python).

Make a copy of `/src/build/my_example.yaml` named `my.yaml`. Customize it for your environment.
 
##Build
	
from the project root do:
	
	paver build
	
##Run Locally

	paver run
 
##Deploy
	
	paver deploy