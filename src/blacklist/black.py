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
    
class List(webapp.RequestHandler):
    def get(self):
        h=self.response.headers
        h["Content-Type"] = "text/javascript"
        h["Cache-Control"] = "public; max-age=525600"
        blacklist='["'+'","'.join(u.id for u in BlacklistedFlickrUser.all().order('id'))+'"]'
        callback=self.request.get('callback')
        self.response.out.write(callback and callback + "(" + blacklist + ");" or blacklist)

class Registration(webapp.RequestHandler):
    def get(self):
        self.__show({})
        
    def post(self):
        #TODO: de-duplicate api key
        def askForID(username): 
            restParams={
                        "method": "flickr.people.findByUsername",
                        "api_key": "5c047b2b54845211d9662958d1cc5b9d",
                        "username": username
                        }
            try: 
                raw=urlfetch.fetch(url="http://api.flickr.com/services/rest/?" + urllib.urlencode(restParams),deadline=2)
                return extractUserId(raw);
            except urlfetch.DownloadError: 
                return ""
            
        def extractUserId(flickrResponse):
            if flickrResponse.status_code == 200:
                dom=minidom.parseString(flickrResponse.content)
                for node in dom.getElementsByTagName('user'):
                    return node.getAttribute('id')
            return ""
            
        def blacklist(userid):
            if not BlacklistedFlickrUser.all().filter('id = ',userid).get():
                addition = BlacklistedFlickrUser()
                addition.id=userid
                addition.put()
            
        username=self.request.get('user')
        userid=username and len(username) < 100 and askForID(username)
        if(userid):
            blacklist(userid);
            self.__show({'username':username})
        else:
            self.__show({'error':'Flickr says there is no such user.'})
    
    def __show(self,templateValues):
        path = os.path.join(os.path.dirname(__file__), 'add.gtm')
        self.response.out.write(template.render(path, templateValues))

application = webapp.WSGIApplication([('/blacklist/add', Registration),('/blacklist', List)], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()