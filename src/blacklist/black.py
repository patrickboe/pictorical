import cgi
import os
import urllib

from google.appengine.ext.webapp import template
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.api import urlfetch
from xml.dom import minidom

class BlacklistedFlickrUser(db.Model):
    id = db.StringProperty()
    date = db.DateTimeProperty(auto_now_add=True)

class Registration(webapp.RequestHandler):
    def get(self):
        self.show({'blacklist': BlacklistedFlickrUser.all().order('-date').fetch(10)})
        
    def post(self):
        username=self.request.get('user')
        userid=username and self.askFlickrFor(username)
        if(userid):
            addition = BlacklistedFlickrUser()
            addition.id=userid
            addition.put()
            self.show({'flickrUser':addition})
        else:
            self.show({'error':'Flickr says there is no such user.'})
    
    def askFlickrFor(self, username): #TODO: de-duplicate api key
        restParams={
                    "method": "flickr.people.findByUsername",
                    "api_key": "29f58e785200449dc7f3eafc3e64aacf",
                    "username": username
                    }
        try: 
            raw=urlfetch.fetch(url="http://api.flickr.com/services/rest/?%" % urllib.urlencode(restParams),deadline=2)
            if raw.status_code == 200:
                dom=minidom.parseString(raw)
                for node in dom.getElementsByTagName('user'):
                    return node.getAttribute('id')
        except urlfetch.DownloadError: 
            pass
        return ""
    def show(self, templateValues):
        path = os.path.join(os.path.dirname(__file__), 'add.gtm')
        self.response.out.write(template.render(path, templateValues))

application = webapp.WSGIApplication([('/blacklist/add', Registration)], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()