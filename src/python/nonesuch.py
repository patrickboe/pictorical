from python import pictorical
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

application = webapp.WSGIApplication(pictorical.handlers, debug=$CONF_debug) 

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()